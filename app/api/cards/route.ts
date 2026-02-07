import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { createCard as createKripiCard, getCardDetails } from "@/lib/kripicard-client"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const { amount, nameOnCard } = await request.json()

    // Validation
    if (!amount || amount < 10) {
      return NextResponse.json(
        { error: "Amount must be at least $10" },
        { status: 400 }
      )
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: "Amount cannot exceed $10,000" },
        { status: 400 }
      )
    }

    const cardholderName = (nameOnCard || user.name || "CARDHOLDER").toUpperCase()

    // Create card via KripiCard API (includes retry + validation - will throw if details invalid)
    const kripiResponse = await createKripiCard({
      amount,
      name_on_card: cardholderName,
      email: user.email,
      bankBin: "49387519",
    })

    // CRITICAL: Double-check card details are valid (createKripiCard already validates, but be safe)
    if (!kripiResponse.card_number || kripiResponse.card_number.length < 10 ||
        !kripiResponse.cvv || kripiResponse.cvv.length < 3 ||
        !kripiResponse.expiry_date || !kripiResponse.expiry_date.includes("/")) {
      throw new Error(`Card created (ID: ${kripiResponse.card_id}) but got invalid details. Contact support.`)
    }

    // Store card in database with VALIDATED details
    const card = await prisma.card.create({
      data: {
        kripiCardId: kripiResponse.card_id,
        cardNumber: kripiResponse.card_number,
        expiryDate: kripiResponse.expiry_date,
        cvv: kripiResponse.cvv,
        nameOnCard: cardholderName.toUpperCase(),
        balance: kripiResponse.balance || amount,
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      card: {
        id: card.id,
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
    console.error("[Cards] Create card error:", error)
    const message = error instanceof Error ? error.message : "Failed to create card"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// Get all cards for the current user (with live balance sync from KripiCard)
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const cards = await prisma.card.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kripiCardId: true,
        cardNumber: true,
        expiryDate: true,
        cvv: true,
        nameOnCard: true,
        balance: true,
        status: true,
        createdAt: true,
      },
    })

    // Sync balances from KripiCard API in parallel for all cards
    const syncedCards = await Promise.all(
      cards.map(async (card) => {
        try {
          const kripiDetails = await getCardDetails(card.kripiCardId)
          
          const updates: Record<string, any> = {}
          
          if (kripiDetails.balance !== card.balance) {
            updates.balance = kripiDetails.balance
          }
          if (kripiDetails.card_number && kripiDetails.card_number !== card.cardNumber) {
            updates.cardNumber = kripiDetails.card_number
          }
          if (kripiDetails.expiry_date && kripiDetails.expiry_date !== card.expiryDate) {
            updates.expiryDate = kripiDetails.expiry_date
          }
          if (kripiDetails.cvv && kripiDetails.cvv !== card.cvv) {
            updates.cvv = kripiDetails.cvv
          }
          if (kripiDetails.status) {
            const newStatus = kripiDetails.status === "ACTIVE" ? "ACTIVE" : kripiDetails.status === "FROZEN" ? "FROZEN" : card.status
            if (newStatus !== card.status) {
              updates.status = newStatus
            }
          }

          // Apply updates to DB if any changed
          if (Object.keys(updates).length > 0) {
            console.log(`[Cards] Auto-syncing card ${card.id}:`, Object.keys(updates))
            await prisma.card.update({
              where: { id: card.id },
              data: updates,
            })
            return { ...card, ...updates }
          }
          
          return card
        } catch (kripiError) {
          // If API call fails for one card, return DB data
          console.warn(`[Cards] Failed to sync card ${card.id}:`, kripiError instanceof Error ? kripiError.message : "Unknown")
          return card
        }
      })
    )

    return NextResponse.json({
      success: true,
      cards: syncedCards,
    })
  } catch (error) {
    console.error("[Cards] Get cards error:", error)
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    )
  }
}
