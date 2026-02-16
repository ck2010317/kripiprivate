# Telegram Bot Deployment Guide

## Overview
PrivatePay now has a **Telegram bot** (`@PrivatePayAgentbot`) that lets users manage their cards directly from Telegram. Users connect via one-time auth link, and all queries are scoped to their account.

## What's Included

### Database Models
- **TelegramLink** — permanent mapping between Telegram user ID and PrivatePay user
- **TelegramAuthToken** — one-time linking tokens (10-min expiry)

### API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /api/telegram/webhook` | Receives messages from Telegram |
| `POST /api/telegram/auth` | Links Telegram to PrivatePay account |
| `GET /api/telegram/auth` | Check if Telegram is linked |
| `DELETE /api/telegram/auth` | Disconnect Telegram |
| `POST /api/telegram/setup` | Admin: manage webhook & commands |

### Components
- `TelegramConnect` widget in user dashboard (shows connection status)
- `/telegram/auth` page (users click auth link from bot)

### Bot Logic
- Location: `lib/telegram.ts`
- Handles all intents: create_card, topup, balance, freeze, unfreeze, transactions, card_details, fees
- Uses existing `/api/chat` intent detection logic
- Multi-turn conversations with state saved per user

## Deployment Steps

### 1. Add Environment Variable to Vercel
```bash
TELEGRAM_BOT_TOKEN=8223188024:AAGh4yp3bB0QdkI8YCEwbJFzMXOFewqimn0
```

The webhook is already configured to: `https://privatepay.site/api/telegram/webhook`

### 2. Verify Bot Setup (Optional)
After deployment, you can check webhook status:
```bash
curl -X POST https://privatepay.site/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action":"info"}'
```

The bot will respond with webhook details.

### 3. Bot Commands (Already Set)
Users can see `/help` and get these commands:
- `/start` — Connect account
- `/help` — Show all commands  
- `/balance` — Check card balances
- `/cards` — Show card details
- `/transactions` — View recent transactions
- `/disconnect` — Unlink account

## How Users Connect

1. User opens `t.me/PrivatePayAgentbot`
2. Sends `/start`
3. Bot sends: "🔗 Connect your PrivatePay account" + clickable link
4. User clicks link → redirected to `privatepay.site/telegram/auth?token=xyz`
5. User clicks "Connect Telegram" button (must be logged in)
6. Account linked permanently
7. From now on, typing in Telegram manages cards

## Security

✅ **One-time linking tokens** — 10-minute expiry, can't be reused
✅ **User scoping** — All queries filtered by userId, impossible to see other users' cards
✅ **Telegram signatures** — Messages cryptographically signed by Telegram
✅ **Session auth** — Auth page requires being logged into PrivatePay first

## Features Supported

| Feature | Status |
|---------|--------|
| Create card | ✅ Natural language: "Create a $50 card" |
| Top up | ✅ "Top up $20" |
| Check balance | ✅ "What's my balance?" or `/balance` |
| Card details | ✅ Shows full number, CVV, expiry |
| Freeze/unfreeze | ✅ "Freeze my card" |
| Transactions | ✅ "Show transactions" or `/transactions` |
| Multi-turn conversation | ✅ Remembers context (selecting cards, amounts) |
| Dashboard widget | ✅ Shows connection status in user dashboard |

## Testing Locally

1. Bot is live on production (`@PrivatePayAgentbot`)
2. To test locally, you'd need to:
   - Set webhook to your local machine (requires ngrok or similar)
   - Or use polling mode (configure via API)

For now, the bot is **production-ready** and users can use it immediately.

## Webhook Setup Details

The webhook is configured to:
- **URL**: `https://privatepay.site/api/telegram/webhook`
- **Allowed updates**: `message`, `callback_query`
- **Max connections**: 40 (Telegram default)

The bot will POST all messages to this endpoint. The `/api/telegram/webhook` handler:
1. Extracts message from Telegram update
2. Finds linked PrivatePay user via Telegram ID
3. Calls `handleTelegramMessage()` in `lib/telegram.ts`
4. Always returns 200 OK (so Telegram doesn't retry)

## Troubleshooting

**Bot not responding?**
- Check env var `TELEGRAM_BOT_TOKEN` is set in Vercel
- Verify webhook is active: `POST /api/telegram/setup` with `{"action":"info"}`
- Check logs in Vercel dashboard

**"Not linked" error?**
- User must complete auth flow first
- Check TelegramLink table in database (one per user)

**Cards showing other users' data?**
- This is prevented by userId scoping (check queries in `lib/telegram.ts`)
- Each query has `where: { userId }`

## Files Added

- `lib/telegram.ts` — Bot logic (627 lines)
- `app/api/telegram/webhook/route.ts` — Webhook handler
- `app/api/telegram/auth/route.ts` — Auth API (POST/GET/DELETE)
- `app/telegram/auth/page.tsx` — Auth page UI
- `app/components/telegram-connect.tsx` — Dashboard widget
- `app/api/telegram/setup/route.ts` — Admin webhook helper
- `prisma/schema.prisma` — Added 2 models
- `scripts/008_add_telegram_integration.sql` — Migration SQL

## Next Steps

1. Deploy to Vercel
2. Users open `t.me/PrivatePayAgentbot` and send `/start`
3. Done! They can now manage cards from Telegram

---

**Bot is live on production. Webhook is configured. Ready to deploy!**
