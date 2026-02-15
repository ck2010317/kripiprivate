import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

const ADMIN_EMAILS = ["shaann950@gmail.com"]

/**
 * GET /api/admin/payments/verify
 * List all pending/confirming payments for admin to verify
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payments = await prisma.payment.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMING", "VERIFIED"] },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        userId: p.userId,
        userEmail: p.user.email,
        userName: p.user.name,
        amountUsd: p.amountUsd,
        amountSol: p.amountSol,
        topupAmount: p.topupAmount,
        status: p.status,
        cardType: p.cardType,
        nameOnCard: p.nameOnCard,
        txSignature: p.txSignature,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
      })),
    })
  } catch (error) {
    console.error("[Admin] Error listing payments:", error)
    return NextResponse.json(
      { error: "Failed to list payments" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/payments/verify
 * Manually verify a payment and issue a PENDING card
 * Body: { paymentId: string, txSignature?: string }
 * 
 * This matches the real flow:
 * 1. Payment → VERIFIED → COMPLETED
 * 2. Card created as PENDING (empty cardNumber/expiry/cvv)
 * 3. Admin later assigns KripiCard ID via /api/admin/assign-card
 * 4. Card becomes ACTIVE with real details (takes up to 4 hours)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { paymentId, txSignature } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      )
    }

    // Find the payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: { select: { id: true, email: true, name: true } } },
    })

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    // Already completed?
    if (payment.status === "COMPLETED") {
      if (payment.issuedCardId) {
        const card = await prisma.card.findUnique({
          where: { id: payment.issuedCardId },
        })
        return NextResponse.json({
          success: true,
          message: `Card already issued for ${payment.user.email}`,
          card,
        })
      }
      return NextResponse.json(
        { error: "Payment already completed" },
        { status: 400 }
      )
    }

    // Mark payment as verified
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "VERIFIED",
        txSignature: txSignature || payment.txSignature || "manual-admin-verification",
      },
    })

    console.log(`[Admin] Payment ${payment.id} manually verified by ${user.email}`)
    console.log(`[Admin] User: ${payment.user.email} (${payment.user.name})`)
    console.log(`[Admin] Amount: $${payment.amountUsd} / ${payment.amountSol} SOL`)

    // Issue the card (card issuance flow)
    if (payment.cardType === "issue") {
      const topupAmount = payment.topupAmount || payment.amountUsd
      const cardName = (payment.nameOnCard || payment.user.name || "CARDHOLDER").toUpperCase()

      // Check if a card already exists for this payment
      if (payment.issuedCardId) {
        const existingCard = await prisma.card.findUnique({
          where: { id: payment.issuedCardId },
        })
        if (existingCard) {
          return NextResponse.json({
            success: true,
            message: `Card already exists for ${payment.user.email}`,
            card: {
              id: existingCard.id,
              nameOnCard: existingCard.nameOnCard,
              balance: existingCard.balance,
              status: existingCard.status,
            },
          })
        }
      }

      // Create PENDING card — same as the normal verified payment flow
      // Card details (number, expiry, cvv) are empty until admin assigns KripiCard ID
      const card = await prisma.card.create({
        data: {
          cardNumber: "",
          expiryDate: "",
          cvv: "",
          nameOnCard: cardName,
          balance: topupAmount,
          status: "PENDING",
          userId: payment.userId,
        },
      })

      // Link card to payment and mark completed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          issuedCardId: card.id,
        },
      })

      // Handle referral rewards (same as normal flow)
      try {
        const fullUser = await prisma.user.findUnique({
          where: { id: payment.userId },
          select: { referredById: true, email: true },
        })

        if (fullUser?.referredById) {
          const userCardCount = await prisma.card.count({
            where: { userId: payment.userId },
          })

          if (userCardCount === 1) {
            await prisma.$transaction([
              prisma.user.update({
                where: { id: fullUser.referredById },
                data: {
                  referralPoints: { increment: 10 },
                  referralEarnings: { increment: 5 },
                  referralCardCount: { increment: 1 },
                },
              }),
              prisma.referralLog.create({
                data: {
                  referrerId: fullUser.referredById,
                  referredEmail: fullUser.email,
                  rewardAmount: 5,
                  points: 10,
                  cardId: card.id,
                  paymentId: payment.id,
                },
              }),
            ])
            console.log(`[Admin] ✅ Referral reward credited for ${fullUser.email}`)
          }
        }
      } catch (refErr) {
        console.error("[Admin] Referral reward failed (non-blocking):", refErr)
      }

      console.log(`[Admin] ✅ PENDING card ${card.id} created for ${payment.user.email} — balance: $${topupAmount}`)

      return NextResponse.json({
        success: true,
        message: `Card issued for ${payment.user.email}! Balance: $${topupAmount}. Card is PENDING — assign KripiCard ID in admin dashboard to activate.`,
        card: {
          id: card.id,
          nameOnCard: cardName,
          balance: topupAmount,
          status: "PENDING",
        },
        user: payment.user,
      })
    }

    // Non-card payment (topup etc) — just mark verified
    return NextResponse.json({
      success: true,
      message: `Payment verified for ${payment.user.email}`,
      user: payment.user,
    })
  } catch (error) {
    console.error("[Admin Verify] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify payment" },
      { status: 500 }
    )
  }
}
