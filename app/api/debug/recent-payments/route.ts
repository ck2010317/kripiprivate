import { type NextRequest, NextResponse } from "next/server"
import { checkRecentPayments } from "@/lib/solana-payment"

// Debug endpoint to see recent payments
export async function GET(request: NextRequest) {
  try {
    console.log("[Debug] Getting recent payments...")
    const recentPayments = await checkRecentPayments()
    
    console.log(`[Debug] Found ${recentPayments.length} payments`)
    recentPayments.forEach((p) => {
      console.log(`[Debug] - ${p.signature}: ${p.amount} SOL from ${p.sender}`)
    })

    return NextResponse.json({
      success: true,
      count: recentPayments.length,
      payments: recentPayments,
    })
  } catch (error) {
    console.error("[Debug] Error:", error)
    return NextResponse.json(
      { error: "Failed to get recent payments", details: String(error) },
      { status: 500 }
    )
  }
}
