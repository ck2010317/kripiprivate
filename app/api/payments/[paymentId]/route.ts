import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { verifyPayment } from "@/lib/solana-payment"
import { createCard as createKripiCard } from "@/lib/kripicard-client"
import { checkTokenHolding } from "@/lib/token-gate"

// Verify payment and process card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { paymentId } = await params
    const { txSignature } = await request.json()

    if (!txSignature) {
      return NextResponse.json(
        { error: "Transaction signature is required" },
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

    // Update status to confirming
    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: "CONFIRMING",
        txSignature,
      },
    })

    // Verify the transaction
    const verification = await verifyPayment(txSignature, payment.amountSol, payment.senderWallet || undefined)

    if (!verification.verified) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      })
      return NextResponse.json(
        { error: verification.error || "Payment verification failed" },
        { status: 400 }
      )
    }

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
      data: { status: "VERIFIED" },
    })

    // Process based on card type
    if (payment.cardType === "issue") {
      // For card issuance, use the topupAmount from this payment
      const topupAmount = payment.topupAmount || 10
      
      if (topupAmount < 10) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { 
            error: `Insufficient topup amount to create card. Required: $10, Provided: $${topupAmount.toFixed(2)}`,
            requiredTopup: 10,
            providedTopup: topupAmount,
          },
          { status: 400 }
        )
      }

      // Issue new card
      try {
        const cardAmount = topupAmount + 5 // topup + $5 fee
        console.log(`[Card Creation] Creating card for ${payment.nameOnCard} with $${cardAmount} balance...`)
        
        const kripiResponse = await createKripiCard({
          amount: cardAmount,
          name_on_card: payment.nameOnCard || user.name,
          email: user.email,
          bankBin: "49387520",
        })

        console.log(`[Card Creation] ✅ Card created: ${kripiResponse.card_id} with balance $${kripiResponse.balance}`)

        // Store card in database
        const card = await prisma.card.create({
          data: {
            kripiCardId: kripiResponse.card_id,
            cardNumber: kripiResponse.card_number,
            expiryDate: kripiResponse.expiry_date,
            cvv: kripiResponse.cvv,
            nameOnCard: (payment.nameOnCard || user.name).toUpperCase(),
            balance: kripiResponse.balance,
            userId: user.id,
          },
        })

        // Update payment as completed
        await prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: "COMPLETED",
            issuedCardId: card.id,
          },
        })

        return NextResponse.json({
          success: true,
          message: "Card issued successfully",
          card: {
            id: card.id,
            cardNumber: card.cardNumber,
            expiryDate: card.expiryDate,
            cvv: card.cvv,
            nameOnCard: card.nameOnCard,
            balance: card.balance,
            status: card.status,
          },
        })
      } catch (cardError) {
        console.error("[Card Creation] Error:", cardError)
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { 
            error: "Failed to create card",
            details: cardError instanceof Error ? cardError.message : "Unknown error",
          },
          { status: 500 }
        )
      }
    } else if (payment.cardType === "topup" && payment.targetCardId) {
      // Fund existing card with the actual topup amount (not including fee)
      const card = await prisma.card.findFirst({
        where: {
          id: payment.targetCardId,
          userId: user.id,
        },
      })

      if (!card) {
        return NextResponse.json(
          { error: "Target card not found" },
          { status: 404 }
        )
      }

      // Use the actual topup amount for funding, not the total with fee
      const fundAmount = payment.topupAmount || payment.amountUsd
      
      const fundResponse = await fundCard({
        card_id: card.kripiCardId,
        amount: fundAmount,
      })

      // Update card balance
      await prisma.card.update({
        where: { id: card.id },
        data: { balance: fundResponse.new_balance },
      })

      // Update payment as completed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED" },
      })

      return NextResponse.json({
        success: true,
        message: "Card funded successfully",
        newBalance: fundResponse.new_balance,
      })
    }

    return NextResponse.json(
      { error: "Invalid card type" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Payments] Verify payment error:", error)
    const message = error instanceof Error ? error.message : "Failed to verify payment"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// Get payment status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { paymentId } = await params

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

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amountUsd: payment.amountUsd,
        amountSol: payment.amountSol,
        status: payment.status,
        cardType: payment.cardType,
        txSignature: payment.txSignature,
        issuedCardId: payment.issuedCardId,
        createdAt: payment.createdAt,
        expiresAt: payment.expiresAt,
      },
    })
  } catch (error) {
    console.error("[Payments] Get payment error:", error)
    return NextResponse.json(
      { error: "Failed to get payment" },
      { status: 500 }
    )
  }
}
