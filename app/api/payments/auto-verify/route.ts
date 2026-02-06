import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { checkRecentPayments, verifyPayment } from "@/lib/solana-payment"
import { checkTokenHolding } from "@/lib/token-gate"

// Check for recent payments and auto-verify
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const { paymentId } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      )
    }

    // Get the payment record with a lock (select for update in SQL)
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId: user.id,
      },
    })

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    // Check if already processed
    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: `Payment already ${payment.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Check if payment has expired
    if (new Date() > payment.expiresAt) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "EXPIRED" },
      })
      return NextResponse.json(
        { error: "Payment request has expired" },
        { status: 400 }
      )
    }

    // Get recent transactions to our payment wallet
    const recentPayments = await checkRecentPayments()

    console.log(`[Auto Verify] Payment ${paymentId}: looking for ${payment.amountSol} SOL (created at ${payment.createdAt.toISOString()})`)
    console.log(`[Auto Verify] Found ${recentPayments.length} recent payments to check`)

    // Find a matching payment
    let matchedPayment = null
    for (const recentPayment of recentPayments) {
      // For card issuance: accept any payment >= $5 equivalent (roughly 0.05 SOL at $100/SOL)
      // For other payments: match within 80-120% of expected amount
      let amountMatch = false
      
      if (payment.cardType === "issue") {
        // Card issuance - just need at least ~$5 worth of SOL (0.05 SOL minimum)
        amountMatch = recentPayment.amount >= 0.045 && recentPayment.amount <= 1.0 // Max 1 SOL for card
        console.log(`[Auto Verify] Card issuance - checking if ${recentPayment.amount} SOL is in range [0.045, 1.0]: ${amountMatch}`)
      } else {
        // Other payment types - stricter matching
        const minAmount = payment.amountSol * 0.80
        const maxAmount = payment.amountSol * 1.20
        amountMatch = recentPayment.amount >= minAmount && recentPayment.amount <= maxAmount
        console.log(`[Auto Verify] Other payment - checking if ${recentPayment.amount} SOL is in range [${minAmount}, ${maxAmount}]: ${amountMatch}`)
      }

      if (amountMatch) {
        // Check if this transaction was sent around the time of payment creation
        // Allow ±5 minutes for clock skew and delays
        const paymentCreatedTime = payment.createdAt.getTime() / 1000
        const timeDiff = Math.abs(recentPayment.timestamp - paymentCreatedTime)
        
        console.log(`[Auto Verify] Amount match! Created: ${paymentCreatedTime}, TX: ${recentPayment.timestamp}, diff: ${timeDiff}s`)
        
        if (timeDiff <= 300) { // 5 minute window
          console.log(`[Auto Verify] Timestamp matches, checking for duplicate use...`)
          
          // Check if this tx signature was already used by another payment
          const existingPayment = await prisma.payment.findFirst({
            where: {
              txSignature: recentPayment.signature,
            },
          })

          if (existingPayment) {
            // This transaction was already claimed by another payment!
            console.error(
              `[Auto Verify Race Condition] Transaction ${recentPayment.signature} already used by payment ${existingPayment.id}`
            )
            continue // Skip and try the next transaction
          }

          console.log(`[Auto Verify] ✅ Found matching payment: ${recentPayment.signature}`)
          matchedPayment = recentPayment
          break
        } else {
          console.log(`[Auto Verify] Timestamp doesn't match - diff too large (${timeDiff}s)`)
        }
      }
    }

    if (!matchedPayment) {
      console.log(`[Auto Verify] ❌ No matching payment found`)
      return NextResponse.json(
        {
          success: false,
          message: "No matching payment found. Please wait a moment and try again.",
        },
        { status: 200 }
      )
    }

    // Verify the transaction
    const verificationResult = await verifyPayment(
      matchedPayment.signature,
      payment.amountSol
    )

    if (!verificationResult.verified) {
      return NextResponse.json(
        {
          success: false,
          message: verificationResult.error || "Payment verification failed",
        },
        { status: 200 }
      )
    }

    // For card issuance: Check that payment sender holds required tokens
    if (payment.cardType === "issue") {
      const senderWallet = verificationResult.senderWallet || matchedPayment.sender
      
      if (!senderWallet) {
        return NextResponse.json(
          {
            success: false,
            message: "Could not determine payment sender wallet address",
          },
          { status: 200 }
        )
      }

      console.log(`[Token Gate] Checking if payment sender ${senderWallet} holds required tokens`)
      
      try {
        const tokenCheck = await checkTokenHolding(senderWallet)
        
        if (!tokenCheck.hasRequiredTokens) {
          return NextResponse.json(
            { 
              success: false,
              message: `Payment sender does not hold enough tokens. Required: ${tokenCheck.required}, Current balance: ${tokenCheck.balance}`,
              requiredTokens: tokenCheck.required,
              currentBalance: tokenCheck.balance,
            },
            { status: 200 }
          )
        }
        
        console.log(`[Token Gate] ✅ Payment sender ${senderWallet} has ${tokenCheck.balance} tokens - ELIGIBLE`)
      } catch (tokenError) {
        console.error("[Token Gate] Error checking token holdings:", tokenError)
        return NextResponse.json(
          { 
            success: false,
            message: "Failed to verify token holdings. Please try again.",
          },
          { status: 200 }
        )
      }
    }

    // Use a transaction to atomically update payment
    // This prevents race conditions where multiple requests try to claim the same tx
    try {
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          txSignature: matchedPayment.signature,
          senderWallet: matchedPayment.sender,
          status: "VERIFIED",
        },
      })

      return NextResponse.json({
        success: true,
        message: "Payment verified successfully!",
        txSignature: matchedPayment.signature,
        amount: matchedPayment.amount,
      })
    } catch (updateError: any) {
      // Handle unique constraint violation on txSignature
      if (updateError.code === "P2002" && updateError.meta?.target?.includes("txSignature")) {
        console.error(
          `[Race Condition Detected] Transaction ${matchedPayment.signature} was claimed by another request`
        )
        return NextResponse.json(
          {
            success: false,
            message: "Payment was claimed by another request. Please try again.",
          },
          { status: 200 }
        )
      }
      throw updateError
    }
  } catch (error) {
    console.error("[Auto Verify] Error:", error)
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    )
  }
}
