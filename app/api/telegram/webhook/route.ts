import { type NextRequest, NextResponse } from "next/server"
import { handleTelegramMessage, sendTelegramMessage } from "@/lib/telegram"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""

// Telegram sends updates via POST
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Telegram (optional: check secret token header)
    const update = await request.json()

    // Handle regular messages
    if (update.message) {
      const msg = update.message
      const chatId = String(msg.chat.id)
      const telegramId = String(msg.from.id)
      const text = msg.text || ""
      const firstName = msg.from.first_name || undefined
      const username = msg.from.username || undefined

      if (text) {
        await handleTelegramMessage(telegramId, chatId, text, firstName, username)
      }
    }

    // Handle callback queries (inline button presses)
    if (update.callback_query) {
      const query = update.callback_query
      const chatId = String(query.message.chat.id)
      const data = query.data

      if (data === "copy_wallet") {
        const PAYMENT_WALLET = process.env.PAYMENT_WALLET || "F4ZYTm8goUhKVQ8W5LmsrkrpsVoLPGtyykGnYau8676t"
        await sendTelegramMessage(chatId,
          `📋 Payment wallet address:\n\n\`${PAYMENT_WALLET}\`\n\nCopy the address above and send your SOL payment.`
        )

        // Answer callback to remove loading state
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: query.id, text: "Wallet address sent!" }),
        })
      }
    }

    // Always return 200 to Telegram
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error)
    // Always return 200 so Telegram doesn't retry
    return NextResponse.json({ ok: true })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Telegram webhook endpoint",
    botConnected: !!BOT_TOKEN,
  })
}
