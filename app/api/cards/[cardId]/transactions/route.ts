import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Get transaction history for a card
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { cardId } = await params

    // Verify card ownership
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        userId: user.id,
      },
    })

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      )
    }

    // Get transaction history
    const transactions = await prisma.cardTransaction.findMany({
      where: { cardId },
      orderBy: { createdAt: "desc" },
      take: 50, // Last 50 transactions
    })

    return NextResponse.json({
      success: true,
      transactions,
    })
  } catch (error) {
    console.error("[Card Transactions] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}

// Add a transaction (internal use)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { cardId } = await params
    const { type, amount, description, status, externalTxId, metadata } = await request.json()

    // Verify card ownership
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        userId: user.id,
      },
    })

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      )
    }

    // Create transaction record
    const transaction = await prisma.cardTransaction.create({
      data: {
        cardId,
        type,
        amount,
        description: description || "",
        status: status || "COMPLETED",
        externalTxId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return NextResponse.json({
      success: true,
      transaction,
    })
  } catch (error) {
    console.error("[Card Transactions] Create error:", error)
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}
