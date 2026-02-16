import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticatePersonalToken,
  checkPersonalRateLimit,
  hasScope,
} from "@/lib/personal-auth";

// GET /api/openclaw/me/payments — Get payment history for the authenticated user
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

    if (!hasScope(ctx, "read:payments")) {
      return NextResponse.json(
        { error: "Token missing scope: read:payments" },
        { status: 403 }
      );
    }

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "20"), 50);

    const statusFilter = req.nextUrl.searchParams.get("status");

    const where: Record<string, unknown> = { userId: ctx.userId };
    if (statusFilter) {
      where.status = statusFilter.toUpperCase();
    }

    // CRITICAL: Only fetch payments for THIS user
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        amountUsd: true,
        amountSol: true,
        solPriceAtTime: true,
        txSignature: true,
        status: true,
        cardType: true,
        nameOnCard: true,
        topupAmount: true,
        topupFee: true,
        createdAt: true,
      },
    });

    // Aggregate stats
    const allPayments = await prisma.payment.findMany({
      where: { userId: ctx.userId },
      select: { amountUsd: true, status: true },
    });

    const totalSpent = allPayments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amountUsd, 0);

    const totalPending = allPayments
      .filter((p) => p.status === "PENDING" || p.status === "CONFIRMING")
      .reduce((sum, p) => sum + p.amountUsd, 0);

    return NextResponse.json({
      success: true,
      summary: {
        total_payments: allPayments.length,
        total_spent_usd: Math.round(totalSpent * 100) / 100,
        total_pending_usd: Math.round(totalPending * 100) / 100,
        completed: allPayments.filter((p) => p.status === "COMPLETED").length,
        pending: allPayments.filter(
          (p) => p.status === "PENDING" || p.status === "CONFIRMING"
        ).length,
      },
      payments: payments.map((p) => ({
        id: p.id,
        amount_usd: p.amountUsd,
        amount_sol: p.amountSol,
        sol_price: p.solPriceAtTime,
        tx_signature: p.txSignature,
        status: p.status,
        type: p.cardType,
        name_on_card: p.nameOnCard,
        topup_amount: p.topupAmount,
        topup_fee: p.topupFee,
        created_at: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("[OpenClaw Payments] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
