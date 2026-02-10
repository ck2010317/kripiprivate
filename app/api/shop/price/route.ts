import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } }
    )
    const data = await response.json()
    const solPrice = data.solana?.usd || 100

    return NextResponse.json({ success: true, solPrice })
  } catch {
    return NextResponse.json({ success: true, solPrice: 100 })
  }
}
