import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticatePersonalToken,
  checkPersonalRateLimit,
  hasScope,
} from "@/lib/personal-auth";

// GET /api/openclaw/me/overview — Full account overview (all data in one call)
// This is the "smart" endpoint — an AI agent can call this once and get everything
export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticatePersonalToken(req);

    if (!ctx) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          hint: "Pass your personal token via: Authorization: Bearer pat_xxxxx",
        },
        { status: 401 }
      );
    }

    const rateCheck = checkPersonalRateLimit(ctx.tokenId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 30 requests/minute." },
        { status: 429 }
      );
    }

    // Fetch everything in parallel — all user-scoped
    const [cards, payments, user, referralLogs] = await Promise.all([
      hasScope(ctx, "read:cards")
        ? prisma.card.findMany({
            where: { userId: ctx.userId },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              kripiCardId: true,
              cardNumber: true,
              nameOnCard: true,
              balance: true,
              status: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),

      hasScope(ctx, "read:payments")
        ? prisma.payment.findMany({
            where: { userId: ctx.userId },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              amountUsd: true,
              status: true,
              cardType: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),

      prisma.user.findUnique({
        where: { id: ctx.userId },
        select: {
          referralCode: true,
          referralPoints: true,
          referralEarnings: true,
          referralCardCount: true,
        },
      }),

      hasScope(ctx, "read:referrals")
        ? prisma.referralLog.count({ where: { referrerId: ctx.userId } })
        : Promise.resolve(0),
    ]);

    // Aggregate card stats
    const totalBalance = cards.reduce((sum, c) => sum + c.balance, 0);
    const activeCards = cards.filter((c) => c.status === "ACTIVE").length;

    // Aggregate payment stats
    const completedPayments = payments.filter(
      (p) => p.status === "COMPLETED"
    );
    const pendingPayments = payments.filter(
      (p) => p.status === "PENDING" || p.status === "CONFIRMING"
    );

    return NextResponse.json({
      success: true,
      overview: {
        user: {
          name: ctx.name,
          email: ctx.email,
        },
        cards: {
          total: cards.length,
          active: activeCards,
          total_balance_usd: Math.round(totalBalance * 100) / 100,
          list: cards.map((c) => ({
            id: c.id,
            last_four: c.cardNumber ? c.cardNumber.slice(-4) : "????",
            name: c.nameOnCard,
            balance: c.balance,
            status: c.status,
            created_at: c.createdAt,
          })),
        },
        payments: {
          recent_count: payments.length,
          completed: completedPayments.length,
          pending: pendingPayments.length,
          recent: payments.map((p) => ({
            id: p.id,
            amount_usd: p.amountUsd,
            status: p.status,
            type: p.cardType,
            created_at: p.createdAt,
          })),
        },
        referrals: user
          ? {
              code: user.referralCode,
              total_points: user.referralPoints,
              total_earnings_usd: user.referralEarnings,
              total_referred: user.referralCardCount,
              total_logs: referralLogs,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[OpenClaw Overview] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch overview" },
      { status: 500 }
    );
  }
}
