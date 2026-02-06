import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    const supabase = await getSupabaseServer()

    const { data: queuedCards } = await supabase
      .from("deposit_requests")
      .select("*")
      .eq("card_issue_status", "pending_balance")
      .order("created_at", { ascending: true })

    return NextResponse.json({ queuedCards: queuedCards || [] })
  } catch (error) {
    console.error("[v0] Failed to fetch queued cards:", error)
    return NextResponse.json({ error: "Failed to fetch queued cards" }, { status: 500 })
  }
}
