import { prisma } from "./prisma"
import { getCardDetails } from "./kripicard-client"
import { usdToSol } from "./solana-payment"
import crypto from "crypto"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://privatepay.site"
const PAYMENT_WALLET = process.env.PAYMENT_WALLET || "F4ZYTm8goUhKVQ8W5LmsrkrpsVoLPGtyykGnYau8676t"
const CARD_ISSUANCE_FEE = 30
const SERVICE_FEE_PERCENT = 0.03
const SERVICE_FEE_FLAT = 1

// ── Send message to Telegram user ──
export async function sendTelegramMessage(chatId: string, text: string, options?: {
  parseMode?: "Markdown" | "HTML"
  replyMarkup?: any
}) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode || "Markdown",
  }
  if (options?.replyMarkup) {
    body.reply_markup = JSON.stringify(options.replyMarkup)
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!data.ok) {
      console.error("[Telegram] sendMessage failed:", data)
    }
    return data
  } catch (err) {
    console.error("[Telegram] sendMessage error:", err)
  }
}

// ── Create one-time auth link ──
export async function createAuthToken(telegramId: string): Promise<string> {
  // Clean up old expired tokens for this user
  await prisma.telegramAuthToken.deleteMany({
    where: {
      telegramId,
      OR: [
        { expiresAt: { lt: new Date() } },
        { used: true },
      ],
    },
  })

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await prisma.telegramAuthToken.create({
    data: {
      token,
      telegramId,
      expiresAt,
    },
  })

  return `${SITE_URL}/telegram/auth?token=${token}`
}

// ── Intent detection (same logic as /api/chat) ──
function detectIntent(message: string): { intent: string; params: Record<string, any> } {
  const msg = message.toLowerCase().trim()

  if (msg.match(/\/start/)) return { intent: "start", params: {} }
  if (msg.match(/\/help/)) return { intent: "help", params: {} }
  if (msg.match(/\/balance/)) return { intent: "balance", params: {} }
  if (msg.match(/\/cards/)) return { intent: "card_details", params: {} }
  if (msg.match(/\/transactions/)) return { intent: "transactions", params: {} }
  if (msg.match(/\/disconnect/)) return { intent: "disconnect", params: {} }

  if (msg.match(/create|issue|new card|get.*card|make.*card|want.*card|need.*card|generate.*card|open.*card/)) {
    const amountMatch = msg.match(/\$?(\d+(?:\.\d+)?)\s*(?:dollar|usd|card|\b)/i)
    const nameMatch = msg.match(/(?:name|named|for)\s+([a-zA-Z\s]+)/i)
    return {
      intent: "create_card",
      params: {
        amount: amountMatch ? parseFloat(amountMatch[1]) : null,
        name: nameMatch ? nameMatch[1].trim().toUpperCase() : null,
      },
    }
  }

  if (msg.match(/top\s*up|fund|add.*money|add.*funds|load|reload|recharge|refill/)) {
    const amountMatch = msg.match(/\$?(\d+(?:\.\d+)?)/i)
    return { intent: "topup", params: { amount: amountMatch ? parseFloat(amountMatch[1]) : null } }
  }

  if (msg.match(/balance|how much|money.*left|funds.*left|remaining|what.*have/)) {
    return { intent: "balance", params: {} }
  }

  if (msg.match(/unfreeze|unlock|unblock|enable|resume|activate/)) {
    return { intent: "unfreeze", params: {} }
  }

  if (msg.match(/\bfreeze\b|lock|block|disable|pause/)) {
    return { intent: "freeze", params: {} }
  }

  if (msg.match(/transaction|history|spent|spending|purchases|activity|statement/)) {
    return { intent: "transactions", params: {} }
  }

  if (msg.match(/card.*detail|card.*info|card.*number|show.*card|my.*card|cvv|expir/)) {
    return { intent: "card_details", params: {} }
  }

  if (msg.match(/fee|price|pricing|cost|how much.*cost|charge/)) {
    return { intent: "fees", params: {} }
  }

  if (msg.match(/help|what can you|how.*work|guide|commands/)) {
    return { intent: "help", params: {} }
  }

  if (msg.match(/^(hi|hello|hey|sup|yo|gm|good morning|good evening)\b/)) {
    return { intent: "greeting", params: {} }
  }

  if (msg.match(/thank|thanks|thx|appreciate|cheers/)) {
    return { intent: "thanks", params: {} }
  }

  return { intent: "unknown", params: {} }
}

