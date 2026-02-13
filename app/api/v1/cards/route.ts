import { NextRequest, NextResponse } from "next/server";
import { withApiKey, sendWebhook, generateTestCard } from "@/lib/api-middleware";
import { prisma } from "@/lib/prisma";
import { createCard as kripiCreateCard } from "@/lib/kripicard-client";

// POST /api/v1/cards — Issue a new virtual card
export async function POST(req: NextRequest) {
  return withApiKey(req, async (request, ctx) => {
    const body = await request.json();
    const { amount, name_on_card, email, external_id, metadata } = body;

    // Validation
    if (!amount || typeof amount !== "number" || amount < 10) {
      return NextResponse.json(
        { error: { code: "invalid_amount", message: "amount must be at least $10." } },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: { code: "amount_too_large", message: "Maximum card amount is $10,000." } },
        { status: 400 }
      );
    }

    if (!name_on_card || typeof name_on_card !== "string" || name_on_card.trim().length < 2) {
      return NextResponse.json(
        { error: { code: "invalid_name", message: "name_on_card is required (min 2 characters)." } },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: { code: "invalid_email", message: "A valid email address is required." } },
        { status: 400 }
      );
    }

    // Calculate fees
    const plan = ctx.apiKey.plan;
    const markup = amount * (plan.markupPercent / 100);
    const totalCardLoad = amount; // Customer gets the full amount on card
    const fee = plan.cardIssueFee + markup + plan.cardFundFee;
    const totalCost = amount + fee; // Card load + all fees

    // Check wallet balance (skip for test mode)
    if (!ctx.apiKey.isTest) {
      if (ctx.apiKey.walletBalance < totalCost) {
        return NextResponse.json(
          {
            error: {
              code: "insufficient_balance",
              message: `Insufficient PrivatePay wallet balance. Required: $${totalCost.toFixed(2)} (card: $${amount}, fees: $${fee.toFixed(2)}). Available: $${ctx.apiKey.walletBalance.toFixed(2)}. Deposit funds first.`,
            },
          },
          { status: 402 }
        );
      }
    }

    // Test mode: return fake card
    if (ctx.apiKey.isTest) {
      const testCard = generateTestCard();
      testCard.name_on_card = name_on_card.toUpperCase().trim();
      testCard.balance = amount;

      const apiCard = await prisma.apiCard.create({
        data: {
          apiKeyId: ctx.apiKey.id,
          kripiCardId: testCard.card_id,
          cardNumber: testCard.card_number,
          expiryDate: testCard.expiry_date,
          cvv: testCard.cvv,
          nameOnCard: testCard.name_on_card,
          balance: amount,
          status: "ACTIVE",
          externalId: external_id || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      return NextResponse.json({
        id: apiCard.id,
        card_id: testCard.card_id,
        card_number: testCard.card_number,
        expiry_date: testCard.expiry_date,
        cvv: testCard.cvv,
        name_on_card: testCard.name_on_card,
        balance: amount,
        status: "active",
        external_id: external_id || null,
        fee: fee,
        test: true,
        created_at: apiCard.createdAt.toISOString(),
      }, { status: 201 });
    }

    // Live mode: call KripiCard API
    try {
      const result = await kripiCreateCard({
        amount: totalCardLoad,
        name_on_card: name_on_card.toUpperCase().trim(),
        email: email.toLowerCase().trim(),
      });

      // Deduct from developer's wallet balance
      const newBalance = ctx.apiKey.walletBalance - totalCost;
      
      // Save card + update wallet + log transactions in one go
      const [apiCard] = await prisma.$transaction([
        prisma.apiCard.create({
          data: {
            apiKeyId: ctx.apiKey.id,
            kripiCardId: result.card_id,
            cardNumber: result.card_number,
            expiryDate: result.expiry_date,
            cvv: result.cvv,
            nameOnCard: name_on_card.toUpperCase().trim(),
            balance: result.balance,
            status: "ACTIVE",
            externalId: external_id || null,
            metadata: metadata ? JSON.stringify(metadata) : null,
          },
        }),
        prisma.apiKey.update({
          where: { id: ctx.apiKey.id },
          data: {
            walletBalance: newBalance,
            totalCharged: { increment: totalCost },
            totalCards: { increment: 1 },
            totalVolume: { increment: amount },
          },
        }),
        prisma.apiTransaction.create({
          data: {
            apiKeyId: ctx.apiKey.id,
            type: "CARD_LOAD",
            amount: amount,
            balanceAfter: newBalance + fee,
            description: `Card load: $${amount} for ${name_on_card.toUpperCase().trim()}`,
            reference: result.card_id,
          },
        }),
        prisma.apiTransaction.create({
          data: {
            apiKeyId: ctx.apiKey.id,
            type: "CARD_ISSUE",
            amount: fee,
            balanceAfter: newBalance,
            description: `Card issuance fee: $${plan.cardIssueFee} + ${plan.markupPercent}% markup ($${markup.toFixed(2)}) + $${plan.cardFundFee} funding`,
            reference: result.card_id,
          },
        }),
      ]);

      // Send webhook if configured
      if (ctx.apiKey.webhookUrl) {
        sendWebhook(ctx.apiKey.webhookUrl, ctx.apiKey.webhookSecret, "card.created", {
          id: apiCard.id,
          card_id: result.card_id,
          balance: result.balance,
          status: "active",
          external_id: external_id || null,
        });
      }

      return NextResponse.json({
        id: apiCard.id,
        card_id: result.card_id,
        card_number: result.card_number,
        expiry_date: result.expiry_date,
        cvv: result.cvv,
        name_on_card: name_on_card.toUpperCase().trim(),
        balance: result.balance,
        status: "active",
        external_id: external_id || null,
        fee: fee,
        test: false,
        created_at: apiCard.createdAt.toISOString(),
      }, { status: 201 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Card creation failed";
      console.error("[PrivatePay API] Card creation error:", message);
      return NextResponse.json(
        { error: { code: "card_creation_failed", message } },
        { status: 502 }
      );
    }
  });
}

// GET /api/v1/cards — List all cards for this API key
export async function GET(req: NextRequest) {
  return withApiKey(req, async (request, ctx) => {
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
    const status = request.nextUrl.searchParams.get("status");

    const where: Record<string, unknown> = { apiKeyId: ctx.apiKey.id };
    if (status) {
      where.status = status.toUpperCase();
    }

    const [cards, total] = await Promise.all([
      prisma.apiCard.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.apiCard.count({ where }),
    ]);

    return NextResponse.json({
      data: cards.map((c: typeof cards[number]) => ({
        id: c.id,
        card_id: c.kripiCardId,
        card_number: c.cardNumber,
        expiry_date: c.expiryDate,
        cvv: c.cvv,
        name_on_card: c.nameOnCard,
        balance: c.balance,
        status: c.status.toLowerCase(),
        external_id: c.externalId,
        metadata: c.metadata ? JSON.parse(c.metadata) : null,
        created_at: c.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    });
  });
}
