import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Admin endpoint to manually verify a payment and issue a card
 * POST /api/admin/payments/verify
 * Body: { paymentId?: string, userId?: string, txSignature?: string }
 * 
 * Can find payment by paymentId directly, or userId (most recent pending)
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentId, txSignature, userId } = await request.json()

    if (!paymentId && !userId) {
      return NextResponse.json(
        { error: "Provide a paymentId or userId" },
        { status: 400 }
      )
    }

    let payment

    if (paymentId) {
      payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { user: { select: { id: true, email: true, name: true } } },
      })
    } else if (userId) {
      // Find most recent pending payment for this user
      payment = await prisma.payment.findFirst({
        where: {
          userId,
          status: { in: ["PENDING", "CONFIRMING"] },
        },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, email: true, name: true } } },
      })
    }

    if (!payment) {
      return NextResponse.json(
        { error: "No pending payment found" },
        { status: 404 }
      )
    }

    if (payment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Card already issued for this payment" },
        { status: 400 }
      )
    }

    // Mark as verified
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "VERIFIED",
        txSignature: txSignature || payment.txSignature || "manual-admin-verification",
      },
    })

    console.log(`[Admin] Payment ${payment.id} manually verified`)
    console.log(`[Admin] User: ${payment.user.email} (${payment.user.name})`)

    // Issue the card (matching the real flow — PENDING card)
    if (payment.cardType === "issue") {
      const topupAmount = payment.topupAmount || payment.amountUsd
      const cardName = (payment.nameOnCard || payment.user.name || "CARDHOLDER").toUpperCase()

      // Check if card already exists for this payment
      if (payment.issuedCardId) {
        const existingCard = await prisma.card.findUnique({
          where: { id: payment.issuedCardId },
        })
        if (existingCard) {
          return NextResponse.json({
            success: true,
            message: "Card already exists for this payment",
            card: existingCard,
            user: payment.user,
          })
        }
      }

      // Create PENDING card (same as normal flow)
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

      // Handle referral rewards
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
            console.log(`[Admin] Referral reward credited for ${fullUser.email}`)
          }
        }
      } catch (refErr) {
        console.error("[Admin] Referral reward failed:", refErr)
      }

      console.log(`[Admin] ✅ Card ${card.id} created for ${payment.user.email}`)

      return NextResponse.json({
        success: true,
        message: `Card issued for ${payment.user.email}. Balance: $${topupAmount}`,
        card: {
          id: card.id,
          nameOnCard: cardName,
          balance: topupAmount,
          status: "PENDING",
        },
        user: payment.user,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified",
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

/**
 * GET /api/admin/payments/verify
 * List all pending payments so admin can pick the right one
 */
export async function GET() {
  try {
    const pendingPayments = await prisma.payment.findMany({
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
      payments: pendingPayments.map((p) => ({
        id: p.id,
        userId: p.userId,
        userEmail: p.user.email,
        userName: p.user.name,
        amountUsd: p.amountUsd,
        amountSol: p.amountSol,
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
