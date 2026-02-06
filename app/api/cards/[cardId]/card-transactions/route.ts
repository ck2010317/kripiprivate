import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { getCardTransactions } from "@/lib/kripicard-client"

// Get actual card transactions from KripiCard
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

    // Fetch transactions from KripiCard API
    const result = await getCardTransactions(card.kripiCardId)

    return NextResponse.json({
      success: true,
      cardId: card.id,
      kripiCardId: card.kripiCardId,
      transactions: result.transactions || [],
      message: result.message,
    })
  } catch (error) {
    console.error("[Card Transactions] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch card transactions" },
      { status: 500 }
    )
  }
}
