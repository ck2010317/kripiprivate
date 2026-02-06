import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { cardId, toEmail } = await req.json()

    if (!cardId || !toEmail) {
      return NextResponse.json(
        { error: "cardId and toEmail are required" },
        { status: 400 }
      )
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { email: toEmail },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: `User not found with email: ${toEmail}` },
        { status: 404 }
      )
    }

    // Update card to new user
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        userId: targetUser.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Card migrated to ${toEmail}`,
      card: updatedCard,
    })
  } catch (error) {
    console.error("[Migrate Card] Error:", error)
    return NextResponse.json(
      { error: "Failed to migrate card" },
      { status: 500 }
    )
  }
}
