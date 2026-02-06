import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { getCardDetails, fundCard, freezeUnfreezeCard } from "@/lib/kripicard-client"

// Get single card details
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

    // Find card and verify ownership
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

    // Optionally fetch latest details from KripiCard API
    try {
      const kripiDetails = await getCardDetails(card.kripiCardId)
      
      // Update local balance if different
      if (kripiDetails.balance !== card.balance) {
        await prisma.card.update({
          where: { id: card.id },
          data: { balance: kripiDetails.balance },
        })
        card.balance = kripiDetails.balance
      }
    } catch (kripiError) {
      // API might be down or account needs funding - use local data
      console.warn("[Cards] Could not fetch from KripiCard API, using local data:", kripiError instanceof Error ? kripiError.message : "Unknown error")
    }
      // Continue with cached data if API fails
      console.warn("[Cards] Failed to fetch live card details, using cached data")
    }

    return NextResponse.json({
      success: true,
      card: {
        id: card.id,
        kripiCardId: card.kripiCardId,
        cardNumber: card.cardNumber,
        expiryDate: card.expiryDate,
        cvv: card.cvv,
        nameOnCard: card.nameOnCard,
        balance: card.balance,
        status: card.status,
        createdAt: card.createdAt,
      },
    })
  } catch (error) {
    console.error("[Cards] Get card error:", error)
    return NextResponse.json(
      { error: "Failed to fetch card" },
      { status: 500 }
    )
  }
}

// Fund or freeze/unfreeze card
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
    const { action, amount } = await request.json()

    // Find card and verify ownership
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

    if (action === "fund") {
      if (!amount || amount < 1) {
        return NextResponse.json(
          { error: "Amount must be at least $1" },
          { status: 400 }
        )
      }

      const fundResponse = await fundCard({
        card_id: card.kripiCardId,
        amount,
      })

      // Update local balance
      await prisma.card.update({
        where: { id: card.id },
        data: { balance: fundResponse.new_balance },
      })

      return NextResponse.json({
        success: true,
        newBalance: fundResponse.new_balance,
      })
    }

    if (action === "freeze" || action === "unfreeze") {
      await freezeUnfreezeCard({
        card_id: card.kripiCardId,
        action,
      })

      const newStatus = action === "freeze" ? "FROZEN" : "ACTIVE"
      
      await prisma.card.update({
        where: { id: card.id },
        data: { status: newStatus },
      })

      return NextResponse.json({
        success: true,
        status: newStatus,
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Cards] Card action error:", error)
    const message = error instanceof Error ? error.message : "Failed to perform action"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
