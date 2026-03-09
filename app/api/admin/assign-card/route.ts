import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCardDetailsById } from "@/lib/kripicard-client"

const KRIPICARD_BASE_URL = "https://kripicard.com/api"
const API_KEY = "6e9148a72d14806d9a3b079d4f5a511c9016b2be"

// POST /api/admin/assign-card
// Admin assigns a kripiCardId to a PENDING card after manually creating it on KripiCard dashboard
export async function POST(req: NextRequest) {
  try {
    const { cardId, kripiCardId } = await req.json()

    if (!cardId || !kripiCardId) {
      return NextResponse.json(
        { error: "Missing required fields: cardId and kripiCardId" },
        { status: 400 }
      )
    }

    const trimmedKripiId = kripiCardId.trim()

    // Find the PENDING card
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      )
    }

    if (card.status !== "PENDING") {
      return NextResponse.json(
        { error: `Card is not in PENDING status (current: ${card.status}). Only PENDING cards can be assigned.` },
        { status: 400 }
      )
    }

    // Check if kripiCardId is already used by another card
    const existingCard = await prisma.card.findUnique({
      where: { kripiCardId: trimmedKripiId },
    })

    if (existingCard) {
      return NextResponse.json(
        { error: `KripiCard ID ${trimmedKripiId} is already assigned to another card (${existingCard.id})` },
        { status: 409 }
      )
    }

    // Fetch real card details from KripiCard API
    // Try regular endpoint first (using last4), then fall back to premium endpoint
    console.log(`[Admin Assign] Fetching details for kripiCardId: ${trimmedKripiId}`)
    let cardDetails: { card_number: string; expiry_date: string; cvv: string; balance: number; status: string } | null = null

    // Method 1: Try regular /cards/carddetails with last4 (works for all cards)
    const last4 = trimmedKripiId.slice(-4)
    console.log(`[Admin Assign] Trying regular endpoint with last4: ${last4}`)
    try {
      const res = await fetch(`${KRIPICARD_BASE_URL}/cards/carddetails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: API_KEY, last4 }),
      })
      const data = await res.json()
      console.log(`[Admin Assign] Regular endpoint response:`, JSON.stringify(data).substring(0, 300))
      
      if (data.status === true && data.card) {
        // Verify this is the right card by matching card_id or card_number
        if (data.card.card_id === trimmedKripiId || data.card.card_number === trimmedKripiId) {
          cardDetails = {
            card_number: data.card.card_number,
            expiry_date: data.card.expiry_date,
            cvv: data.card.cvv,
            balance: data.currentBalance ?? parseFloat(data.card.amount) ?? 0,
            status: data.card.status || "ACTIVE",
          }
          console.log(`[Admin Assign] ✅ Got card details via regular endpoint`)
        } else {
          console.log(`[Admin Assign] Card ID mismatch: expected ${trimmedKripiId}, got ${data.card.card_id}`)
        }
      }
    } catch (e) {
      console.error(`[Admin Assign] Regular endpoint failed:`, e)
    }

    // Method 2: Fall back to premium endpoint
    if (!cardDetails) {
      console.log(`[Admin Assign] Trying premium endpoint with card_id: ${trimmedKripiId}`)
      try {
        const premiumData = await getCardDetailsById(trimmedKripiId)
        cardDetails = {
          card_number: premiumData.card_number,
          expiry_date: premiumData.expiry_date,
          cvv: premiumData.cvv,
          balance: premiumData.balance || 0,
          status: premiumData.status || "ACTIVE",
        }
        console.log(`[Admin Assign] ✅ Got card details via premium endpoint`)
      } catch (premiumError) {
        console.error(`[Admin Assign] Premium endpoint also failed:`, premiumError)
      }
    }

    if (!cardDetails) {
      return NextResponse.json(
        { error: `Could not fetch card details from KripiCard for ID: ${trimmedKripiId}. Tried both regular (last4: ${last4}) and premium endpoints. Make sure the card exists on KripiCard dashboard.` },
        { status: 502 }
      )
    }

    if (!cardDetails.card_number || !cardDetails.cvv || !cardDetails.expiry_date) {
      return NextResponse.json(
        { error: "Card details incomplete — missing card number, CVV, or expiry date" },
        { status: 502 }
      )
    }

    // Update the PENDING card with real details
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        kripiCardId: trimmedKripiId,
        cardNumber: cardDetails.card_number,
        expiryDate: cardDetails.expiry_date,
        cvv: cardDetails.cvv,
        balance: cardDetails.balance || card.balance,
        status: cardDetails.status === "FROZEN" ? "FROZEN" : "ACTIVE",
        nameOnCard: card.nameOnCard, // keep original name
      },
    })

    console.log(`[Admin Assign] ✅ Card ${cardId} assigned kripiCardId ${trimmedKripiId} — status: ${updatedCard.status}`)

    return NextResponse.json({
      success: true,
      message: `Card assigned successfully. Status: ${updatedCard.status}`,
      card: {
        id: updatedCard.id,
        kripiCardId: updatedCard.kripiCardId,
        cardNumber: updatedCard.cardNumber,
        expiryDate: updatedCard.expiryDate,
        nameOnCard: updatedCard.nameOnCard,
        balance: updatedCard.balance,
        status: updatedCard.status,
        userId: updatedCard.userId,
        user: card.user,
      },
    })
  } catch (error) {
    console.error("[Admin Assign] Error:", error)
    return NextResponse.json(
      { error: "Failed to assign card", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// GET /api/admin/assign-card
// Returns all PENDING cards that need kripiCardId assignment
export async function GET() {
  try {
    const pendingCards = await prisma.card.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    // Also get the related payments for context
    const cardIds = pendingCards.map(c => c.id)
    const relatedPayments = await prisma.payment.findMany({
      where: { issuedCardId: { in: cardIds } },
      select: {
        id: true,
        amountUsd: true,
        amountSol: true,
        topupAmount: true,
        txSignature: true,
        issuedCardId: true,
        createdAt: true,
      },
    })

    const paymentsByCardId = new Map<string, typeof relatedPayments[0]>()
    for (const p of relatedPayments) {
      if (p.issuedCardId) {
        paymentsByCardId.set(p.issuedCardId, p)
      }
    }

    const result = pendingCards.map(card => ({
      ...card,
      payment: paymentsByCardId.get(card.id) || null,
    }))

    return NextResponse.json({
      success: true,
      totalPending: result.length,
      cards: result,
    })
  } catch (error) {
    console.error("[Admin Assign] GET Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch pending cards" },
      { status: 500 }
    )
  }
}