// ── Parse number selection from follow-up ──
function parseNaturalNumber(text: string): number {
  const t = text.toLowerCase().trim()
  if (/^[1-9]\d*$/.test(t)) return parseInt(t)
  if (/\b(1st|first|one|1)\b/.test(t)) return 1
  if (/\b(2nd|second|two|2)\b/.test(t)) return 2
  if (/\b(3rd|third|three|3)\b/.test(t)) return 3
  if (/\b(4th|fourth|four|4)\b/.test(t)) return 4
  if (/\b(5th|fifth|five|5)\b/.test(t)) return 5
  return -1
}

// ── Main handler for Telegram messages ──
export async function handleTelegramMessage(
  telegramId: string,
  chatId: string,
  message: string,
  firstName?: string,
  username?: string
) {
  // 1. Check if user is linked
  const link = await prisma.telegramLink.findUnique({
    where: { telegramId },
    include: { user: true },
  })

  // 2. If /start or not linked, handle linking
  if (message.trim() === "/start" || (!link && message !== "/help")) {
    if (link && link.isActive) {
      await sendTelegramMessage(chatId,
        `✅ You're already connected as *${link.user.name}* (${link.user.email})!\n\n` +
        `Type /help to see what I can do.`
      )
      return
    }

    // Create auth link
    const authUrl = await createAuthToken(telegramId)

    await sendTelegramMessage(chatId,
      `👋 Welcome to *PrivatePay Bot*!\n\n` +
      `I can help you manage your non-KYC virtual cards right from Telegram:\n` +
      `💳 Check balances\n` +
      `💰 Top up cards\n` +
      `❄️ Freeze/unfreeze cards\n` +
      `📜 View transactions\n\n` +
      `🔗 *First, connect your PrivatePay account:*\n` +
      `[Click here to connect](${authUrl})\n\n` +
      `⏳ This link expires in 10 minutes.`,
      {
        replyMarkup: {
          inline_keyboard: [[
            { text: "🔗 Connect Account", url: authUrl }
          ]]
        }
      }
    )
    return
  }

  // If not linked and not /start
  if (!link || !link.isActive) {
    const authUrl = await createAuthToken(telegramId)
    await sendTelegramMessage(chatId,
      `You need to connect your PrivatePay account first.\n\n` +
      `[Click here to connect](${authUrl})`,
      {
        replyMarkup: {
          inline_keyboard: [[
            { text: "🔗 Connect Account", url: authUrl }
          ]]
        }
      }
    )
    return
  }

  const userId = link.userId
  const user = link.user

  // ── Handle /disconnect ──
  if (message.trim() === "/disconnect") {
    await prisma.telegramLink.delete({ where: { id: link.id } })
    await sendTelegramMessage(chatId,
      `✅ Account disconnected successfully.\n\n` +
      `Your PrivatePay account is no longer linked to this Telegram. ` +
      `Send /start to reconnect.`
    )
    return
  }

  // ── Check for follow-up context ──
  const lastAction = link.lastAction
  const lastActionData = link.lastActionData ? JSON.parse(link.lastActionData) : null

  const { intent, params } = detectIntent(message)

  // Fetch user's cards
  const userCards = await prisma.card.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  // Helper: clear context
  const clearContext = async () => {
    await prisma.telegramLink.update({
      where: { id: link.id },
      data: { lastAction: null, lastActionData: null },
    })
  }

  // Helper: save context
  const saveContext = async (action: string, data: any) => {
    await prisma.telegramLink.update({
      where: { id: link.id },
      data: { lastAction: action, lastActionData: JSON.stringify(data) },
    })
  }

  // Helper: extract amount
  const extractAmount = (): number | null => {
    const m = message.match(/\$?\s*(\d+(?:\.\d+)?)/)
    return m ? parseFloat(m[1]) : null
  }

  // Helper: find card from selection
  const findCardFromSelection = (cards: any[]) => {
    const num = parseNaturalNumber(message)
    if (num > 0 && num <= cards.length) return cards[num - 1]
    const last4Match = message.match(/(\d{4})/)?.[1]
    if (last4Match) return cards.find((c: any) => c.last4 === last4Match)
    return null
  }

  // ── Handle follow-ups ──
  if (lastAction) {
    const contextActions = [
      "select_card_freeze", "select_card_unfreeze", "select_card_topup",
      "need_name", "need_amount_create", "need_amount_topup",
    ]

    if (contextActions.includes(lastAction)) {
      // NEED AMOUNT FOR CARD CREATION
      if (lastAction === "need_amount_create") {
        const amount = extractAmount()
        if (amount && amount >= 10) {
          const name = user.name?.toUpperCase() || null
          if (!name) {
            await saveContext("need_name", { amount })
            await sendTelegramMessage(chatId,
              `Got it — $${amount} card! What name do you want on the card?\n\nJust type the name, like "JOHN DOE".`
            )
            return
          }
          await clearContext()
          await handleCreateCardPayment(chatId, userId, name, amount)
          return
        }
        if (amount && amount < 10) {
          await sendTelegramMessage(chatId, `Minimum is $10. How much do you want to load?`)
          return
        }
        await sendTelegramMessage(chatId, `Just tell me the dollar amount, like "$50" or "100".`)
        return
      }

      // NEED AMOUNT FOR TOPUP
      if (lastAction === "need_amount_topup") {
        const amount = extractAmount()
        if (amount && amount >= 10) {
          if (userCards.length > 1) {
            const cardList = userCards.map((c, i) =>
              `${i + 1}. •••• ${c.cardNumber.slice(-4)} — ${c.nameOnCard} — $${c.balance.toFixed(2)}`
            ).join("\n")
            await saveContext("select_card_topup", {
              amount,
              cards: userCards.map(c => ({ id: c.id, last4: c.cardNumber.slice(-4), name: c.nameOnCard, balance: c.balance }))
            })
            await sendTelegramMessage(chatId, `Which card do you want to top up with $${amount}?\n\n${cardList}`)
            return
          }
          await clearContext()
          await handleTopupPayment(chatId, userId, userCards[0], amount)
          return
        }
        if (amount && amount < 10) {
          await sendTelegramMessage(chatId, `Minimum top-up is $10. How much?`)
          return
        }
        await sendTelegramMessage(chatId, `Just tell me the dollar amount, like "$50" or "100".`)
        return
      }

      // NEED NAME
      if (lastAction === "need_name" && lastActionData?.amount) {
        const name = message.replace(/(?:name|named|for|it|call|put)\s*/gi, "").trim().toUpperCase() || message.trim().toUpperCase()
        if (name.length >= 2 && name.length <= 30) {
          await clearContext()
          await handleCreateCardPayment(chatId, userId, name, lastActionData.amount)
          return
        }
        await sendTelegramMessage(chatId, `Just type the name you want on the card, like "JOHN DOE".`)
        return
      }

      // SELECT CARD FOR FREEZE
      if (lastAction === "select_card_freeze") {
        const card = findCardFromSelection(lastActionData?.cards || [])
        if (card) {
          await clearContext()
          await handleFreezeCard(chatId, userId, card.id, card.last4)
          return
        }
        await sendTelegramMessage(chatId, `Please pick a card — reply with a number (e.g. "1").`)
        return
      }

      // SELECT CARD FOR UNFREEZE
      if (lastAction === "select_card_unfreeze") {
        const card = findCardFromSelection(lastActionData?.cards || [])
        if (card) {
          await clearContext()
          await handleUnfreezeCard(chatId, userId, card.id, card.last4)
          return
        }
        await sendTelegramMessage(chatId, `Please pick a card — reply with a number (e.g. "1").`)
        return
      }

      // SELECT CARD FOR TOPUP
      if (lastAction === "select_card_topup") {
        const card = findCardFromSelection(lastActionData?.cards || [])
        const amount = lastActionData?.amount
        if (card && amount) {
          const fullCard = userCards.find(c => c.id === card.id)
          if (fullCard) {
            await clearContext()
            await handleTopupPayment(chatId, userId, fullCard, amount)
            return
          }
        }
        await sendTelegramMessage(chatId, `Please pick a card — reply with a number (e.g. "1").`)
        return
      }
    }
  }

  // ── Handle fresh intents ──
  // Clear any old context for a new intent
  if (lastAction) await clearContext()

  switch (intent) {
    case "start":
      // Already handled above
      break

    case "greeting": {
      const cardCount = userCards.length
      let msg = `Hey ${user.name || "there"}! 👋\n\n`
      if (cardCount === 0) {
        msg += `You don't have any cards yet. Say "create a $50 card" to get started!`
      } else {
        msg += `You have ${cardCount} card${cardCount > 1 ? "s" : ""}. I can check balance, top up, freeze/unfreeze, or create a new card.\n\nWhat do you need?`
      }
      await sendTelegramMessage(chatId, msg)
      break
    }

    case "help": {
      await sendTelegramMessage(chatId,
        `🤖 *PrivatePay Bot Commands*\n\n` +
        `💳 *Create card* — "Create a $100 card"\n` +
        `💰 *Top up* — "Top up $50"\n` +
        `📊 *Balance* — "What's my balance?" or /balance\n` +
        `❄️ *Freeze* — "Freeze my card"\n` +
        `🔓 *Unfreeze* — "Unfreeze my card"\n` +
        `📜 *Transactions* — "Show transactions" or /transactions\n` +
        `💳 *Card details* — "Show my card" or /cards\n` +
        `💲 *Fees* — "What are the fees?"\n` +
        `🔌 *Disconnect* — /disconnect\n\n` +
        `Just type naturally — I understand plain English! 🙌`
      )
      break
    }

    case "fees": {
      await sendTelegramMessage(chatId,
        `💲 *Fee Structure*\n\n` +
        `💳 *Card Issuance*: $${CARD_ISSUANCE_FEE}\n` +
        `📊 *Service Fee*: ${SERVICE_FEE_PERCENT * 100}% + $${SERVICE_FEE_FLAT}\n` +
        `💰 *Min Card Load*: $10\n` +
        `🔄 *Top-up Fee*: ${SERVICE_FEE_PERCENT * 100}% + $${SERVICE_FEE_FLAT}\n\n` +
        `*Example*: A $100 card costs:\n` +
        `$100 + $30 (issuance) + $4 (3%+$1) = *$134 total*`
      )
      break
    }

    case "balance": {
      if (userCards.length === 0) {
        await sendTelegramMessage(chatId, `You don't have any cards yet. Say "create a card" to get started!`)
        break
      }

      const balanceResults = await Promise.all(
        userCards.map(async (card) => {
          try {
            const details = await getCardDetails(card.kripiCardId || "")
            if (details.balance !== card.balance) {
              await prisma.card.update({ where: { id: card.id }, data: { balance: details.balance } })
            }
            return { ...card, balance: details.balance }
          } catch {
            return card
          }
        })
      )

      if (balanceResults.length === 1) {
        const c = balanceResults[0]
        await sendTelegramMessage(chatId,
          `💳 *•••• ${c.cardNumber.slice(-4)}* (${c.nameOnCard})\n\n` +
          `💰 *Balance*: $${c.balance.toFixed(2)}\n` +
          `📌 *Status*: ${c.status === "ACTIVE" ? "✅ Active" : c.status === "FROZEN" ? "❄️ Frozen" : c.status}`
        )
      } else {
        const cardList = balanceResults.map(c =>
          `💳 •••• ${c.cardNumber.slice(-4)} — ${c.nameOnCard} — *$${c.balance.toFixed(2)}* ${c.status === "FROZEN" ? "❄️" : "✅"}`
        ).join("\n")
        const total = balanceResults.reduce((sum, c) => sum + c.balance, 0)
        await sendTelegramMessage(chatId, `Your card balances:\n\n${cardList}\n\n💰 *Total*: $${total.toFixed(2)}`)
      }
      break
    }

    case "card_details": {
      if (userCards.length === 0) {
        await sendTelegramMessage(chatId, `You don't have any cards. Say "create a card" to get one!`)
        break
      }

      for (const card of userCards) {
        const masked = card.cardNumber.match(/.{1,4}/g)?.join(" ") || card.cardNumber
        await sendTelegramMessage(chatId,
          `💳 *Card Details*\n\n` +
          `*Number*: \`${masked}\`\n` +
          `*Expiry*: ${card.expiryDate}\n` +
          `*CVV*: ||${card.cvv}||\n` +
          `*Name*: ${card.nameOnCard}\n` +
          `*Balance*: $${card.balance.toFixed(2)}\n` +
          `*Status*: ${card.status === "ACTIVE" ? "✅ Active" : "❄️ Frozen"}`
        )
      }
      break
    }

    case "transactions": {
      if (userCards.length === 0) {
        await sendTelegramMessage(chatId, `You don't have any cards yet.`)
        break
      }

      const card = userCards[0]
      if (!card.kripiCardId) {
        await sendTelegramMessage(chatId, `Card •••• ${card.cardNumber.slice(-4)} is still being set up. No transactions yet.`)
        break
      }

      try {
        const details = await getCardDetails(card.kripiCardId)
        const transactions = (details as any).transactions || []

        if (transactions.length === 0) {
          await sendTelegramMessage(chatId, `No transactions found for •••• ${card.cardNumber.slice(-4)}.`)
          break
        }

        const txList = transactions.slice(0, 10).map((tx: any) => {
          const status = tx.status === "Success" ? "✅" : tx.status === "Pending" ? "⏳" : "❌"
          const date = new Date(tx.recordTime).toLocaleDateString()
          return `${status} ${tx.merchantName || tx.type} — *${tx.amount}* — ${date}`
        }).join("\n")

        await sendTelegramMessage(chatId, `📜 *Recent Transactions* (•••• ${card.cardNumber.slice(-4)}):\n\n${txList}`)
      } catch {
        await sendTelegramMessage(chatId, `Couldn't fetch transactions right now. Try again in a moment.`)
      }
      break
    }

    case "create_card": {
      const amount = params.amount as number | null
      const name = (params.name as string) || user.name?.toUpperCase() || null

      if (!amount) {
        await saveContext("need_amount_create", {})
        await sendTelegramMessage(chatId,
          `Sure! How much do you want to load on the card?\n\nMinimum is $10. Just tell me the amount, like "$50" or "100".\n\n` +
          `Fee: $${CARD_ISSUANCE_FEE} issuance + ${SERVICE_FEE_PERCENT * 100}% + $${SERVICE_FEE_FLAT} service.`
        )
        break
      }

      if (amount < 10) {
        await sendTelegramMessage(chatId, `Minimum card load is $10. Please choose a higher amount.`)
        break
      }

      if (!name) {
        await saveContext("need_name", { amount })
        await sendTelegramMessage(chatId, `Got it — $${amount} card! What name do you want on the card?\n\nJust type the name, like "JOHN DOE".`)
        break
      }

      await handleCreateCardPayment(chatId, userId, name, amount)
      break
    }

    case "topup": {
      if (userCards.length === 0) {
        await sendTelegramMessage(chatId, `You don't have any cards to top up. Say "create a card" first!`)
        break
      }

      const amount = params.amount as number | null

      if (!amount) {
        await saveContext("need_amount_topup", {})
        await sendTelegramMessage(chatId, `How much do you want to top up? Minimum is $10.`)
        break
      }

      if (amount < 10) {
        await sendTelegramMessage(chatId, `Minimum top-up is $10. Please choose a higher amount.`)
        break
      }

      if (userCards.length > 1) {
        const cardList = userCards.map((c, i) =>
          `${i + 1}. •••• ${c.cardNumber.slice(-4)} — ${c.nameOnCard} — $${c.balance.toFixed(2)}`
        ).join("\n")
        await saveContext("select_card_topup", {
          amount,
          cards: userCards.map(c => ({ id: c.id, last4: c.cardNumber.slice(-4), name: c.nameOnCard, balance: c.balance }))
        })
        await sendTelegramMessage(chatId, `Which card do you want to top up with $${amount}?\n\n${cardList}`)
        break
      }

      await handleTopupPayment(chatId, userId, userCards[0], amount)
      break
    }

    case "freeze": {
      if (userCards.length === 0) {
        await sendTelegramMessage(chatId, `You don't have any cards to freeze.`)
        break
      }

      const activeCards = userCards.filter(c => c.status === "ACTIVE")
      if (activeCards.length === 0) {
        await sendTelegramMessage(chatId, `All your cards are already frozen.`)
        break
      }

      if (activeCards.length === 1) {
        await handleFreezeCard(chatId, userId, activeCards[0].id, activeCards[0].cardNumber.slice(-4))
        break
      }

      const cardList = activeCards.map((c, i) =>
        `${i + 1}. •••• ${c.cardNumber.slice(-4)} — ${c.nameOnCard} — $${c.balance.toFixed(2)}`
      ).join("\n")
      await saveContext("select_card_freeze", {
        cards: activeCards.map(c => ({ id: c.id, last4: c.cardNumber.slice(-4), name: c.nameOnCard }))
      })
      await sendTelegramMessage(chatId, `Which card do you want to freeze?\n\n${cardList}`)
      break
    }

    case "unfreeze": {
      const frozenCards = userCards.filter(c => c.status === "FROZEN")
      if (frozenCards.length === 0) {
        await sendTelegramMessage(chatId, `None of your cards are frozen.`)
        break
      }

      if (frozenCards.length === 1) {
        await handleUnfreezeCard(chatId, userId, frozenCards[0].id, frozenCards[0].cardNumber.slice(-4))
        break
      }

      const cardList = frozenCards.map((c, i) =>
        `${i + 1}. •••• ${c.cardNumber.slice(-4)} — ${c.nameOnCard}`
      ).join("\n")
      await saveContext("select_card_unfreeze", {
        cards: frozenCards.map(c => ({ id: c.id, last4: c.cardNumber.slice(-4), name: c.nameOnCard }))
      })
      await sendTelegramMessage(chatId, `Which card do you want to unfreeze?\n\n${cardList}`)
      break
    }

    case "thanks": {
      await sendTelegramMessage(chatId, `You're welcome! 🙌 Anything else you need?`)
      break
    }

    default: {
      await sendTelegramMessage(chatId,
        `I'm not sure what you mean. Here's what I can do:\n\n` +
        `• "Create a $50 card"\n` +
        `• "Top up $20"\n` +
        `• "What's my balance?"\n` +
        `• "Freeze my card"\n` +
        `• "Show transactions"\n` +
        `• "Show my card details"\n\n` +
        `Or type /help for all commands.`
      )
    }
  }
}

