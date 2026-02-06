import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter required" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        cards: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: `No user found with email: ${email}` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      cards: user.cards,
      totalCards: user.cards.length,
    })
  } catch (error) {
    console.error("[Cards By Email] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch cards by email" },
      { status: 500 }
    )
  }
}
