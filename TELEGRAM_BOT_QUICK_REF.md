# Telegram Bot — Quick Reference

## For Users

**Bot**: `@PrivatePayAgentbot`

### Getting Started
1. Open Telegram
2. Search `@PrivatePayAgentbot`
3. Send `/start`
4. Click the link
5. Log in to PrivatePay (if needed)
6. Click "Connect Telegram"
7. Done! 🎉

### Commands
```
/start       Connect your account
/help        Show all commands
/balance     Check card balances  
/cards       Show card details
/transactions View recent transactions
/disconnect  Disconnect account
```

### Examples
```
Create card:    "Create a $100 card named JOHN DOE"
Top up:         "Top up my card with $50"
Balance:        "What's my balance?"
Freeze:         "Freeze my card"
Details:        "Show my card details"
Transactions:   "Show transactions"
```

---

## For Developers

### Architecture
```
User Message → Telegram API
              ↓
     /api/telegram/webhook
              ↓
   lib/telegram.ts (handleTelegramMessage)
              ↓
   Intent Detection & Routing
              ↓
   Database Query (scoped by userId)
              ↓
   Response → Telegram API → User
```

### Files
- **Bot Logic**: `lib/telegram.ts` (627 lines)
- **Webhook**: `app/api/telegram/webhook/route.ts`
- **Auth API**: `app/api/telegram/auth/route.ts`
- **Auth Page**: `app/telegram/auth/page.tsx`
- **Dashboard**: `app/components/telegram-connect.tsx`
- **Database**: `TelegramLink`, `TelegramAuthToken`

### Key Functions
```typescript
// Main handler
handleTelegramMessage(telegramId, chatId, message, firstName, username)

// Utilities
sendTelegramMessage(chatId, text, options)
createAuthToken(telegramId) → returns auth link

// Auth flow
POST /api/telegram/auth (link account)
GET /api/telegram/auth (check status)
DELETE /api/telegram/auth (disconnect)
```

### Environment
```
TELEGRAM_BOT_TOKEN=8223188024:AAGh4yp3bB0QdkI8YCEwbJFzMXOFewqimn0
```

### Database
```sql
-- Links Telegram to PrivatePay user
SELECT * FROM "TelegramLink" WHERE "userId" = '...';

-- One-time auth tokens
SELECT * FROM "TelegramAuthToken" WHERE "telegramId" = '...';
```

### Webhook
```
URL: https://privatepay.site/api/telegram/webhook
Method: POST
Body: Telegram Update object
Response: Always 200 OK
```

### Security
- ✅ One-time tokens (10-min expiry)
- ✅ User scoped queries (userId filtering)
- ✅ Telegram signatures verified
- ✅ Rate limiting on auth endpoints

### Deployment
```bash
# 1. Add env var to Vercel
TELEGRAM_BOT_TOKEN=8223188024:AAGh4yp3bB0QdkI8YCEwbJFzMXOFewqimn0

# 2. Deploy
git push origin main

# 3. Verify webhook
curl -X POST https://privatepay.site/api/telegram/setup \
  -H "Content-Type: application/json" \
  -d '{"action":"info"}'
```

### Testing
```bash
# Check bot info
curl https://api.telegram.org/bot8223188024:AAGh4yp3bB0QdkI8YCEwbJFzMXOFewqimn0/getMe

# Get webhook status
curl https://api.telegram.org/bot8223188024:AAGh4yp3bB0QdkI8YCEwbJFzMXOFewqimn0/getWebhookInfo

# Set webhook (already done)
curl -X POST https://api.telegram.org/bot8223188024:AAGh4yp3bB0QdkI8YCEwbJFzMXOFewqimn0/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://privatepay.site/api/telegram/webhook"}'
```

### Monitoring
Check logs in Vercel dashboard:
- Incoming webhooks: `app/api/telegram/webhook`
- Auth requests: `app/api/telegram/auth`
- Bot logic errors: Check function logs in `lib/telegram.ts`

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Bot not responding | Check webhook status, verify env var set |
| "Not linked" error | User must complete /start flow first |
| Card details show other user | Query has userId filter — not possible |
| Commands don't appear | Run `/setMyCommands` or wait 5 min |
| 10-minute link expired | Send /start again to get new link |

---

**Status**: ✅ Production Ready  
**Users**: Can start using immediately after deploy  
**Support**: All intents + natural language supported  
