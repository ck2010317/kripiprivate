import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Constants for fund fees (same as card issuance)
const FIXED_FEE = 1.0 // $1.00 fixed fee
const SERVICE_FEE_PERCENT = 0.03 // 3%

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { amount } = await req.json()
    const { cardId } = await params

    if (!amount || amount < 10) {
      return NextResponse.json(
        { error: "Amount must be at least $10 (KripiCard minimum)" },
        { status: 400 }
      )
    }

    // Fetch the card
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { user: true },
    })

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      )
    }

    // Calculate fees
    const serviceFee = amount * SERVICE_FEE_PERCENT + FIXED_FEE
    const totalAmount = amount + serviceFee

    console.log(`[Fund Card] Card ID: ${cardId}`)
    console.log(`[Fund Card] Top-up amount: $${amount}`)
    console.log(`[Fund Card] Service fee (3% + $1): $${serviceFee.toFixed(2)}`)
    console.log(`[Fund Card] Total to charge: $${totalAmount.toFixed(2)}`)

    // TODO: In production, you would:
    // 1. Create a payment request for the user
    // 2. User pays the totalAmount via Solana
    // 3. After payment confirmation, call KripiCard API to add funds
    // 4. Update card balance

    // For now, return the fee breakdown
    return NextResponse.json({
      success: true,
      message: "Fund calculation complete. Waiting for Solana payment.",
      card: {
        id: card.id,
        cardNumber: card.cardNumber,
        currentBalance: card.balance,
      },
      fees: {
        topupAmount: amount,
        fixedFee: FIXED_FEE,
        serviceFeePercent: SERVICE_FEE_PERCENT * 100,
        serviceFee: parseFloat(serviceFee.toFixed(2)),
        totalToCharge: parseFloat(totalAmount.toFixed(2)),
      },
      note: "Payment integration required - connect to Solana payment system",
    })
  } catch (error) {
    console.error("[Fund Card] Error:", error)
    return NextResponse.json(
      { error: "Failed to process fund request" },
      { status: 500 }
    )
  }
}
