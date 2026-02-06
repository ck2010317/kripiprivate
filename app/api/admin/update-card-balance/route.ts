import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  try {
    const { cardId, balance } = await req.json()

    if (!cardId || balance === undefined) {
      return NextResponse.json(
        { error: "cardId and balance are required" },
        { status: 400 }
      )
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: { balance },
    })

    return NextResponse.json({
      success: true,
      message: "Card balance updated",
      card: updatedCard,
    })
  } catch (error) {
    console.error("[Update Card Balance] Error:", error)
    return NextResponse.json(
      { error: "Failed to update card balance" },
      { status: 500 }
    )
  }
}
