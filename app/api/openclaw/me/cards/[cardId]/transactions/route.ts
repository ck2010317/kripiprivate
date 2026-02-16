import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticatePersonalToken,
  checkPersonalRateLimit,
  hasScope,
} from "@/lib/personal-auth";

// GET /api/openclaw/me/cards/[cardId]/transactions — Get transactions for a specific card
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
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

    if (!hasScope(ctx, "read:transactions")) {
      return NextResponse.json(
        { error: "Token missing scope: read:transactions" },
        { status: 403 }
      );
    }

    const { cardId } = await params;

    // CRITICAL: Verify the card belongs to THIS user
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        userId: ctx.userId,
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Card not found or does not belong to you" },
        { status: 404 }
      );
    }

    // Get limit param
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "50"), 100);

    const transactions = await prisma.cardTransaction.findMany({
      where: { cardId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      card_id: cardId,
      card_name: card.nameOnCard,
      card_status: card.status,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        status: tx.status,
        created_at: tx.createdAt,
      })),
    });
  } catch (error) {
    console.error("[OpenClaw Card Transactions] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
