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

    // Fetch latest details from KripiCard API and sync to DB
    try {
      const kripiDetails = await getCardDetails(card.kripiCardId)
      
      // Build update object for any changed fields
      const updates: Record<string, any> = {}
      
      if (kripiDetails.balance !== card.balance) {
        updates.balance = kripiDetails.balance
        card.balance = kripiDetails.balance
      }
      
      // Always sync real card details from KripiCard (fixes any dummy values in DB)
      if (kripiDetails.card_number && kripiDetails.card_number !== card.cardNumber) {
        updates.cardNumber = kripiDetails.card_number
        card.cardNumber = kripiDetails.card_number
      }
      if (kripiDetails.expiry_date && kripiDetails.expiry_date !== card.expiryDate) {
        updates.expiryDate = kripiDetails.expiry_date
        card.expiryDate = kripiDetails.expiry_date
      }
      if (kripiDetails.cvv && kripiDetails.cvv !== card.cvv) {
        updates.cvv = kripiDetails.cvv
        card.cvv = kripiDetails.cvv
      }
      if (kripiDetails.status) {
        const newStatus = kripiDetails.status === "ACTIVE" ? "ACTIVE" : kripiDetails.status === "FROZEN" ? "FROZEN" : card.status
        if (newStatus !== card.status) {
          updates.status = newStatus
          card.status = newStatus as any
        }
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        console.log(`[Cards] Syncing card ${card.id} with KripiCard data:`, Object.keys(updates))
        await prisma.card.update({
          where: { id: card.id },
          data: updates,
        })
      }
    } catch (kripiError) {
      // API might be down - use local data
      console.warn("[Cards] Could not fetch from KripiCard API, using local data:", kripiError instanceof Error ? kripiError.message : "Unknown error")
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
