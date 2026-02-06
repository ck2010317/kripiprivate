import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { usdToSol } from "@/lib/solana-payment"

const PAYMENT_WALLET = process.env.PAYMENT_WALLET || "JBP9PMhYZ8UyZNbXuDzCvLZ5WGz5gkTicGdsnDYYjWFf"

// Create a new payment request
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const { amountUsd, nameOnCard, cardType, targetCardId, cardId, topupAmount, topupFee, cardFee, serviceFee } = await request.json()

    // Log what we're receiving
    console.log("[Payments] Creating payment with:", {
      amountUsd,
      nameOnCard,
      cardType,
      targetCardId,
      cardId,
      topupAmount,
      topupFee,
      cardFee,
      serviceFee,
    })

    // Validate minimum amounts
    const KRIPICARD_MIN_FUND = 10 // KripiCard minimum funding amount
    
    if (!amountUsd || amountUsd < 1) {
      return NextResponse.json(
        { error: "Amount must be at least $1" },
        { status: 400 }
      )
    }

    // NOTE: Temporarily allow topupAmount < $10 for testing backend error messages
    // This will be reverted after testing
    // For fund/topup operations, validate that topup amount is valid
    if ((cardType === "topup" || cardType === "fund") && topupAmount) {
      if (topupAmount < 1) {
        console.error("[Payments] ❌ Topup amount invalid:", {
          topupAmount,
          cardType,
        })
        return NextResponse.json(
          { 
            error: `Fund amount must be at least $1`,
            topupAmount,
          },
          { status: 400 }
        )
      }
    }

    // For card issuance, allow any amount >= $1 for testing
    if (cardType === "issue" && topupAmount) {
      if (topupAmount < 1) {
        console.error("[Payments] ❌ Card issuance amount invalid:", {
          topupAmount,
        })
        return NextResponse.json(
          { 
            error: `Card balance must be at least $1`,
            topupAmount,
          },
          { status: 400 }
        )
      }
    }

    if (amountUsd > 10000) {
      return NextResponse.json(
        { error: "Amount cannot exceed $10,000" },
        { status: 400 }
      )
    }

    if (cardType === "issue" && !nameOnCard) {
      return NextResponse.json(
        { error: "Name on card is required for new cards" },
        { status: 400 }
      )
    }

    if (cardType === "fund" && !cardId) {
      return NextResponse.json(
        { error: "Card ID is required for fund operations" },
        { status: 400 }
      )
    }

    // Get SOL conversion
    const { solAmount, solPrice } = await usdToSol(amountUsd)

    // Create payment record (expires in 30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    // For fund operations, map cardId to targetCardId
    const finalTargetCardId = cardId || targetCardId

    const payment = await prisma.payment.create({
      data: {
        amountUsd,
        amountSol: solAmount,
        solPriceAtTime: solPrice,
        cardType: cardType || "issue",
        nameOnCard,
        targetCardId: finalTargetCardId,
        topupAmount,
        topupFee: serviceFee || cardFee,
        userId: user.id,
        expiresAt,
      },
    })

    console.log("[Payments] Created payment:", {
      id: payment.id,
      amountUsd: payment.amountUsd,
      topupAmount: payment.topupAmount,
      topupFee: payment.topupFee,
      cardType: payment.cardType,
    })

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amountUsd: payment.amountUsd,
        amountSol: payment.amountSol,
        solPrice: payment.solPriceAtTime,
        paymentWallet: PAYMENT_WALLET,
        expiresAt: payment.expiresAt,
        status: payment.status,
      },
    })
  } catch (error) {
    console.error("[Payments] Create payment error:", error)
    return NextResponse.json(
      { error: "Failed to create payment request" },
      { status: 500 }
    )
  }
}

// Get user's pending payments
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const payments = await prisma.payment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json({
      success: true,
      payments: payments.map((p: any) => ({
        id: p.id,
        amountUsd: p.amountUsd,
        amountSol: p.amountSol,
        status: p.status,
        cardType: p.cardType,
        txSignature: p.txSignature,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
      })),
      paymentWallet: PAYMENT_WALLET,
    })
  } catch (error) {
    console.error("[Payments] Get payments error:", error)
    return NextResponse.json(
      { error: "Failed to get payments" },
      { status: 500 }
    )
  }
}
