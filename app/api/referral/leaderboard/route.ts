import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/referral/leaderboard — Public leaderboard of top referrers
export async function GET() {
  try {
    // Get top 50 referrers by points
    const topReferrers = await prisma.user.findMany({
      where: {
        referralCardCount: { gt: 0 },
      },
      orderBy: [
        { referralPoints: "desc" },
        { referralCardCount: "desc" },
      ],
      take: 50,
      select: {
        id: true,
        name: true,
        referralPoints: true,
        referralEarnings: true,
        referralCardCount: true,
        createdAt: true,
      },
    })

    // Mask names for privacy — show first name + last initial
    const leaderboard = topReferrers.map((u, index) => {
      const nameParts = u.name.trim().split(" ")
      let displayName = nameParts[0]
      if (nameParts.length > 1) {
        displayName += " " + nameParts[nameParts.length - 1][0] + "."
      }

      return {
        rank: index + 1,
        displayName,
        points: u.referralPoints,
        earnings: u.referralEarnings,
        cardsReferred: u.referralCardCount,
        joinedAt: u.createdAt.toISOString(),
      }
    })

    // Get total stats
    const totalStats = await prisma.user.aggregate({
      _sum: {
        referralPoints: true,
        referralEarnings: true,
        referralCardCount: true,
      },
      where: {
        referralCardCount: { gt: 0 },
      },
    })

    const activeReferrers = await prisma.user.count({
      where: { referralCardCount: { gt: 0 } },
    })

    return NextResponse.json({
      success: true,
      leaderboard,
      totalStats: {
        totalReferrers: activeReferrers,
        totalPointsDistributed: totalStats._sum.referralPoints || 0,
        totalEarningsDistributed: totalStats._sum.referralEarnings || 0,
        totalCardsReferred: totalStats._sum.referralCardCount || 0,
      },
    })
  } catch (error) {
    console.error("[Leaderboard] Error:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
