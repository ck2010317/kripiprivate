import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { verifyPayment } from "@/lib/solana-payment"
import { createCard as createKripiCard, fundCard } from "@/lib/kripicard-client"
import { checkTokenHolding } from "@/lib/token-gate"

// Verify payment by transaction signature (manual verification)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { txSignature, paymentId } = await request.json()

    if (!txSignature) {
      return NextResponse.json(
        { error: "Transaction signature is required" },
        { status: 400 }
      )
    }

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      )
    }

    // Find payment
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

    // Check if already completed
    if (payment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Payment already processed" },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date() > payment.expiresAt) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "EXPIRED" },
      })
      return NextResponse.json(
        { error: "Payment has expired" },
        { status: 400 }
      )
    }

    console.log(`[Verify By Signature] Payment ${paymentId}: verifying ${txSignature}`)
    console.log(`[Verify By Signature] Expected amount: ${payment.amountSol} SOL`)

    // Update status to confirming
    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: "CONFIRMING",
        txSignature,
      },
    })

    // Verify the transaction - don't pass expected wallet, let it auto-detect
    const verification = await verifyPayment(txSignature, payment.amountSol)

    if (!verification.verified) {
      console.log(`[Verify By Signature] ❌ Verification failed: ${verification.error}`)
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      })
      return NextResponse.json(
        { error: verification.error || "Payment verification failed" },
        { status: 400 }
      )
    }

    console.log(`[Verify By Signature] ✅ Payment verified from ${verification.senderWallet}`)

    // For card issuance: Verify the sender holds required tokens
    if (payment.cardType === "issue") {
      const senderWallet = verification.senderWallet
      
      if (!senderWallet) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { error: "Could not determine payment sender wallet address" },
          { status: 400 }
        )
      }

      console.log(`[Token Gate] Checking if payment sender ${senderWallet} holds required tokens`)
      
      try {
        const tokenCheck = await checkTokenHolding(senderWallet)
        
        if (!tokenCheck.hasRequiredTokens) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED" },
          })
          return NextResponse.json(
            { 
              error: `Payment sender does not hold enough tokens. Required: ${tokenCheck.required}, Current balance: ${tokenCheck.balance}`,
              requiredTokens: tokenCheck.required,
              currentBalance: tokenCheck.balance,
            },
            { status: 400 }
          )
        }
        
        console.log(`[Token Gate] ✅ Payment sender ${senderWallet} has ${tokenCheck.balance} tokens - ELIGIBLE`)
      } catch (tokenError) {
        console.error("[Token Gate] Error checking token holdings:", tokenError)
        return NextResponse.json(
          { 
            error: "Failed to verify token holdings. Please try again.",
            details: tokenError instanceof Error ? tokenError.message : "Unknown error",
          },
          { status: 400 }
        )
      }
    }

    // Payment verified - update status
    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: "VERIFIED",
        senderWallet: verification.senderWallet,
      },
    })

    // Process based on card type
    if (payment.cardType === "issue") {
      console.log(`[Card Issuance] Creating card for ${payment.nameOnCard}`)

      // Create card
      const card = await createKripiCard({
        name: payment.nameOnCard || "Virtual Card",
        daily_limit: 1000,
        monthly_limit: 30000,
        cvv: Math.random().toString().slice(2, 5).padEnd(3, "0"),
      })

      if (!card) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { error: "Failed to create card" },
          { status: 500 }
        )
      }

      // Fund the card with SOL
      const fundResult = await fundCard(card.id, payment.amountSol)

      if (!fundResult) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { error: "Failed to fund card" },
          { status: 500 }
        )
      }

      // Update payment to completed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: "COMPLETED",
          cardId: card.id,
        },
      })

      // Create card record
      await prisma.card.create({
        data: {
          kripiCardId: card.id,
          nameOnCard: payment.nameOnCard || "Virtual Card",
          lastFourPan: card.last_four || "****",
          expiryMonth: parseInt(card.expiry.split("/")[0]),
          expiryYear: parseInt(card.expiry.split("/")[1]),
          userId: user.id,
        },
      })

      console.log(`[Card Issuance] ✅ Card created: ${card.id}`)

      return NextResponse.json({
        success: true,
        message: "Card issued successfully!",
        card: {
          id: card.id,
          name: card.holder_name,
          lastFour: card.last_four,
          expiry: card.expiry,
          pan: card.pan,
          cvv: card.cvv,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully!",
      payment: {
        id: payment.id,
        status: payment.status,
      },
    })
  } catch (error) {
    console.error("[Verify By Signature] Error:", error)
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    )
  }
}
