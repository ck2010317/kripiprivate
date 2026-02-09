import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/admin/stats - Returns live platform stats
export async function GET() {
  try {
    // Total cards created
    const totalCards = await prisma.card.count()

    // Cards by status
    const activeCards = await prisma.card.count({ where: { status: "ACTIVE" } })
    const frozenCards = await prisma.card.count({ where: { status: "FROZEN" } })
    const pendingCards = await prisma.card.count({ where: { status: "PENDING" } })

    // Total deposit volume (all completed payments - both card issuance and topups)
    const completedPayments = await prisma.payment.findMany({
      where: { status: "COMPLETED" },
      select: {
        amountUsd: true,
        amountSol: true,
        topupAmount: true,
        cardType: true,
        createdAt: true,
      },
    })

    const totalDepositVolumeUsd = completedPayments.reduce((sum, p) => sum + p.amountUsd, 0)
    const totalDepositVolumeSol = completedPayments.reduce((sum, p) => sum + p.amountSol, 0)

    // Card issuance volume vs topup volume
    const issuancePayments = completedPayments.filter(p => p.cardType === "issue")
    const topupPayments = completedPayments.filter(p => p.cardType === "topup")

    const issuanceVolumeUsd = issuancePayments.reduce((sum, p) => sum + p.amountUsd, 0)
    const topupVolumeUsd = topupPayments.reduce((sum, p) => sum + p.amountUsd, 0)

    // Total current balance across all cards
    const allCards = await prisma.card.findMany({
      select: { balance: true },
    })
    const totalCardBalance = allCards.reduce((sum, c) => sum + c.balance, 0)

    // Total users
    const totalUsers = await prisma.user.count()

    // Pending payments
    const pendingPayments = await prisma.payment.count({
      where: { status: { in: ["PENDING", "CONFIRMING"] } },
    })

    // Recent activity (last 10 completed payments)
    const recentPayments = await prisma.payment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amountUsd: true,
        amountSol: true,
        cardType: true,
        nameOnCard: true,
        createdAt: true,
        user: {
          select: { email: true, name: true },
        },
      },
    })

    // Today's stats
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const todayCards = await prisma.card.count({
      where: { createdAt: { gte: todayStart } },
    })

    const todayPayments = await prisma.payment.findMany({
      where: { 
        status: "COMPLETED",
        createdAt: { gte: todayStart },
      },
      select: { amountUsd: true },
    })
    const todayVolumeUsd = todayPayments.reduce((sum, p) => sum + p.amountUsd, 0)

    return NextResponse.json({
      success: true,
      stats: {
        totalCards,
        activeCards,
        frozenCards,
        pendingCards,
        totalUsers,
        totalDepositVolumeUsd,
        totalDepositVolumeSol,
        issuanceVolumeUsd,
        topupVolumeUsd,
        totalCardBalance,
        pendingPayments,
        todayCards,
        todayVolumeUsd,
        totalCompletedPayments: completedPayments.length,
        recentPayments,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Admin Stats] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
