import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCardDetails } from "@/lib/kripicard-client";
import {
  authenticatePersonalToken,
  checkPersonalRateLimit,
  hasScope,
} from "@/lib/personal-auth";

// GET /api/openclaw/me/cards — Get all cards for the authenticated user
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

    if (!hasScope(ctx, "read:cards")) {
      return NextResponse.json(
        { error: "Token missing scope: read:cards" },
        { status: 403 }
      );
    }

    // CRITICAL: Only fetch cards owned by this user
    const cards = await prisma.card.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kripiCardId: true,
        cardNumber: true,
        expiryDate: true,
        cvv: true,
        nameOnCard: true,
        balance: true,
        status: true,
        createdAt: true,
      },
    });

    // Check if user wants live balance sync
    const syncParam = req.nextUrl.searchParams.get("sync");
    const shouldSync = syncParam === "true" || syncParam === "1";

    let responseCards = cards;

    if (shouldSync) {
      // Sync balances from KripiCard API
      responseCards = await Promise.all(
        cards.map(async (card) => {
          if (card.status === "PENDING" || !card.kripiCardId) return card;

          try {
            const kripiDetails = await getCardDetails(card.kripiCardId);
            const updates: Record<string, unknown> = {};

            if (kripiDetails.balance !== card.balance) {
              updates.balance = kripiDetails.balance;
            }

            if (Object.keys(updates).length > 0) {
              await prisma.card.update({
                where: { id: card.id },
                data: updates,
              });
              return { ...card, ...updates };
            }

            return card;
          } catch {
            return card;
          }
        })
      );
    }

    // Mask card numbers for security (show last 4 only unless ?full=true)
    const fullParam = req.nextUrl.searchParams.get("full");
    const showFull = fullParam === "true" || fullParam === "1";

    const formattedCards = responseCards.map((card) => ({
      id: card.id,
      card_number: showFull
        ? card.cardNumber
        : card.cardNumber
          ? `**** **** **** ${card.cardNumber.slice(-4)}`
          : "****",
      expiry_date: card.expiryDate,
      cvv: showFull ? card.cvv : "***",
      name_on_card: card.nameOnCard,
      balance: card.balance,
      status: card.status,
      created_at: card.createdAt,
    }));

    // Summary
    const totalBalance = responseCards.reduce((sum, c) => sum + c.balance, 0);
    const activeCards = responseCards.filter((c) => c.status === "ACTIVE").length;

    return NextResponse.json({
      success: true,
      summary: {
        total_cards: responseCards.length,
        active_cards: activeCards,
        total_balance: Math.round(totalBalance * 100) / 100,
      },
      cards: formattedCards,
    });
  } catch (error) {
    console.error("[OpenClaw Cards] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    );
  }
}
