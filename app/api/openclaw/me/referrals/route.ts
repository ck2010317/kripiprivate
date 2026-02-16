import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticatePersonalToken,
  checkPersonalRateLimit,
  hasScope,
} from "@/lib/personal-auth";

// GET /api/openclaw/me/referrals — Get referral stats for the authenticated user
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

    if (!hasScope(ctx, "read:referrals")) {
      return NextResponse.json(
        { error: "Token missing scope: read:referrals" },
        { status: 403 }
      );
    }

    // CRITICAL: Only fetch data for THIS user
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        referralCode: true,
        referralPoints: true,
        referralEarnings: true,
        referralCardCount: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const recentReferrals = await prisma.referralLog.findMany({
      where: { referrerId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        referredEmail: true,
        rewardAmount: true,
        points: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      referral: {
        code: user.referralCode,
        total_points: user.referralPoints,
        total_earnings_usd: user.referralEarnings,
        total_referred_cards: user.referralCardCount,
        share_link: user.referralCode
          ? `https://privatepay.site?ref=${user.referralCode}`
          : null,
      },
      recent_referrals: recentReferrals.map((r) => ({
        referred_email: r.referredEmail.replace(
          /(.{2})(.*)(@.*)/,
          "$1***$3"
        ), // Mask email
        reward_usd: r.rewardAmount,
        points: r.points,
        status: r.status,
        created_at: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("[OpenClaw Referrals] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch referrals" },
      { status: 500 }
    );
  }
}
