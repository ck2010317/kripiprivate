import { NextRequest, NextResponse } from "next/server"
import { createCard as createKripiCard } from "@/lib/kripicard-client"

export async function POST(request: NextRequest) {
  try {
    const { amount, name, email } = await request.json()

    console.log("[Test] Testing KripiCard API with:", { amount, name, email })

    const result = await createKripiCard({
      amount: amount || 15,
      name_on_card: name || "TEST USER",
      email: email || "test@example.com",
      bankBin: "49387520",
    })

    console.log("[Test] Success! Result:", result)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("[Test] Error:", error)
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    const stack = error instanceof Error ? error.stack : ""

    return NextResponse.json(
      {
        success: false,
        error: message,
        stack,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
