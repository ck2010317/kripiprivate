import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-middleware";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/v1/wallet — Get wallet balance and transaction history
// Supports both session-based auth (dashboard) and API key auth (external)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  // If Authorization header present, use API key auth
  if (authHeader && authHeader.startsWith("Bearer ppay_")) {
    return withApiKey(req, async (request, ctx) => {
      return getWalletResponse(ctx.apiKey.id, request.nextUrl.searchParams);
    });
  }

  // Otherwise, use session-based auth (for the dashboard)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Login required." } },
      { status: 401 }
    );
  }

  // Find user's active live key (or any key)
  const apiKey = await prisma.apiKey.findFirst({
    where: { userId: user.id, isActive: true, isTest: false },
    orderBy: { createdAt: "desc" },
  });

  if (!apiKey) {
    // Return zeros if no live key yet
    return NextResponse.json({
      wallet: { balance: 0, total_deposited: 0, total_charged: 0 },
      transactions: [],
      total: 0,
      limit: 20,
      offset: 0,
      has_more: false,
    });
  }

  return getWalletResponse(apiKey.id, req.nextUrl.searchParams);
}

async function getWalletResponse(apiKeyId: string, searchParams: URLSearchParams) {
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const [apiKey, transactions, total] = await Promise.all([
    prisma.apiKey.findUnique({ where: { id: apiKeyId } }),
    prisma.apiTransaction.findMany({
      where: { apiKeyId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.apiTransaction.count({ where: { apiKeyId } }),
  ]);

  return NextResponse.json({
    wallet: {
      balance: apiKey?.walletBalance || 0,
      total_deposited: apiKey?.totalDeposited || 0,
      total_charged: apiKey?.totalCharged || 0,
    },
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type.toLowerCase(),
      amount: t.amount,
      balance_after: t.balanceAfter,
      description: t.description,
      reference: t.reference,
      created_at: t.createdAt.toISOString(),
    })),
    total,
    limit,
    offset,
    has_more: offset + limit < total,
  });
}
