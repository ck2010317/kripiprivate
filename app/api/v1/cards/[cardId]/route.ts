import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { getCardDetails, freezeUnfreezeCard } from "@/lib/kripicard-client";

// GET /api/v1/cards/[cardId] — Get card details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  return withApiKey(req, async (_request, ctx) => {
    const { cardId } = await params;

    const card = await prisma.apiCard.findFirst({
      where: {
        id: cardId,
        apiKeyId: ctx.apiKey.id,
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: { code: "card_not_found", message: "Card not found." } },
        { status: 404 }
      );
    }

    // Live balance sync from KripiCard
    if (!ctx.apiKey.isTest && card.kripiCardId) {
      try {
        const liveDetails = await getCardDetails(card.kripiCardId);
        if (liveDetails.success) {
          await prisma.apiCard.update({
            where: { id: card.id },
            data: {
              balance: liveDetails.balance,
              status: liveDetails.status === "FROZEN" ? "FROZEN" : liveDetails.status === "CANCELLED" ? "CANCELLED" : "ACTIVE",
            },
          });
          card.balance = liveDetails.balance;
          card.status = liveDetails.status === "FROZEN" ? "FROZEN" : liveDetails.status === "CANCELLED" ? "CANCELLED" : "ACTIVE";
        }
      } catch {
        // Return cached data on API error
      }
    }

    return NextResponse.json({
      id: card.id,
      card_id: card.kripiCardId,
      card_number: card.cardNumber,
      expiry_date: card.expiryDate,
      cvv: card.cvv,
      name_on_card: card.nameOnCard,
      balance: card.balance,
      status: card.status.toLowerCase(),
      external_id: card.externalId,
      metadata: card.metadata ? JSON.parse(card.metadata) : null,
      created_at: card.createdAt.toISOString(),
      updated_at: card.updatedAt.toISOString(),
    });
  });
}

// PATCH /api/v1/cards/[cardId] — Update card (freeze/unfreeze)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  return withApiKey(req, async (request, ctx) => {
    const { cardId } = await params;
    const body = await request.json();
    const { action, external_id, metadata } = body;

    const card = await prisma.apiCard.findFirst({
      where: { id: cardId, apiKeyId: ctx.apiKey.id },
    });

    if (!card) {
      return NextResponse.json(
        { error: { code: "card_not_found", message: "Card not found." } },
        { status: 404 }
      );
    }

    // Handle freeze/unfreeze
    if (action === "freeze" || action === "unfreeze") {
      if (!ctx.apiKey.isTest && card.kripiCardId) {
        try {
          await freezeUnfreezeCard({
            card_id: card.kripiCardId,
            action,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Action failed";
          return NextResponse.json(
            { error: { code: "action_failed", message } },
            { status: 502 }
          );
        }
      }

      const newStatus = action === "freeze" ? "FROZEN" : "ACTIVE";
      await prisma.apiCard.update({
        where: { id: card.id },
        data: { status: newStatus },
      });

      return NextResponse.json({
        id: card.id,
        card_id: card.kripiCardId,
        status: newStatus.toLowerCase(),
        message: `Card ${action === "freeze" ? "frozen" : "unfrozen"} successfully.`,
      });
    }

    // Handle metadata/external_id updates
    const updateData: Record<string, unknown> = {};
    if (external_id !== undefined) updateData.externalId = external_id;
    if (metadata !== undefined) updateData.metadata = metadata ? JSON.stringify(metadata) : null;

    if (Object.keys(updateData).length > 0) {
      await prisma.apiCard.update({
        where: { id: card.id },
        data: updateData,
      });
    }

    return NextResponse.json({
      id: card.id,
      card_id: card.kripiCardId,
      status: card.status.toLowerCase(),
      external_id: external_id ?? card.externalId,
      metadata: metadata ?? (card.metadata ? JSON.parse(card.metadata) : null),
      message: "Card updated.",
    });
  });
}
