import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/v1/usage — Get API usage stats for current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Login required." } }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    include: { plan: true },
  });

  if (keys.length === 0) {
    return NextResponse.json({
      total_requests: 0,
      total_cards: 0,
      total_volume: 0,
      keys: [],
    });
  }

  const keyIds = keys.map((k) => k.id);

  // Get usage counts for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentUsage, totalCards, totalApiCards] = await Promise.all([
    prisma.apiUsage.count({
      where: { apiKeyId: { in: keyIds }, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.apiCard.count({
      where: { apiKeyId: { in: keyIds } },
    }),
    prisma.apiCard.aggregate({
      where: { apiKeyId: { in: keyIds } },
      _sum: { balance: true },
    }),
  ]);

  // Get daily usage for chart
  const dailyUsage = await prisma.apiUsage.groupBy({
    by: ["apiKeyId"],
    where: { apiKeyId: { in: keyIds }, createdAt: { gte: thirtyDaysAgo } },
    _count: true,
  });

  const totalRequests = keys.reduce((sum, k) => sum + k.totalRequests, 0);
  const totalVolume = keys.reduce((sum, k) => sum + k.totalVolume, 0);

  return NextResponse.json({
    total_requests: totalRequests,
    recent_requests_30d: recentUsage,
    total_cards: totalCards,
    total_volume: totalVolume,
    total_card_balance: totalApiCards._sum.balance || 0,
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      is_test: k.isTest,
      is_active: k.isActive,
      plan: k.plan.displayName,
      requests: k.totalRequests,
      cards: k.totalCards,
      volume: k.totalVolume,
      cards_remaining: k.plan.cardsPerMonth - k.totalCards,
      last_used: k.lastUsedAt?.toISOString() || null,
    })),
    usage_by_key: dailyUsage,
  });
}
