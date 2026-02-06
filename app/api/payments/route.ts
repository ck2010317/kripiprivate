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

    const { amountUsd, nameOnCard, cardType, targetCardId, topupAmount, topupFee } = await request.json()

    // Validation
    if (!amountUsd || amountUsd < 5) {
      return NextResponse.json(
        { error: "Amount must be at least $5" },
        { status: 400 }
      )
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

    // Get SOL conversion
    const { solAmount, solPrice } = await usdToSol(amountUsd)

    // Create payment record (expires in 30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    const payment = await prisma.payment.create({
      data: {
        amountUsd,
        amountSol: solAmount,
        solPriceAtTime: solPrice,
        cardType: cardType || "issue",
        nameOnCard,
        targetCardId,
        topupAmount,
        topupFee,
        userId: user.id,
        expiresAt,
      },
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
