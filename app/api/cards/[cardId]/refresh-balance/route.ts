import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { getCardDetails } from "@/lib/kripicard-client"

export const dynamic = "force-dynamic"

// POST /api/cards/[cardId]/refresh-balance — Force sync balance from KripiCard
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { cardId } = await params

    const card = await prisma.card.findFirst({
      where: { id: cardId, userId: user.id },
    })

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    if (!card.cardNumber || !card.kripiCardId) {
      return NextResponse.json(
        { error: "Card not yet assigned. Cannot sync balance." },
        { status: 400 }
      )
    }

    const last4 = card.cardNumber.slice(-4)
    const kripiDetails = await getCardDetails(last4)

    if (!kripiDetails.success && !kripiDetails.balance && kripiDetails.balance !== 0) {
      return NextResponse.json(
        { error: "Failed to fetch balance from card provider" },
        { status: 502 }
      )
    }

    const oldBalance = card.balance
    const newBalance = kripiDetails.balance

    await prisma.card.update({
      where: { id: card.id },
      data: { balance: newBalance },
    })

    return NextResponse.json({
      success: true,
      old_balance: oldBalance,
      new_balance: newBalance,
      synced: oldBalance !== newBalance,
    })
  } catch (error) {
    console.error("[Cards] Refresh balance error:", error)
    const message = error instanceof Error ? error.message : "Failed to refresh balance"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
