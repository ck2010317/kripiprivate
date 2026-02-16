import { type NextRequest, NextResponse } from "next/server"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

// Set or check webhook status
export async function POST(request: NextRequest) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 })
  }

  const { action, url } = await request.json()

  if (action === "set") {
    // Set webhook
    const webhookUrl = url || "https://privatepay.site/api/telegram/webhook"
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      }),
    })
    const data = await res.json()
    return NextResponse.json({ action: "setWebhook", webhookUrl, result: data })
  }

  if (action === "delete") {
    const res = await fetch(`${TELEGRAM_API}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: true }),
    })
    const data = await res.json()
    return NextResponse.json({ action: "deleteWebhook", result: data })
  }

  if (action === "info") {
    const res = await fetch(`${TELEGRAM_API}/getWebhookInfo`)
    const data = await res.json()
    return NextResponse.json({ action: "getWebhookInfo", result: data })
  }

  // Set bot commands menu
  if (action === "setCommands") {
    const res = await fetch(`${TELEGRAM_API}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Connect your PrivatePay account" },
          { command: "help", description: "Show all commands" },
          { command: "balance", description: "Check card balances" },
          { command: "cards", description: "Show card details" },
          { command: "transactions", description: "View recent transactions" },
          { command: "disconnect", description: "Disconnect Telegram" },
        ],
      }),
    })
    const data = await res.json()
    return NextResponse.json({ action: "setMyCommands", result: data })
  }

  return NextResponse.json({ error: "Invalid action. Use: set, delete, info, setCommands" }, { status: 400 })
}

// Quick check
export async function GET() {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 })
  }

  // Get bot info
  const res = await fetch(`${TELEGRAM_API}/getMe`)
  const data = await res.json()

  // Get webhook info
  const whRes = await fetch(`${TELEGRAM_API}/getWebhookInfo`)
  const whData = await whRes.json()

  return NextResponse.json({
    bot: data.result,
    webhook: whData.result,
  })
}
