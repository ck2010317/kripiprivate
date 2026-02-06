import { NextResponse } from "next/server"

export async function GET() {
  try {
    // CoinGecko is free and reliable for SOL price
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", {
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch price" }, { status: 500 })
    }

    const data = await response.json()
    const solPrice = data.solana.usd

    return NextResponse.json({
      solPrice,
      source: "coingecko",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error fetching SOL price:", error)
    return NextResponse.json({ error: "Failed to fetch SOL price" }, { status: 500 })
  }
}