// ── Action handlers ──

async function handleCreateCardPayment(chatId: string, userId: string, name: string, amount: number) {
  const serviceFee = (amount * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT
  const totalAmount = amount + CARD_ISSUANCE_FEE + serviceFee

  try {
    const { solAmount, solPrice } = await usdToSol(totalAmount)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    const payment = await prisma.payment.create({
      data: {
        amountUsd: totalAmount,
        amountSol: solAmount,
        solPriceAtTime: solPrice,
        cardType: "issue",
        nameOnCard: name,
        topupAmount: amount,
        topupFee: serviceFee,
        userId,
        expiresAt,
      },
    })

    await sendTelegramMessage(chatId,
      `💳 *Card Payment Ready*\n\n` +
      `💳 *Card Value*: $${amount.toFixed(2)}\n` +
      `👤 *Name*: ${name}\n` +
      `🏷️ *Issuance Fee*: $${CARD_ISSUANCE_FEE.toFixed(2)}\n` +
      `📊 *Service Fee*: $${serviceFee.toFixed(2)}\n` +
      `💵 *Total*: $${totalAmount.toFixed(2)}\n` +
      `◎ *Pay*: ${solAmount.toFixed(6)} SOL\n\n` +
      `Send exactly *${solAmount.toFixed(6)} SOL* to:\n\`${PAYMENT_WALLET}\`\n\n` +
      `⏳ Payment expires in 30 minutes.\n\n` +
      `After sending, go to privatepay.site to verify your payment, or say "I paid" here.`,
      {
        replyMarkup: {
          inline_keyboard: [[
            { text: "📋 Copy Wallet", callback_data: "copy_wallet" },
            { text: "🌐 Verify on Site", url: `${SITE_URL}` }
          ]]
        }
      }
    )
  } catch {
    await sendTelegramMessage(chatId, `Something went wrong creating the payment. Please try again.`)
  }
}

async function handleTopupPayment(chatId: string, userId: string, card: any, amount: number) {
  const serviceFee = (amount * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT
  const totalAmount = amount + serviceFee

  try {
    const { solAmount, solPrice } = await usdToSol(totalAmount)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    const payment = await prisma.payment.create({
      data: {
        amountUsd: totalAmount,
        amountSol: solAmount,
        solPriceAtTime: solPrice,
        cardType: "fund",
        nameOnCard: card.nameOnCard,
        targetCardId: card.id,
        topupAmount: amount,
        topupFee: serviceFee,
        userId,
        expiresAt,
      },
    })

    await sendTelegramMessage(chatId,
      `💰 *Top-up Payment Ready*\n\n` +
      `💳 *Card*: •••• ${card.cardNumber.slice(-4)} (${card.nameOnCard})\n` +
      `💰 *Top-up*: $${amount.toFixed(2)}\n` +
      `📊 *Service Fee*: $${serviceFee.toFixed(2)}\n` +
      `💵 *Total*: $${totalAmount.toFixed(2)}\n` +
      `◎ *Pay*: ${solAmount.toFixed(6)} SOL\n\n` +
      `Send exactly *${solAmount.toFixed(6)} SOL* to:\n\`${PAYMENT_WALLET}\`\n\n` +
      `⏳ Expires in 30 minutes.`,
      {
        replyMarkup: {
          inline_keyboard: [[
            { text: "📋 Copy Wallet", callback_data: "copy_wallet" },
            { text: "🌐 Verify on Site", url: `${SITE_URL}` }
          ]]
        }
      }
    )
  } catch {
    await sendTelegramMessage(chatId, `Something went wrong creating the top-up payment. Please try again.`)
  }
}

async function handleFreezeCard(chatId: string, userId: string, cardId: string, last4: string) {
  try {
    const card = await prisma.card.findFirst({ where: { id: cardId, userId } })
    if (!card) {
      await sendTelegramMessage(chatId, `Card not found.`)
      return
    }

    // Call KripiCard API to freeze
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "freeze" }),
    })

    if (response.ok) {
      await prisma.card.update({ where: { id: card.id }, data: { status: "FROZEN" } })
      await sendTelegramMessage(chatId, `❄️ Card •••• ${last4} has been *frozen*.\n\nSay "unfreeze my card" to re-enable it.`)
    } else {
      await sendTelegramMessage(chatId, `Failed to freeze card. Please try again.`)
    }
  } catch {
    await sendTelegramMessage(chatId, `Something went wrong. Please try again.`)
  }
}

async function handleUnfreezeCard(chatId: string, userId: string, cardId: string, last4: string) {
  try {
    const card = await prisma.card.findFirst({ where: { id: cardId, userId } })
    if (!card) {
      await sendTelegramMessage(chatId, `Card not found.`)
      return
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unfreeze" }),
    })

    if (response.ok) {
      await prisma.card.update({ where: { id: card.id }, data: { status: "ACTIVE" } })
      await sendTelegramMessage(chatId, `✅ Card •••• ${last4} has been *unfrozen* and is active again!`)
    } else {
      await sendTelegramMessage(chatId, `Failed to unfreeze card. Please try again.`)
    }
  } catch {
    await sendTelegramMessage(chatId, `Something went wrong. Please try again.`)
  }
}
