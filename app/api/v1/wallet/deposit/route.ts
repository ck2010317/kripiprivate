import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/v1/wallet/deposit — Credit wallet after verified Solana payment
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Login required." } },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { payment_id, amount } = body;

  if (!payment_id) {
    return NextResponse.json(
      { error: { code: "missing_payment_id", message: "payment_id is required." } },
      { status: 400 }
    );
  }

  // Verify payment exists, belongs to user, and is verified/completed
  const payment = await prisma.payment.findUnique({
    where: { id: payment_id },
  });

  if (!payment) {
    return NextResponse.json(
      { error: { code: "payment_not_found", message: "Payment not found." } },
      { status: 404 }
    );
  }

  if (payment.userId !== user.id) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Payment does not belong to you." } },
      { status: 403 }
    );
  }

  if (payment.status !== "VERIFIED" && payment.status !== "COMPLETED") {
    return NextResponse.json(
      { error: { code: "payment_not_verified", message: `Payment status is '${payment.status}'. Must be VERIFIED or COMPLETED.` } },
      { status: 400 }
    );
  }

  // Find the user's active API key to credit
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      isTest: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!apiKey) {
    return NextResponse.json(
      { error: { code: "no_api_key", message: "You need an active live API key before depositing funds. Buy a package first." } },
      { status: 400 }
    );
  }

  // Use the payment's USD amount
  const depositAmount = amount || payment.amountUsd;

  // Use a transaction to atomically credit the wallet
  const result = await prisma.$transaction(async (tx) => {
    // Update API key wallet balance
    const updatedKey = await tx.apiKey.update({
      where: { id: apiKey.id },
      data: {
        walletBalance: { increment: depositAmount },
        totalDeposited: { increment: depositAmount },
      },
    });

    // Create transaction record
    const apiTx = await tx.apiTransaction.create({
      data: {
        apiKeyId: apiKey.id,
        type: "DEPOSIT",
        amount: depositAmount,
        balanceAfter: updatedKey.walletBalance,
        description: `Deposit $${depositAmount.toFixed(2)} via Solana payment`,
        reference: payment.txSignature || payment.id,
      },
    });

    // Mark payment as completed
    await tx.payment.update({
      where: { id: payment_id },
      data: { status: "COMPLETED" },
    });

    return { updatedKey, apiTx };
  });

  return NextResponse.json({
    success: true,
    wallet: {
      balance: result.updatedKey.walletBalance,
      total_deposited: result.updatedKey.totalDeposited,
      total_charged: result.updatedKey.totalCharged,
    },
    transaction: {
      id: result.apiTx.id,
      type: "deposit",
      amount: depositAmount,
      balance_after: result.apiTx.balanceAfter,
      description: result.apiTx.description,
    },
    message: `Successfully deposited $${depositAmount.toFixed(2)} to your wallet.`,
  });
}
