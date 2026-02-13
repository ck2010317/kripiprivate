import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateApiKey, hashApiKey } from "@/lib/api-middleware";

// GET /api/v1/keys — List current user's API keys
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Login required." } }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: keys.map((k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key.slice(0, 14) + "..." + k.key.slice(-4),
      is_test: k.isTest,
      is_active: k.isActive,
      plan: k.plan.displayName,
      rate_limit: k.rateLimit,
      monthly_limit: k.monthlyLimit,
      total_requests: k.totalRequests,
      total_cards: k.totalCards,
      total_volume: k.totalVolume,
      last_used_at: k.lastUsedAt?.toISOString() || null,
      created_at: k.createdAt.toISOString(),
    })),
  });
}

// POST /api/v1/keys — Create a new API key
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Login required." } }, { status: 401 });
  }

  const body = await req.json();
  const { name, plan_name, is_test } = body;

  // Find the plan
  const planName = plan_name || "starter";
  const plan = await prisma.apiPlan.findUnique({ where: { name: planName } });
  if (!plan) {
    return NextResponse.json(
      { error: { code: "invalid_plan", message: `Plan '${planName}' not found.` } },
      { status: 400 }
    );
  }

  // Generate key
  const rawKey = generateApiKey(is_test || false);
  const hashed = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      key: rawKey,
      hashedKey: hashed,
      name: name || "Default",
      userId: user.id,
      planId: plan.id,
      isTest: is_test || false,
      rateLimit: plan.requestsPerMin,
      monthlyLimit: plan.cardsPerMonth,
    },
    include: { plan: true },
  });

  // Return the full key ONCE (only time it's shown in full)
  return NextResponse.json({
    id: apiKey.id,
    name: apiKey.name,
    key: rawKey, // Full key — store this! Never shown again.
    is_test: apiKey.isTest,
    plan: plan.displayName,
    rate_limit: apiKey.rateLimit,
    monthly_limit: apiKey.monthlyLimit,
    created_at: apiKey.createdAt.toISOString(),
    message: "Store this API key securely. It will not be shown again.",
  }, { status: 201 });
}
