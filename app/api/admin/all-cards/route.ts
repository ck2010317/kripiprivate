import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get all cards in database
    const allCards = await prisma.card.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      totalCards: allCards.length,
      cards: allCards,
    })
  } catch (error) {
    console.error("[All Cards] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      cardNumber,
      expiryDate,
      cvv,
      nameOnCard,
      balance,
      kripiCardId,
      userEmail,
    } = await req.json()

    if (!cardNumber || !expiryDate || !cvv || !nameOnCard || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Find user by email
    let user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: nameOnCard || "User",
          password: Math.random().toString(36).slice(2), // Random password
        },
      })
    }

    // Create or update card
    const card = await prisma.card.create({
      data: {
        cardNumber,
        expiryDate,
        cvv,
        nameOnCard: nameOnCard.toUpperCase(),
        balance: balance || 0,
        kripiCardId: kripiCardId || `kripi-${Date.now()}`,
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Card added successfully",
      card,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error("[Add Card] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add card" },
      { status: 500 }
    )
  }
}
