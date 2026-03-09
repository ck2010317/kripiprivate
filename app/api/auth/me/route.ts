import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export const maxDuration = 5 // Vercel function timeout: 5 seconds max

export async function GET() {
  try {
    // Race between auth check and a 4-second timeout
    const user = await Promise.race([
      getCurrentUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ])

    return NextResponse.json({ user: user || null })
  } catch (error) {
    console.error("[Auth] Get user error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { user: null },
      { status: 200 }
    )
  }
}
