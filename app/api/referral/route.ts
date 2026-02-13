import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import crypto from "crypto"

// Generate a short, readable referral code
function generateReferralCode(): string {
  return "PP" + crypto.randomBytes(4).toString("hex").toUpperCase()
}

// GET /api/referral — Get current user's referral info, code, stats, and recent referrals
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        referralCode: true,
        referralPoints: true,
        referralEarnings: true,
        referralCardCount: true,
        referredById: true,
      },
    })

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Lazily generate referral code for existing users who don't have one
    if (!fullUser.referralCode) {
      let code = generateReferralCode()
      // Ensure uniqueness
      let attempts = 0
      while (attempts < 10) {
        const exists = await prisma.user.findUnique({ where: { referralCode: code } })
        if (!exists) break
        code = generateReferralCode()
        attempts++
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode: code },
      })
      fullUser = { ...fullUser, referralCode: code }
    }

    // Get recent referral logs
    const recentReferrals = await prisma.referralLog.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        referredEmail: true,
        rewardAmount: true,
        points: true,
        status: true,
        createdAt: true,
      },
    })

    // Mask emails for privacy (show first 2 chars + domain)
    const maskedReferrals = recentReferrals.map((r) => {
      const [local, domain] = r.referredEmail.split("@")
      const masked = local.slice(0, 2) + "***@" + domain
      return { ...r, referredEmail: masked }
    })

    return NextResponse.json({
      success: true,
      referralCode: fullUser.referralCode,
      referralLink: `https://privatepay.site?ref=${fullUser.referralCode}`,
      stats: {
        totalPoints: fullUser.referralPoints,
        totalEarnings: fullUser.referralEarnings,
        totalCardsReferred: fullUser.referralCardCount,
      },
      wasReferred: !!fullUser.referredById,
      recentReferrals: maskedReferrals,
    })
  } catch (error) {
    console.error("[Referral] Error:", error)
    return NextResponse.json({ error: "Failed to fetch referral info" }, { status: 500 })
  }
}
