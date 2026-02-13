import { NextRequest, NextResponse } from "next/server";
import { withApiKey, sendWebhook } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { fundCard } from "@/lib/kripicard-client";

// POST /api/v1/cards/[cardId]/fund — Add funds to a card
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  return withApiKey(req, async (request, ctx) => {
    const { cardId } = await params;
    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number" || amount < 1) {
      return NextResponse.json(
        { error: { code: "invalid_amount", message: "amount must be at least $1." } },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: { code: "amount_too_large", message: "Maximum funding amount is $10,000." } },
        { status: 400 }
      );
    }

    const card = await prisma.apiCard.findFirst({
      where: { id: cardId, apiKeyId: ctx.apiKey.id },
    });

    if (!card) {
      return NextResponse.json(
        { error: { code: "card_not_found", message: "Card not found." } },
        { status: 404 }
      );
    }

    if (card.status === "FROZEN") {
      return NextResponse.json(
        { error: { code: "card_frozen", message: "Cannot fund a frozen card. Unfreeze it first." } },
        { status: 400 }
      );
    }

    if (card.status === "CANCELLED") {
      return NextResponse.json(
        { error: { code: "card_cancelled", message: "Cannot fund a cancelled card." } },
        { status: 400 }
      );
    }

    const fee = ctx.apiKey.plan.cardFundFee;
    const markup = amount * (ctx.apiKey.plan.markupPercent / 100);
    const totalCost = amount + fee + markup;

    // Check wallet balance (skip for test mode)
    if (!ctx.apiKey.isTest) {
      if (ctx.apiKey.walletBalance < totalCost) {
        return NextResponse.json(
          {
            error: {
              code: "insufficient_balance",
              message: `Insufficient wallet balance. Required: $${totalCost.toFixed(2)}. Available: $${ctx.apiKey.walletBalance.toFixed(2)}.`,
            },
          },
          { status: 402 }
        );
      }
    }

    // Test mode
    if (ctx.apiKey.isTest) {
      const newBalance = card.balance + amount;
      await prisma.apiCard.update({
        where: { id: card.id },
        data: { balance: newBalance },
      });

      return NextResponse.json({
        id: card.id,
        card_id: card.kripiCardId,
        amount_funded: amount,
        fee,
        previous_balance: card.balance,
        new_balance: newBalance,
        test: true,
      });
    }

    // Live mode
    if (!card.kripiCardId) {
      return NextResponse.json(
        { error: { code: "card_pending", message: "Card is still being provisioned." } },
        { status: 400 }
      );
    }

    try {
      const result = await fundCard({
        card_id: card.kripiCardId,
        amount,
      });

      // Deduct from wallet
      const newWalletBalance = ctx.apiKey.walletBalance - totalCost;

      await prisma.$transaction([
        prisma.apiCard.update({
          where: { id: card.id },
          data: { balance: result.new_balance },
        }),
        prisma.apiKey.update({
          where: { id: ctx.apiKey.id },
          data: {
            walletBalance: newWalletBalance,
            totalCharged: { increment: totalCost },
            totalVolume: { increment: amount },
          },
        }),
        prisma.apiTransaction.create({
          data: {
            apiKeyId: ctx.apiKey.id,
            type: "CARD_FUND",
            amount: totalCost,
            balanceAfter: newWalletBalance,
            description: `Fund card $${amount} + fee $${(fee + markup).toFixed(2)}`,
            reference: card.kripiCardId,
          },
        }),
      ]);

      // Webhook
      if (ctx.apiKey.webhookUrl) {
        sendWebhook(ctx.apiKey.webhookUrl, ctx.apiKey.webhookSecret, "card.funded", {
          id: card.id,
          card_id: card.kripiCardId,
          amount_funded: amount,
          new_balance: result.new_balance,
        });
      }

      return NextResponse.json({
        id: card.id,
        card_id: card.kripiCardId,
        amount_funded: amount,
        fee,
        previous_balance: card.balance,
        new_balance: result.new_balance,
        test: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Funding failed";
      return NextResponse.json(
        { error: { code: "funding_failed", message } },
        { status: 502 }
      );
    }
  });
}
