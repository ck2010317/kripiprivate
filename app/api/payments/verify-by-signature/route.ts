import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { verifyPayment } from "@/lib/solana-payment"
import { createCard as createKripiCard } from "@/lib/kripicard-client"
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

      // IMPORTANT: Use topupAmount (actual card balance), NOT amountUsd (which includes fees)
      const cardAmount = payment.topupAmount || payment.amountUsd
      console.log(`[Card Issuance] Card amount (topup only, no fees): $${cardAmount}`)

      // Create card with proper parameters
      const card = await createKripiCard({
        amount: cardAmount,
        bankBin: "49387519",
        name_on_card: (payment.nameOnCard || "Virtual Card").toUpperCase(),
        email: user.email || "noemail@example.com",
      })

      if (!card || !card.card_id) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { error: "Failed to create card - invalid API response" },
          { status: 500 }
        )
      }

      // CRITICAL: Validate card details are REAL, not dummy values
      if (!card.card_number || card.card_number === "****" || card.card_number.length < 10) {
        console.error(`[Card Issuance] ❌ Invalid card number:`, card.card_number)
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { error: `Card created (ID: ${card.card_id}) but got invalid card number. Contact support with card ID: ${card.card_id}` },
          { status: 500 }
        )
      }
      if (!card.cvv || card.cvv === "***" || card.cvv.length < 3) {
        console.error(`[Card Issuance] ❌ Invalid CVV:`, card.cvv)
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { error: `Card created (ID: ${card.card_id}) but got invalid CVV. Contact support with card ID: ${card.card_id}` },
          { status: 500 }
        )
      }
      if (!card.expiry_date || card.expiry_date === "12/25" || !card.expiry_date.includes("/")) {
        console.error(`[Card Issuance] ❌ Invalid expiry:`, card.expiry_date)
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { error: `Card created (ID: ${card.card_id}) but got invalid expiry. Contact support with card ID: ${card.card_id}` },
          { status: 500 }
        )
      }

      console.log(`[Card Issuance] ✅ Card details validated - number: *${card.card_number.slice(-4)}, expiry: ${card.expiry_date}`)

      // Update payment to completed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: "COMPLETED",
          issuedCardId: card.card_id,
        },
      })

      // Create card record with VALIDATED details
      await prisma.card.create({
        data: {
          kripiCardId: card.card_id,
          cardNumber: card.card_number,
          expiryDate: card.expiry_date,
          cvv: card.cvv,
          nameOnCard: payment.nameOnCard || "Virtual Card",
          userId: user.id,
        },
      })

      console.log(`[Card Issuance] ✅ Card created: ${card.card_id}`)

      return NextResponse.json({
        success: true,
        message: "Card issued successfully!",
        card: {
          id: card.card_id,
          number: card.card_number,
          expiry: card.expiry_date,
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
