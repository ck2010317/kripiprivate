import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Your admin email — only you can deposit funds
const ADMIN_EMAILS = ["chandm1213@gmail.com"];

// POST /api/admin/wallet/deposit — Add funds to a developer's wallet
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { api_key_id, amount, description, reference } = body;

  if (!api_key_id) {
    return NextResponse.json(
      { error: "api_key_id is required." },
      { status: 400 }
    );
  }

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number." },
      { status: 400 }
    );
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { id: api_key_id },
    include: { user: true },
  });

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not found." },
      { status: 404 }
    );
  }

  const newBalance = apiKey.walletBalance + amount;

  await prisma.$transaction([
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        walletBalance: newBalance,
        totalDeposited: { increment: amount },
      },
    }),
    prisma.apiTransaction.create({
      data: {
        apiKeyId: apiKey.id,
        type: "DEPOSIT",
        amount: amount,
        balanceAfter: newBalance,
        description: description || `Deposit: $${amount.toFixed(2)}`,
        reference: reference || null,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    api_key_id: apiKey.id,
    api_key_name: apiKey.name,
    developer_email: apiKey.user.email,
    amount_deposited: amount,
    previous_balance: apiKey.walletBalance,
    new_balance: newBalance,
  });
}

// GET /api/admin/wallet/deposit — List all API keys with balances (admin view)
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json(
      { error: "Unauthorized. Admin access required." },
      { status: 403 }
    );
  }

  const keys = await prisma.apiKey.findMany({
    where: { isActive: true, isTest: false },
    include: { user: true, plan: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    data: keys.map((k) => ({
      id: k.id,
      name: k.name,
      developer_email: k.user.email,
      developer_name: k.user.name,
      plan: k.plan.displayName,
      wallet_balance: k.walletBalance,
      total_deposited: k.totalDeposited,
      total_charged: k.totalCharged,
      total_cards: k.totalCards,
      total_volume: k.totalVolume,
      created_at: k.createdAt.toISOString(),
    })),
  });
}
