import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { usdToSol } from "@/lib/solana-payment"
import { getCardDetails } from "@/lib/kripicard-client"

const PAYMENT_WALLET = process.env.PAYMENT_WALLET || "2WWEW2Ry4XvBP1eQWuS1iKb515UBnkFDuLUsbwYvbxqj"
const CARD_ISSUANCE_FEE = 30
const SERVICE_FEE_PERCENT = 0.03
const SERVICE_FEE_FLAT = 1

// Intent detection
function detectIntent(message: string): { intent: string; params: Record<string, any> } {
  const msg = message.toLowerCase().trim()

  // Create card
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

  // Top up / fund
  if (msg.match(/top\s*up|fund|add.*money|add.*funds|load|reload|recharge|refill/)) {
    const amountMatch = msg.match(/\$?(\d+(?:\.\d+)?)/i)
    return {
      intent: "topup",
      params: {
        amount: amountMatch ? parseFloat(amountMatch[1]) : null,
      },
    }
  }

  // Check balance
  if (msg.match(/balance|how much|money.*left|funds.*left|remaining|what.*have/)) {
    return { intent: "balance", params: {} }
  }

  // Freeze card
  if (msg.match(/freeze|lock|block|disable|pause/)) {
    return { intent: "freeze", params: {} }
  }

  // Unfreeze card
  if (msg.match(/unfreeze|unlock|unblock|enable|resume|activate|unpaused/)) {
    return { intent: "unfreeze", params: {} }
  }

  // Transaction history
  if (msg.match(/transaction|history|spent|spending|purchases|activity|statement/)) {
    return { intent: "transactions", params: {} }
  }

  // Card details
  if (msg.match(/card.*detail|card.*info|card.*number|show.*card|my.*card|cvv|expir/)) {
    return { intent: "card_details", params: {} }
  }

  // Fees / pricing
  if (msg.match(/fee|price|pricing|cost|how much.*cost|charge/)) {
    return { intent: "fees", params: {} }
  }

  // Help
  if (msg.match(/help|what can you|how.*work|guide|tutorial|start|begin|commands/)) {
    return { intent: "help", params: {} }
  }

  // Hi / greeting
  if (msg.match(/^(hi|hello|hey|sup|yo|what's up|whats up|gm|good morning|good evening)\b/)) {
    return { intent: "greeting", params: {} }
  }

  // Thanks
  if (msg.match(/thank|thanks|thx|appreciate|cheers/)) {
    return { intent: "thanks", params: {} }
  }

  return { intent: "unknown", params: {} }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({
        response: "You need to be logged in to use the assistant. Please sign in first.",
        action: null,
      })
    }

    const { message, context, lastAction, lastActionData } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ response: "I didn't catch that. Could you try again?", action: null })
    }

    const { intent, params } = detectIntent(message)

    // Fetch user's cards for most operations
    const userCards = await prisma.card.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })

    // ── Handle follow-up selections from previous multi-card prompts ──
    const msg = message.toLowerCase().trim()
    const isNumberSelection = /^[1-9]\d*$/.test(msg)
    const isLast4Selection = /^\d{4}$/.test(msg) && !isNumberSelection

    // Parse natural language numbers: "first one", "second", "1st", "2nd", etc.
    const parseNaturalNumber = (text: string): number => {
      const t = text.toLowerCase().trim()
      if (/^[1-9]\d*$/.test(t)) return parseInt(t)
      if (/\b(1st|first|one|1)\b/.test(t)) return 1
      if (/\b(2nd|second|two|2)\b/.test(t)) return 2
      if (/\b(3rd|third|three|3)\b/.test(t)) return 3
      if (/\b(4th|fourth|four|4)\b/.test(t)) return 4
      if (/\b(5th|fifth|five|5)\b/.test(t)) return 5
      return -1
    }

    const naturalNumber = parseNaturalNumber(msg)
    
    // Check if we have a pending context that needs follow-up
    const contextActions = [
      "select_card_freeze", "select_card_unfreeze", "select_card_topup",
      "need_name", "need_amount_create", "need_amount_topup",
    ]
    const hasContext = lastAction && contextActions.includes(lastAction)

    if (hasContext) {
      const selectionIndex = naturalNumber > 0 ? naturalNumber - 1 : -1
      const cards: any[] = lastActionData?.cards || []

      // Helper: find card by number selection, natural language, or last4
      const findCard = () => {
        if (selectionIndex >= 0 && selectionIndex < cards.length) {
          return cards[selectionIndex]
        }
        const last4Match = msg.match(/(\d{4})/)?.[1]
        if (last4Match) {
          return cards.find((c: any) => c.last4 === last4Match)
        }
        return null
      }

      // Helper: extract dollar amount from message
      const extractAmount = (): number | null => {
        const m = msg.match(/\$?\s*(\d+(?:\.\d+)?)/)
        return m ? parseFloat(m[1]) : null
      }

      // ── NEED AMOUNT FOR CARD CREATION ──
      if (lastAction === "need_amount_create") {
        const amount = extractAmount()
        if (amount && amount >= 10) {
          // Use their account name or ask for name
          const name = user.name?.toUpperCase() || null
          if (!name) {
            return NextResponse.json({
              response: `Got it — $${amount} card! What name do you want on the card?\n\nJust type the name, like "JOHN DOE".`,
              action: "need_name",
              actionData: { amount },
            })
          }
          // Have both amount and name — create payment
          const serviceFee = (amount * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT
          const totalAmount = amount + CARD_ISSUANCE_FEE + serviceFee
          try {
            const { solAmount, solPrice } = await usdToSol(totalAmount)
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
            const payment = await prisma.payment.create({
              data: {
                amountUsd: totalAmount, amountSol: solAmount, solPriceAtTime: solPrice,
                cardType: "issue", nameOnCard: name, topupAmount: amount,
                topupFee: serviceFee, userId: user.id, expiresAt,
              },
            })
            return NextResponse.json({
              response: `Here's your card payment:\n\n` +
                `💳 **Card Value**: $${amount.toFixed(2)}\n👤 **Name**: ${name}\n` +
                `🏷️ **Issuance Fee**: $${CARD_ISSUANCE_FEE.toFixed(2)}\n` +
                `📊 **Service Fee** (3% + $1): $${serviceFee.toFixed(2)}\n` +
                `💵 **Total**: $${totalAmount.toFixed(2)}\n` +
                `◎ **Pay**: ${solAmount.toFixed(6)} SOL\n\n` +
                `Send exactly **${solAmount.toFixed(6)} SOL** to:\n\`${PAYMENT_WALLET}\`\n\n` +
                `⏳ Payment expires in 30 minutes. Click **"I've Paid"** below after sending.`,
              action: "payment_created",
              actionData: {
                paymentId: payment.id, amountSol: solAmount, amountUsd: totalAmount,
                paymentWallet: PAYMENT_WALLET, expiresAt: payment.expiresAt,
                cardName: name, cardAmount: amount,
              },
            })
          } catch { return NextResponse.json({ response: `Something went wrong. Try again.`, action: null }) }
        } else if (amount && amount < 10) {
          return NextResponse.json({
            response: `Minimum is $10. How much do you want to load?`,
            action: "need_amount_create", actionData: lastActionData,
          })
        }
        // If no amount parsed, re-ask
        return NextResponse.json({
          response: `Just tell me the dollar amount, like "$50" or "100".`,
          action: "need_amount_create", actionData: lastActionData,
        })
      }

      // ── NEED AMOUNT FOR TOPUP ──
      if (lastAction === "need_amount_topup") {
        const amount = extractAmount()
        if (amount && amount >= 10) {
          // If multiple cards, ask which one
          if (userCards.length > 1) {
            const cardList = userCards.map((c, i) =>
              `${i + 1}. •••• ${c.cardNumber.slice(-4)} — ${c.nameOnCard} — $${c.balance.toFixed(2)}`
            ).join("\n")
            return NextResponse.json({
              response: `Which card do you want to top up with $${amount}?\n\n${cardList}`,
              action: "select_card_topup",
              actionData: { amount, cards: userCards.map(c => ({ id: c.id, last4: c.cardNumber.slice(-4), name: c.nameOnCard, balance: c.balance })) },
            })
          }
          // Single card — proceed
          const card = userCards[0]
          const serviceFee = (amount * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT
          const totalAmount = amount + serviceFee
          try {
            const { solAmount, solPrice } = await usdToSol(totalAmount)
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
            const payment = await prisma.payment.create({
              data: {
                amountUsd: totalAmount, amountSol: solAmount, solPriceAtTime: solPrice,
                cardType: "fund", nameOnCard: card.nameOnCard, targetCardId: card.id,
                topupAmount: amount, topupFee: serviceFee, userId: user.id, expiresAt,
              },
            })
            return NextResponse.json({
              response: `Top-up payment ready!\n\n` +
                `💳 **Card**: •••• ${card.cardNumber.slice(-4)} (${card.nameOnCard})\n` +
                `💰 **Top-up**: $${amount.toFixed(2)}\n📊 **Service Fee**: $${serviceFee.toFixed(2)}\n` +
                `💵 **Total**: $${totalAmount.toFixed(2)}\n◎ **Pay**: ${solAmount.toFixed(6)} SOL\n\n` +
                `Send exactly **${solAmount.toFixed(6)} SOL** to:\n\`${PAYMENT_WALLET}\`\n\nClick **"I've Paid"** below after sending.`,
              action: "payment_created",
              actionData: {
                paymentId: payment.id, amountSol: solAmount, amountUsd: totalAmount,
                paymentWallet: PAYMENT_WALLET, expiresAt: payment.expiresAt,
                isTopup: true, cardLast4: card.cardNumber.slice(-4),
              },
            })
          } catch { return NextResponse.json({ response: `Something went wrong. Try again.`, action: null }) }
        } else if (amount && amount < 10) {
          return NextResponse.json({
            response: `Minimum top-up is $10. How much?`,
            action: "need_amount_topup", actionData: lastActionData,
          })
        }
        return NextResponse.json({
          response: `Just tell me the dollar amount, like "$50" or "100".`,
          action: "need_amount_topup", actionData: lastActionData,
        })
      }

      // ── SELECT CARD FOR FREEZE ──
      if (lastAction === "select_card_freeze") {
        const card = findCard()
        if (card) {
          return NextResponse.json({
            response: `Freeze card •••• ${card.last4} (${card.name})?\n\nThis will temporarily disable the card.`,
            action: "confirm_freeze",
            actionData: { cardId: card.id, last4: card.last4 },
          })
        }
        return NextResponse.json({
          response: `Please pick a card — reply with a number (e.g. "1") or tap a button above.`,
          action: lastAction, actionData: lastActionData,
        })
      }

      // ── SELECT CARD FOR UNFREEZE ──
      if (lastAction === "select_card_unfreeze") {
        const card = findCard()
        if (card) {
          return NextResponse.json({
            response: `Unfreeze card •••• ${card.last4} (${card.name})?`,
            action: "confirm_unfreeze",
            actionData: { cardId: card.id, last4: card.last4 },
          })
        }
        return NextResponse.json({
          response: `Please pick a card — reply with a number (e.g. "1") or tap a button above.`,
          action: lastAction, actionData: lastActionData,
        })
      }

      // ── SELECT CARD FOR TOPUP ──
      if (lastAction === "select_card_topup") {
        const card = findCard()
        const amount = lastActionData?.amount
        if (card && amount) {
          const fullCard = userCards.find(c => c.id === card.id)
          if (!fullCard) return NextResponse.json({ response: `Card not found.`, action: null })
          const serviceFee = (amount * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT
          const totalAmount = amount + serviceFee
          try {
            const { solAmount, solPrice } = await usdToSol(totalAmount)
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
            const payment = await prisma.payment.create({
              data: {
                amountUsd: totalAmount, amountSol: solAmount, solPriceAtTime: solPrice,
                cardType: "fund", nameOnCard: fullCard.nameOnCard, targetCardId: fullCard.id,
                topupAmount: amount, topupFee: serviceFee, userId: user.id, expiresAt,
              },
            })
            return NextResponse.json({
              response: `Top-up payment ready!\n\n` +
                `💳 **Card**: •••• ${fullCard.cardNumber.slice(-4)} (${fullCard.nameOnCard})\n` +
                `💰 **Top-up**: $${amount.toFixed(2)}\n📊 **Service Fee**: $${serviceFee.toFixed(2)}\n` +
                `💵 **Total**: $${totalAmount.toFixed(2)}\n◎ **Pay**: ${solAmount.toFixed(6)} SOL\n\n` +
                `Send exactly **${solAmount.toFixed(6)} SOL** to:\n\`${PAYMENT_WALLET}\`\n\nClick **"I've Paid"** below after sending.`,
              action: "payment_created",
              actionData: {
                paymentId: payment.id, amountSol: solAmount, amountUsd: totalAmount,
                paymentWallet: PAYMENT_WALLET, expiresAt: payment.expiresAt,
                isTopup: true, cardLast4: fullCard.cardNumber.slice(-4),
              },
            })
          } catch { return NextResponse.json({ response: `Something went wrong. Try again.`, action: null }) }
        }
        return NextResponse.json({
          response: `Please pick a card — reply with a number (e.g. "1") or tap a button above.`,
          action: lastAction, actionData: lastActionData,
        })
      }

      // ── NEED NAME for card creation ──
      if (lastAction === "need_name" && lastActionData?.amount) {
        const name = message.replace(/(?:name|named|for|it|call|put)\s*/gi, "").trim().toUpperCase() || message.trim().toUpperCase()
        if (name.length >= 2 && name.length <= 30) {
          const amount = lastActionData.amount
          const serviceFee = (amount * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT
          const totalAmount = amount + CARD_ISSUANCE_FEE + serviceFee
          try {
            const { solAmount, solPrice } = await usdToSol(totalAmount)
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
            const payment = await prisma.payment.create({
              data: {
                amountUsd: totalAmount, amountSol: solAmount, solPriceAtTime: solPrice,
                cardType: "issue", nameOnCard: name, topupAmount: amount,
                topupFee: serviceFee, userId: user.id, expiresAt,
              },
            })
            return NextResponse.json({
              response: `Here's your card payment:\n\n` +
                `💳 **Card Value**: $${amount.toFixed(2)}\n👤 **Name**: ${name}\n` +
                `🏷️ **Issuance Fee**: $${CARD_ISSUANCE_FEE.toFixed(2)}\n` +
                `📊 **Service Fee** (3% + $1): $${serviceFee.toFixed(2)}\n` +
                `💵 **Total**: $${totalAmount.toFixed(2)}\n` +
                `◎ **Pay**: ${solAmount.toFixed(6)} SOL\n\n` +
                `Send exactly **${solAmount.toFixed(6)} SOL** to:\n\`${PAYMENT_WALLET}\`\n\n` +
                `⏳ Payment expires in 30 minutes. Click **"I've Paid"** below after sending.`,
              action: "payment_created",
              actionData: {
                paymentId: payment.id, amountSol: solAmount, amountUsd: totalAmount,
                paymentWallet: PAYMENT_WALLET, expiresAt: payment.expiresAt,
                cardName: name, cardAmount: amount,
              },
            })
          } catch { return NextResponse.json({ response: `Something went wrong. Try again.`, action: null }) }
        }
        return NextResponse.json({
          response: `Just type the name you want on the card, like "JOHN DOE".`,
          action: "need_name", actionData: lastActionData,
        })
      }
    }

    switch (intent) {
      case "greeting": {
        const name = user.name || "there"
        const cardCount = userCards.length
        let greeting = `Hey ${name}! 👋 I'm your PrivatePay assistant.`
        if (cardCount === 0) {
          greeting += `\n\nYou don't have any cards yet. Want me to create one? Just say something like "Create a $50 card".`
        } else {
          greeting += `\n\nYou have ${cardCount} card${cardCount > 1 ? "s" : ""}. I can help you check your balance, top up, freeze/unfreeze, or create a new card. What do you need?`
        }
        return NextResponse.json({ response: greeting, action: null })
      }

      case "help": {
        return NextResponse.json({
          response: `Here's what I can do for you:\n\n` +
            `💳 **Create a card** — "Create a $100 card named JOHN"\n` +
            `💰 **Top up** — "Top up my card with $50"\n` +
            `📊 **Check balance** — "What's my balance?"\n` +
            `❄️ **Freeze card** — "Freeze my card"\n` +
            `🔓 **Unfreeze card** — "Unfreeze my card"\n` +
            `📜 **Transactions** — "Show my transactions"\n` +
            `💳 **Card details** — "Show my card details"\n` +
            `💲 **Fees** — "What are the fees?"\n\n` +
            `Just type or use the 🎤 mic button to speak!`,
          action: null,
        })
      }

      case "fees": {
        return NextResponse.json({
          response: `Here's our fee structure:\n\n` +
            `💳 **Card Issuance Fee**: $${CARD_ISSUANCE_FEE}\n` +
            `📊 **Service Fee**: ${SERVICE_FEE_PERCENT * 100}% + $${SERVICE_FEE_FLAT} (on every transaction)\n` +
            `💰 **Minimum Card Load**: $10\n` +
            `🔄 **Top-up Fee**: ${SERVICE_FEE_PERCENT * 100}% + $${SERVICE_FEE_FLAT} (no issuance fee)\n\n` +
            `**Example**: A $100 card costs:\n` +
            `$100 (card) + $30 (issuance) + $4 (3%+$1 service) = **$134 total**`,
          action: null,
        })
      }

      case "create_card": {
        const amount = params.amount
        const name = params.name || user.name?.toUpperCase() || null

        // If no amount, ask for it
        if (!amount) {
          return NextResponse.json({
            response: `Sure! How much do you want to load on the card?\n\nMinimum is $10. Just tell me the amount, like "$50" or "100".\n\nRemember: $${CARD_ISSUANCE_FEE} issuance fee + ${SERVICE_FEE_PERCENT * 100}% + $${SERVICE_FEE_FLAT} service fee applies.`,
            action: "need_amount_create",
            actionData: {},
          })
        }

        if (amount < 10) {
          return NextResponse.json({
            response: `The minimum card load is $10. Please choose an amount of $10 or more.`,
            action: null,
          })
        }

        // If no name, ask for it
        if (!name) {
          return NextResponse.json({
            response: `Got it — $${amount} card! What name do you want on the card?\n\nJust say something like "Name it JOHN DOE".`,
            action: "need_name",
            actionData: { amount },
          })
        }

        // Calculate fees
        const serviceFee = (amount * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT
        const totalAmount = amount + CARD_ISSUANCE_FEE + serviceFee

        try {
          const { solAmount, solPrice } = await usdToSol(totalAmount)

          // Create payment
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
              userId: user.id,
              expiresAt,
            },
          })

          return NextResponse.json({
            response: `Here's your card payment:\n\n` +
              `💳 **Card Value**: $${amount.toFixed(2)}\n` +
              `👤 **Name**: ${name}\n` +
              `🏷️ **Issuance Fee**: $${CARD_ISSUANCE_FEE.toFixed(2)}\n` +
              `📊 **Service Fee** (3% + $1): $${serviceFee.toFixed(2)}\n` +
              `💵 **Total**: $${totalAmount.toFixed(2)}\n` +
              `◎ **Pay**: ${solAmount.toFixed(6)} SOL\n\n` +
              `Send exactly **${solAmount.toFixed(6)} SOL** to:\n\`${PAYMENT_WALLET}\`\n\n` +
              `⏳ Payment expires in 30 minutes.\n\n` +
              `Once you send the SOL, click **"I've Paid"** below or say "I paid" and I'll verify it.`,
            action: "payment_created",
            actionData: {
              paymentId: payment.id,
              amountSol: solAmount,
              amountUsd: totalAmount,
              paymentWallet: PAYMENT_WALLET,
              expiresAt: payment.expiresAt,
              cardName: name,
              cardAmount: amount,
            },
          })
        } catch (err) {
          return NextResponse.json({
            response: `Sorry, something went wrong creating the payment. Please try again.`,
            action: null,
          })
        }
      }

      case "topup": {
        if (userCards.length === 0) {
          return NextResponse.json({
            response: `You don't have any cards to top up. Want me to create one? Just say "Create a $50 card".`,
            action: null,
          })
        }

        const amount = params.amount

        if (!amount) {
          return NextResponse.json({
            response: `How much do you want to top up? Minimum is $10.\n\nJust tell me the amount, like "$50" or "100".`,
            action: "need_amount_topup",
            actionData: {},
          })
        }

        if (amount < 10) {
          return NextResponse.json({
            response: `Minimum top-up is $10. Please choose a higher amount.`,
            action: null,
          })
        }

        // If user has multiple cards, list them
        if (userCards.length > 1) {
          const cardList = userCards.map((c, i) => 
            `${i + 1}. •••• ${c.cardNumber.slice(-4)} — ${c.nameOnCard} — $${c.balance.toFixed(2)} (${c.status})`
          ).join("\n")

          return NextResponse.json({
            response: `You have ${userCards.length} cards. Which one do you want to top up with $${amount}?\n\n${cardList}\n\nJust say the card number (last 4 digits) like "top up the one ending 9448"`,
            action: "select_card_topup",
            actionData: { amount, cards: userCards.map(c => ({ id: c.id, last4: c.cardNumber.slice(-4), name: c.nameOnCard, balance: c.balance })) },
          })
        }

        // Single card — proceed
        const card = userCards[0]
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
              userId: user.id,
              expiresAt,
            },
          })

          return NextResponse.json({
            response: `Top-up payment ready!\n\n` +
              `💳 **Card**: •••• ${card.cardNumber.slice(-4)} (${card.nameOnCard})\n` +
              `💰 **Top-up Amount**: $${amount.toFixed(2)}\n` +
              `📊 **Service Fee** (3% + $1): $${serviceFee.toFixed(2)}\n` +
              `💵 **Total**: $${totalAmount.toFixed(2)}\n` +
              `◎ **Pay**: ${solAmount.toFixed(6)} SOL\n\n` +
              `Send exactly **${solAmount.toFixed(6)} SOL** to:\n\`${PAYMENT_WALLET}\`\n\n` +
              `⏳ Payment expires in 30 minutes.\n\n` +
              `Once you send the SOL, click **"I've Paid"** below or say "I paid".`,
            action: "payment_created",
            actionData: {
              paymentId: payment.id,
              amountSol: solAmount,
              amountUsd: totalAmount,
              paymentWallet: PAYMENT_WALLET,
              expiresAt: payment.expiresAt,
              isTopup: true,
              cardLast4: card.cardNumber.slice(-4),
            },
          })
        } catch (err) {
          return NextResponse.json({
            response: `Sorry, something went wrong creating the top-up payment. Please try again.`,
            action: null,
          })
        }
      }

      case "balance": {
        if (userCards.length === 0) {
          return NextResponse.json({
            response: `You don't have any cards yet. Want me to create one?`,
            action: null,
          })
        }

        // Sync balances from KripiCard API
        const balanceResults = await Promise.all(
          userCards.map(async (card) => {
            try {
              const details = await getCardDetails(card.kripiCardId)
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
          const card = balanceResults[0]
          return NextResponse.json({
            response: `💳 **•••• ${card.cardNumber.slice(-4)}** (${card.nameOnCard})\n\n` +
              `💰 **Balance**: $${card.balance.toFixed(2)}\n` +
              `📌 **Status**: ${card.status === "ACTIVE" ? "✅ Active" : card.status === "FROZEN" ? "❄️ Frozen" : card.status}`,
            action: null,
          })
        }

        const cardList = balanceResults.map(c =>
          `💳 •••• ${c.cardNumber.slice(-4)} — ${c.nameOnCard} — **$${c.balance.toFixed(2)}** ${c.status === "FROZEN" ? "❄️" : "✅"}`
        ).join("\n")

        const totalBalance = balanceResults.reduce((sum, c) => sum + c.balance, 0)

        return NextResponse.json({
          response: `Here are your card balances:\n\n${cardList}\n\n💰 **Total**: $${totalBalance.toFixed(2)}`,
          action: null,
        })
      }

      case "freeze": {
        if (userCards.length === 0) {
          return NextResponse.json({ response: `You don't have any cards to freeze.`, action: null })
        }

        const activeCards = userCards.filter(c => c.status === "ACTIVE")
        if (activeCards.length === 0) {
          return NextResponse.json({ response: `All your cards are already frozen.`, action: null })
        }

        if (activeCards.length === 1) {
          return NextResponse.json({
            response: `Freeze card •••• ${activeCards[0].cardNumber.slice(-4)} (${activeCards[0].nameOnCard})?\n\nThis will temporarily disable the card.`,
            action: "confirm_freeze",
            actionData: { cardId: activeCards[0].id, last4: activeCards[0].cardNumber.slice(-4) },
          })
        }

        const cardList = activeCards.map((c, i) =>
          `${i + 1}. •••• ${c.cardNumber.slice(-4)} — ${c.nameOnCard} — $${c.balance.toFixed(2)}`
        ).join("\n")

        return NextResponse.json({
          response: `Which card do you want to freeze?\n\n${cardList}`,
          action: "select_card_freeze",
          actionData: { cards: activeCards.map(c => ({ id: c.id, last4: c.cardNumber.slice(-4), name: c.nameOnCard })) },
        })
      }

      case "unfreeze": {
        const frozenCards = userCards.filter(c => c.status === "FROZEN")
        if (frozenCards.length === 0) {
          return NextResponse.json({ response: `None of your cards are frozen.`, action: null })
        }

        if (frozenCards.length === 1) {
          return NextResponse.json({
            response: `Unfreeze card •••• ${frozenCards[0].cardNumber.slice(-4)} (${frozenCards[0].nameOnCard})?`,
            action: "confirm_unfreeze",
            actionData: { cardId: frozenCards[0].id, last4: frozenCards[0].cardNumber.slice(-4) },
          })
        }

        const cardList = frozenCards.map((c, i) =>
          `${i + 1}. •••• ${c.cardNumber.slice(-4)} — ${c.nameOnCard}`
        ).join("\n")

        return NextResponse.json({
          response: `Which card do you want to unfreeze?\n\n${cardList}`,
          action: "select_card_unfreeze",
          actionData: { cards: frozenCards.map(c => ({ id: c.id, last4: c.cardNumber.slice(-4), name: c.nameOnCard })) },
        })
      }

      case "transactions": {
        if (userCards.length === 0) {
          return NextResponse.json({ response: `You don't have any cards yet.`, action: null })
        }

        // Get transactions from KripiCard for the first (or only) card
        const card = userCards[0]
        try {
          const details = await getCardDetails(card.kripiCardId)
          const transactions = (details as any).transactions || []

          if (transactions.length === 0) {
            return NextResponse.json({
              response: `No transactions found for card •••• ${card.cardNumber.slice(-4)}.`,
              action: null,
            })
          }

          const txList = transactions.slice(0, 10).map((tx: any) => {
            const status = tx.status === "Success" ? "✅" : tx.status === "Pending" ? "⏳" : "❌"
            const date = new Date(tx.recordTime).toLocaleDateString()
            return `${status} ${tx.merchantName || tx.type} — **${tx.amount}** — ${date} — ${tx.status}`
          }).join("\n")

          return NextResponse.json({
            response: `📜 **Recent transactions** for •••• ${card.cardNumber.slice(-4)}:\n\n${txList}`,
            action: null,
          })
        } catch {
          return NextResponse.json({
            response: `Couldn't fetch transactions right now. Please try again in a moment.`,
            action: null,
          })
        }
      }

      case "card_details": {
        if (userCards.length === 0) {
          return NextResponse.json({ response: `You don't have any cards. Want me to create one?`, action: null })
        }

        const card = userCards[0]
        return NextResponse.json({
          response: `Here are your card details:\n\n` +
            `💳 **Card Number**: ${card.cardNumber.match(/.{1,4}/g)?.join(" ")}\n` +
            `📅 **Expiry**: ${card.expiryDate}\n` +
            `🔒 **CVV**: ||${card.cvv}|| (tap to reveal)\n` +
            `👤 **Name**: ${card.nameOnCard}\n` +
            `💰 **Balance**: $${card.balance.toFixed(2)}\n` +
            `📌 **Status**: ${card.status === "ACTIVE" ? "✅ Active" : "❄️ Frozen"}`,
          action: "card_details",
          actionData: {
            cardNumber: card.cardNumber,
            expiryDate: card.expiryDate,
            cvv: card.cvv,
            nameOnCard: card.nameOnCard,
            balance: card.balance,
            status: card.status,
          },
        })
      }

      case "thanks": {
        return NextResponse.json({
          response: `You're welcome! 🙌 Anything else you need?`,
          action: null,
        })
      }

      default: {
        return NextResponse.json({
          response: `I'm not sure what you mean. Here's what I can help with:\n\n` +
            `• **Create a card** — "Create a $50 card"\n` +
            `• **Top up** — "Top up $20"\n` +
            `• **Balance** — "What's my balance?"\n` +
            `• **Freeze/Unfreeze** — "Freeze my card"\n` +
            `• **Transactions** — "Show transactions"\n` +
            `• **Card details** — "Show my card"\n` +
            `• **Fees** — "What are the fees?"\n\n` +
            `Just type or use the 🎤 mic!`,
          action: null,
        })
      }
    }
  } catch (error) {
    console.error("[Chat] Error:", error)
    return NextResponse.json({
      response: "Something went wrong. Please try again.",
      action: null,
    })
  }
}
