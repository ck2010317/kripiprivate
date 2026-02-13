import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { getCardTransactions } from "@/lib/kripicard-client";

// GET /api/v1/cards/[cardId]/transactions — Get card transactions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  return withApiKey(req, async (request, ctx) => {
    const { cardId } = await params;

    const card = await prisma.apiCard.findFirst({
      where: { id: cardId, apiKeyId: ctx.apiKey.id },
    });

    if (!card) {
      return NextResponse.json(
        { error: { code: "card_not_found", message: "Card not found." } },
        { status: 404 }
      );
    }

    // Test mode: return fake transactions
    if (ctx.apiKey.isTest) {
      return NextResponse.json({
        data: [
          {
            id: "txn_test_001",
            type: "fund",
            amount: card.balance,
            description: "Initial card funding",
            merchant: null,
            status: "completed",
            date: card.createdAt.toISOString(),
          },
        ],
        total: 1,
      });
    }

    if (!card.kripiCardId) {
      return NextResponse.json({ data: [], total: 0 });
    }

    try {
      const result = await getCardTransactions(card.kripiCardId);
      return NextResponse.json({
        data: result.transactions.map((tx) => ({
          id: tx.transaction_id,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          merchant: tx.merchant || null,
          status: tx.status,
          currency: tx.currency || "USD",
          date: tx.date,
        })),
        total: result.transactions.length,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch transactions";
      return NextResponse.json(
        { error: { code: "fetch_failed", message } },
        { status: 502 }
      );
    }
  });
}
