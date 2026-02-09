import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCardDetails } from "@/lib/kripicard-client"

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
    console.log(`[Admin Assign] Fetching details for kripiCardId: ${trimmedKripiId}`)
    let cardDetails
    try {
      cardDetails = await getCardDetails(trimmedKripiId)
    } catch (fetchError) {
      console.error(`[Admin Assign] Failed to fetch card details:`, fetchError)
      const msg = fetchError instanceof Error ? fetchError.message : String(fetchError)
      return NextResponse.json(
        { error: `Failed to fetch card details from provider: ${msg}` },
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
