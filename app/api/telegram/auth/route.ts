import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { sendTelegramMessage } from "@/lib/telegram"

// POST: Link Telegram account to logged-in PrivatePay user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Not logged in. Please log in to PrivatePay first." }, { status: 401 })
    }

    const { token } = await request.json()
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    // Find the auth token
    const authToken = await prisma.telegramAuthToken.findUnique({
      where: { token },
    })

    if (!authToken) {
      return NextResponse.json({ error: "Invalid or expired link. Please request a new one from the bot." }, { status: 400 })
    }

    if (authToken.used) {
      return NextResponse.json({ error: "This link has already been used." }, { status: 400 })
    }

    if (authToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "This link has expired. Send /start to the bot to get a new one." }, { status: 400 })
    }

    // Check if this Telegram account is already linked to another user
    const existingLink = await prisma.telegramLink.findUnique({
      where: { telegramId: authToken.telegramId },
    })

    if (existingLink && existingLink.userId !== user.id) {
      return NextResponse.json({
        error: "This Telegram account is already linked to another PrivatePay account. Disconnect it first from the bot with /disconnect.",
      }, { status: 409 })
    }

    // Check if this PrivatePay user already has a linked Telegram
    const existingUserLink = await prisma.telegramLink.findUnique({
      where: { userId: user.id },
    })

    if (existingUserLink) {
      // Update existing link to new Telegram account
      await prisma.telegramLink.update({
        where: { id: existingUserLink.id },
        data: {
          telegramId: authToken.telegramId,
          isActive: true,
        },
      })
    } else {
      // Create new link
      await prisma.telegramLink.create({
        data: {
          telegramId: authToken.telegramId,
          userId: user.id,
        },
      })
    }

    // Mark token as used
    await prisma.telegramAuthToken.update({
      where: { id: authToken.id },
      data: { used: true },
    })

    // Notify user on Telegram
    await sendTelegramMessage(authToken.telegramId,
      `✅ *Account Connected!*\n\n` +
      `You're now linked to *${user.name}* (${user.email}).\n\n` +
      `Type /help to see what I can do for you!`
    )

    return NextResponse.json({
      success: true,
      message: "Telegram account linked successfully!",
    })
  } catch (error) {
    console.error("[Telegram Auth] Error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

// GET: Check link status for current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    const link = await prisma.telegramLink.findUnique({
      where: { userId: user.id },
    })

    return NextResponse.json({
      linked: !!link,
      telegramUsername: link?.telegramUsername || null,
      linkedAt: link?.createdAt || null,
    })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

// DELETE: Disconnect Telegram from web dashboard
export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 })
    }

    const link = await prisma.telegramLink.findUnique({
      where: { userId: user.id },
    })

    if (!link) {
      return NextResponse.json({ error: "No Telegram account linked" }, { status: 404 })
    }

    // Notify on Telegram before deleting
    await sendTelegramMessage(link.telegramId,
      `🔌 Your PrivatePay account has been disconnected from the web dashboard.\n\n` +
      `Send /start to reconnect.`
    )

    await prisma.telegramLink.delete({ where: { id: link.id } })

    return NextResponse.json({ success: true, message: "Telegram disconnected" })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
