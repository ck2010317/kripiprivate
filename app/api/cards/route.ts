import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { getCardDetails } from "@/lib/kripicard-client"

export const maxDuration = 15
export const dynamic = "force-dynamic"

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

    // Create a PENDING card in the database
    // Admin will manually create the card on KripiCard dashboard and assign the ID
    const card = await prisma.card.create({
      data: {
        nameOnCard: cardholderName,
        balance: amount,
        userId: user.id,
        status: "PENDING",
        // These will be filled when admin assigns the card
        kripiCardId: "",
        cardNumber: "",
        expiryDate: "",
        cvv: "",
      },
    })

    return NextResponse.json({
      success: true,
      card: {
        id: card.id,
        nameOnCard: card.nameOnCard,
        balance: card.balance,
        status: card.status,
        createdAt: card.createdAt,
      },
      message: "Card request submitted. Your card will be activated shortly.",
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
        // Skip sync for PENDING cards — they don't have a kripiCardId yet
        if (card.status === "PENDING" || !card.kripiCardId || !card.cardNumber) {
          return card
        }

        try {
          // Use regular endpoint with last4 of card number (premium endpoint doesn't work for all cards)
          const last4 = card.cardNumber.slice(-4)
          const kripiDetails = await Promise.race([
            getCardDetails(last4),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("KripiCard sync timeout")), 8000))
          ])
          
          const updates: Record<string, any> = {}
          
          console.log(`[Cards] Balance sync for card ${card.id}: KripiCard=${kripiDetails.balance} (${typeof kripiDetails.balance}), DB=${card.balance} (${typeof card.balance}), match=${kripiDetails.balance === card.balance}`)
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
            const statusMap: Record<string, string> = { "ACTIVE": "ACTIVE", "FROZEN": "FROZEN", "CANCELLED": "CANCELLED" }
            const newStatus = statusMap[kripiDetails.status] || card.status
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
          const errMsg = kripiError instanceof Error ? kripiError.message : "Unknown"
          console.warn(`[Cards] Failed to sync card ${card.id}:`, errMsg)
          
          const lowerMsg = errMsg.toLowerCase()
          
          // If KripiCard says card is frozen (can't view details while frozen), mark as FROZEN
          if (lowerMsg.includes("unfreez") || lowerMsg.includes("frozen") || (lowerMsg.includes("freeze") && lowerMsg.includes("view"))) {
            console.log(`[Cards] Marking card ${card.id} as FROZEN based on API error: ${errMsg}`)
            try {
              await prisma.card.update({
                where: { id: card.id },
                data: { status: "FROZEN" },
              })
              return { ...card, status: "FROZEN" }
            } catch {
              return { ...card, status: "FROZEN" }
            }
          }
          
          // Only mark as CANCELLED for explicit cancellation messages (not "not found" which happens with premium endpoint)
          if (lowerMsg.includes("cancel") || lowerMsg.includes("closed") || lowerMsg.includes("terminated")) {
            console.log(`[Cards] Marking card ${card.id} as CANCELLED based on API error: ${errMsg}`)
            try {
              await prisma.card.update({
                where: { id: card.id },
                data: { status: "CANCELLED" },
              })
              return { ...card, status: "CANCELLED" }
            } catch {
              return { ...card, status: "CANCELLED" }
            }
          }
          
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
