import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/v1/plans — List available API plans
export async function GET() {
  const plans = await prisma.apiPlan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: "asc" },
  });

  return NextResponse.json({
    data: plans.map((p) => ({
      name: p.name,
      display_name: p.displayName,
      price_monthly: p.priceMonthly,
      cards_per_month: p.cardsPerMonth,
      requests_per_minute: p.requestsPerMin,
      card_issue_fee: p.cardIssueFee,
      card_fund_fee: p.cardFundFee,
      markup_percent: p.markupPercent,
      features: {
        live_cards: p.liveCards,
        test_mode: p.testMode,
        webhooks: p.webhooks,
        ip_whitelist: p.ipWhitelist,
        priority_support: p.prioritySupport,
        dedicated_bin: p.dedicatedBin,
        custom_branding: p.customBranding,
      },
    })),
  });
}
