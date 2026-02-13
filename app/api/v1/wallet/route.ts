import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";

// GET /api/v1/wallet — Get wallet balance and transaction history
export async function GET(req: NextRequest) {
  return withApiKey(req, async (request, ctx) => {
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");

    const [transactions, total] = await Promise.all([
      prisma.apiTransaction.findMany({
        where: { apiKeyId: ctx.apiKey.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.apiTransaction.count({ where: { apiKeyId: ctx.apiKey.id } }),
    ]);

    return NextResponse.json({
      wallet: {
        balance: ctx.apiKey.walletBalance,
        total_deposited: ctx.apiKey.totalDeposited,
        total_charged: ctx.apiKey.totalCharged,
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
  });
}
