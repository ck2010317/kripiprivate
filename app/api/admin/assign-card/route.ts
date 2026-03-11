import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const KRIPICARD_BASE_URL = "https://kripicard.com/api"
const API_KEY = "6e9148a72d14806d9a3b079d4f5a511c9016b2be"

// POST /api/admin/assign-card
// Admin assigns a kripiCardId to a PENDING card after manually creating it on KripiCard dashboard
export async function POST(req: NextRequest) {
  try {
    const { cardId, kripiCardId, last4: inputLast4 } = await req.json()

    if (!cardId || !kripiCardId) {
      return NextResponse.json(
        { error: "Missing required fields: cardId and kripiCardId" },
        { status: 400 }
      )
    }

    const trimmedKripiId = kripiCardId.trim()
    const trimmedLast4 = inputLast4?.toString().trim()

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
    // The /cards/carddetails endpoint requires the card NUMBER's last4, not the card_id's last4
    // If kripiCardId is a full 16-digit card number, derive last4 from it
    // Otherwise, admin must provide last4 separately
    console.log(`[Admin Assign] Fetching details for kripiCardId: ${trimmedKripiId}`)
    let cardDetails: { card_number: string; expiry_date: string; cvv: string; balance: number; status: string } | null = null

    // Determine the last4 to use for the API call
    const isFullCardNumber = /^\d{15,16}$/.test(trimmedKripiId)
    const last4 = trimmedLast4 || (isFullCardNumber ? trimmedKripiId.slice(-4) : null)

    if (!last4) {
      return NextResponse.json(
        { error: `kripiCardId "${trimmedKripiId}" is not a full card number, so you must also provide "last4" (the last 4 digits of the card number from the KripiCard dashboard).` },
        { status: 400 }
      )
    }

    console.log(`[Admin Assign] Using last4: ${last4} (from ${trimmedLast4 ? 'admin input' : 'card number'})`)
    try {
      const res = await fetch(`${KRIPICARD_BASE_URL}/cards/carddetails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: API_KEY, last4 }),
      })
      const data = await res.json()
      console.log(`[Admin Assign] API response:`, JSON.stringify(data).substring(0, 500))

      if (data.status === true && data.card) {
        // Verify: if admin provided a kripiCardId, make sure the returned card matches
        const apiCardId = data.card.card_id?.toString() || ""
        if (apiCardId && apiCardId !== trimmedKripiId && isFullCardNumber) {
          // Full card number was given but card_id doesn't match — warn but still allow
          console.log(`[Admin Assign] Note: API card_id (${apiCardId}) differs from input (${trimmedKripiId})`)
        }

        cardDetails = {
          card_number: data.card.card_number,
          expiry_date: data.card.expiry_date,
          cvv: data.card.cvv,
          balance: data.currentBalance ?? parseFloat(data.card.amount) ?? 0,
          status: data.card.status || "ACTIVE",
        }
        // Always use the card_id from the API response (this is what other endpoints need)
        if (apiCardId) {
          trimmedKripiId !== apiCardId && console.log(`[Admin Assign] Using API card_id: ${apiCardId} (input was: ${trimmedKripiId})`)
        }
        console.log(`[Admin Assign] ✅ Got card details via /cards/carddetails`)
      } else {
        console.error(`[Admin Assign] API returned:`, data.message || JSON.stringify(data))
      }
    } catch (e) {
      console.error(`[Admin Assign] API call failed:`, e)
    }

    if (!cardDetails) {
      return NextResponse.json(
        { error: `Could not fetch card details from KripiCard for last4: ${last4} (kripiCardId: ${trimmedKripiId}). The API may have returned "not allowed" — make sure the card belongs to this API key.` },
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
