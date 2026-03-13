import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCardDetails } from "@/lib/kripicard-client"

export const maxDuration = 60
export const dynamic = "force-dynamic"

// GET /api/cron/sync-balances — Sync all card balances from KripiCard
// Called by Vercel cron every 5 minutes
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allCards = await prisma.card.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        cardNumber: true,
        kripiCardId: true,
        balance: true,
        status: true,
      },
    })

    // Only sync cards that have real card numbers assigned
    const cards = allCards.filter(
      (c) => c.cardNumber && c.cardNumber.length > 4 && c.kripiCardId && c.kripiCardId.length > 0
    )

    const results: { id: string; old: number; new_bal: number; synced: boolean; error?: string }[] = []

    // Sync each card sequentially to avoid rate limiting
    for (const card of cards) {
      try {
        const last4 = card.cardNumber.slice(-4)
        const kripiDetails = await getCardDetails(last4)

        if (kripiDetails.balance !== card.balance) {
          await prisma.card.update({
            where: { id: card.id },
            data: { balance: kripiDetails.balance },
          })
          results.push({ id: card.id, old: card.balance, new_bal: kripiDetails.balance, synced: true })
        } else {
          results.push({ id: card.id, old: card.balance, new_bal: card.balance, synced: false })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[Cron] Failed to sync card ${card.id}:`, msg)
        results.push({ id: card.id, old: card.balance, new_bal: card.balance, synced: false, error: msg })
      }
    }

    const synced = results.filter((r) => r.synced).length
    console.log(`[Cron] Balance sync complete: ${synced}/${cards.length} cards updated`)

    return NextResponse.json({
      success: true,
      total: cards.length,
      synced,
      results,
    })
  } catch (err) {
    console.error("[Cron] Sync error:", err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
