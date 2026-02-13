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
      wallet_balance: k.walletBalance,
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
  const { name, plan_name, is_test, payment_id } = body;

  // Find the plan
  const planName = plan_name || "starter";
  const plan = await prisma.apiPlan.findUnique({ where: { name: planName } });
  if (!plan) {
    return NextResponse.json(
      { error: { code: "invalid_plan", message: `Plan '${planName}' not found.` } },
      { status: 400 }
    );
  }

  // Live keys require payment verification
  if (!is_test) {
    if (!payment_id) {
      return NextResponse.json(
        { error: { code: "payment_required", message: "A verified payment_id is required to create a live API key. Buy a package first." } },
        { status: 402 }
      );
    }

    // Verify payment exists, belongs to user, and is verified
    const payment = await prisma.payment.findUnique({
      where: { id: payment_id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: { code: "payment_not_found", message: "Payment not found." } },
        { status: 404 }
      );
    }

    if (payment.userId !== user.id) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Payment does not belong to you." } },
        { status: 403 }
      );
    }

    if (payment.status !== "VERIFIED" && payment.status !== "COMPLETED") {
      return NextResponse.json(
        { error: { code: "payment_not_verified", message: `Payment is not verified (status: ${payment.status}). Please complete payment first.` } },
        { status: 402 }
      );
    }

    // Check that the payment amount matches the plan price (within tolerance)
    if (payment.amountUsd < plan.priceMonthly * 0.95) {
      return NextResponse.json(
        { error: { code: "insufficient_payment", message: `Payment of $${payment.amountUsd.toFixed(2)} does not cover plan price of $${plan.priceMonthly.toFixed(2)}.` } },
        { status: 402 }
      );
    }

    // Check if user already has a live key (only one allowed per purchase)
    const existingLiveKey = await prisma.apiKey.findFirst({
      where: { userId: user.id, isTest: false, isActive: true },
    });
    if (existingLiveKey) {
      return NextResponse.json(
        { error: { code: "key_exists", message: "You already have an active live API key." } },
        { status: 409 }
      );
    }

    // Mark payment as completed
    await prisma.payment.update({
      where: { id: payment_id },
      data: { status: "COMPLETED" },
    });
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
