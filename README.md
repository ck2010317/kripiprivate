# PrivatePay 🔐

**The privacy-first Solana ecosystem for real-world spending — cards, bridge, gifts, eSIM, transfers, and shopping. All powered by SOL. No KYC.**

🌐 **Live:** [privatepay.site](https://privatepay.site)  
🐦 **Twitter:** [@Privatepay_](https://x.com/Privatepay_)

---

## 🧩 The Ecosystem

PrivatePay isn't just one product — it's an entire suite of privacy-first services, all accepting SOL natively:

| Product | What It Does | Link |
|---------|-------------|------|
| **PrivatePay** | Non-KYC virtual Visa/Mastercard cards — issue, fund, manage | [privatepay.site](https://privatepay.site) |
| **PrivatePay API** | White-label card issuing API for developers | [privatepay.site/developers](https://privatepay.site/developers) |
| **PrivateBridge** | Cross-chain bridge (Solana ↔ EVM) via deBridge DLN | [privatepay.site/bridge](https://privatepay.site/bridge) |
| **PrivateShop** | Anonymous merchant store, pay with SOL | [privatepay.site/shop](https://privatepay.site/shop) |
| **PrivateGifts** | Gift cards purchased with SOL | [privategiftcards.vercel.app](https://privategiftcards.vercel.app) |
| **PrivateSim** | eSIM plans purchased with SOL — no ID required | [privatesim.site](https://www.privatesim.site) |
| **PrivateTransfer** | Peer-to-peer SOL transfers and transfer-by-link | [privatetransfer.site](https://www.privatetransfer.site) |

---

## 🔥 The Problem

Crypto holders sitting on SOL have no easy way to spend it in the real world:

- **Virtual cards?** Stripe Issuing requires US entity + KYC. Marqeta takes 6 months. None accept crypto.
- **Gift cards?** Centralized platforms require accounts and identity verification.
- **eSIMs?** Traditional telcos want your passport and credit card.
- **Cross-chain?** Most bridges are confusing, expensive, or unreliable.
- **Transfers?** Sending value to someone without a wallet? Forget it.

**PrivatePay solves all of this.** One ecosystem, one payment method (SOL), zero KYC.

---

## 🏗 Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | Next.js API Routes (App Router) |
| Database | Neon PostgreSQL (serverless) |
| ORM | Prisma 7 with PrismaPg adapter |
| Blockchain | Solana Mainnet via Helius RPC |
| Bridge | deBridge DLN API |
| Hosting | Vercel (Edge) |

### Solana Payment Verification

Every product in the ecosystem shares the same on-chain payment verification engine:

```
1. User initiates purchase (card, gift, eSIM, etc.)
2. POST /api/payments → creates payment record
   → CoinGecko API: real-time SOL/USD price (60s cache, 2% buffer)
   → Calculates exact SOL amount with unique precision
3. User sends SOL from any wallet (Phantom, Solflare, etc.)
   → To treasury wallet: F4ZYTm8goUhKVQ8W5LmsrkrpsVoLPGtyykGnYau8676t
4. POST /api/payments/auto-verify
   → Helius RPC: getSignaturesForAddress (last 100 txs)
   → getTransaction for each: extracts sender, amount, timestamp
   → Matches by amount within tolerance (±0.5%)
   → Payment marked VERIFIED
5. Product fulfilled (card issued, gift card sent, etc.)
```

### Developer API (PrivatePay API)

White-label card issuing for businesses — integrate in minutes:

```bash
# Issue a virtual card
curl -X POST https://privatepay.site/api/v1/cards \
  -H "Authorization: Bearer ppay_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "name_on_card": "JOHN DOE", "email": "john@example.com"}'

# Response
{
  "card_id": "card_7x1k9m2p",
  "card_number": "4938••••••••2345",
  "expiry_date": "03/28",
  "balance": 100.00,
  "status": "active"
}
```

**API Features:**
- Bearer token auth (`ppay_live_` / `ppay_test_` prefixed keys)
- SHA-256 hashed key storage — raw keys never stored
- Per-key rate limiting and monthly card quotas
- Wallet balance system with atomic Prisma transactions
- Usage analytics and reporting
- Webhook support for card lifecycle events
- Test mode with sandbox cards (no charges)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/cards` | `POST` | Issue a virtual card (deducts from wallet) |
| `/api/v1/cards` | `GET` | List all cards for this API key |
| `/api/v1/cards/:id` | `GET` | Get full card details (number, CVV, expiry) |
| `/api/v1/cards/:id` | `PATCH` | Freeze/unfreeze a card |
| `/api/v1/cards/:id/fund` | `POST` | Add funds to a card (deducts from wallet) |
| `/api/v1/cards/:id/transactions` | `GET` | Card transaction history |
| `/api/v1/keys` | `GET/POST` | List or create API keys |
| `/api/v1/keys/:id` | `DELETE` | Revoke an API key |
| `/api/v1/wallet` | `GET` | Wallet balance + transaction history |
| `/api/v1/wallet/deposit` | `POST` | Deposit funds via verified SOL payment |
| `/api/v1/usage` | `GET` | Usage analytics (requests, cards, volume) |
| `/api/v1/plans` | `GET` | Available pricing plans |

### Payment Verification Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend    │────▶│ /api/payments │────▶│  CoinGecko API  │
│  (React)     │     │  (create)     │     │  (SOL/USD price) │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                    │
       │ User sends SOL     │ Payment record (PENDING)
       ▼                    ▼
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Phantom /   │     │ /api/payments/   │────▶│  Helius RPC  │
│  Solflare    │     │ auto-verify      │     │  (Mainnet)   │
└─────────────┘     └──────────────────┘     └──────────────┘
                           │                        │
                           │ Match tx by amount      │ getSignaturesForAddress
                           ▼                        │ getTransaction
                    ┌──────────────┐                │
                    │  Payment     │◀───────────────┘
                    │  VERIFIED    │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────────────────────┐
                    │  Product Fulfilled            │
                    │  (card / gift / eSIM / etc.)  │
                    └──────────────────────────────┘
```

### PrivateBridge (Cross-Chain)

deBridge DLN integration for trustless cross-chain swaps:

- Solana ↔ Ethereum, BSC, Polygon, Arbitrum, Avalanche, Base
- Real-time quote fetching with fee estimation
- Order tracking via deBridge order status API
- Token selector with chain-aware filtering

### Database Schema (Prisma 7)

14 models powering the ecosystem:

- **User** — Email/password auth with JWT sessions
- **Card** — Virtual cards with balance tracking
- **Payment** — SOL payment records with on-chain verification status
- **CardTransaction** — Card spending/funding history
- **Session** — JWT session management
- **ApiKey** — Developer API keys with wallet balance, rate limits, usage stats
- **ApiPlan** — Pricing tiers (Starter / Growth)
- **ApiUsage** — Per-request logging (endpoint, method, response time, IP)
- **ApiTransaction** — Wallet ledger (deposits, card fees, refunds)
- **ApiCard** — Cards issued through the developer API

---

## 💰 Pricing (Developer API)

| Plan | Price | Cards/Month | Card Fee | Funding Markup |
|------|-------|-------------|----------|----------------|
| Starter | $2,999 (one-time) | 500 | $20/card | 3% + $1 |
| Growth | $7,999 (one-time) | 2,500 | $9/card | 2% + $1 |

All payments in SOL. Wallet system — deposit once, issue cards on demand.

---

## 📁 Project Structure

```
app/
  page.tsx              # Landing page (ecosystem overview)
  api/
    v1/                 # Developer API
      cards/            #   Card issuance, details, funding, transactions
      keys/             #   API key management
      wallet/           #   Wallet balance, deposits
      usage/            #   Usage analytics
      plans/            #   Pricing plans
    payments/           # SOL payment creation + on-chain verification
    auth/               # Login, signup, logout, session
    admin/              # Admin dashboard, card management, wallet deposits
    cards/              # Consumer card endpoints
    shop/               # PrivateShop order processing
    chat/               # Support chat
  developers/           # Developer portal + API documentation
    page.tsx            #   Dashboard (purchase packages, manage keys, wallet)
    docs/page.tsx       #   Full API reference
  bridge/               # PrivateBridge (cross-chain swaps)
  shop/                 # PrivateShop (merchant store)
  components/
    user-dashboard.tsx      # Consumer card dashboard
    card-purchase.tsx       # Card purchase flow with SOL payment
    cards-dashboard.tsx     # Card management UI
    card-details-page.tsx   # Individual card view
    topup-modal.tsx         # Card funding modal
    issue-card-flow.tsx     # Step-by-step card issuance
    private-bridge-dapp.tsx # Bridge UI (chain/token selectors, swap)
    admin-dashboard.tsx     # Admin panel
    auth-modal.tsx          # Login/signup modal
    chat-widget.tsx         # Support chat widget

lib/
  auth.ts               # JWT auth, cookie sessions, getCurrentUser()
  prisma.ts             # Prisma client singleton (Neon adapter)
  api-middleware.ts      # API key auth, rate limiting, usage tracking
  solana-payment.ts      # SOL payment utilities
  solana-verify.ts       # On-chain transaction verification via Helius
  debridge.ts            # deBridge DLN bridge client
  hd-wallet.ts           # HD wallet derivation
  sweep-funds.ts         # Fund sweeping utilities
  token-gate.ts          # Token gating logic
  utils.ts               # Shared utilities

prisma/
  schema.prisma          # 14 models, 3 enums

scripts/
  seed-api-plans.ts      # Seed pricing plans
  001-006_*.sql          # Database migrations
```

---

## 🚀 Running Locally

```bash
git clone https://github.com/ck2010317/kripiprivate.git
cd kripiprivate
pnpm install
npx prisma generate
npx prisma db push
pnpm dev
```

**Environment Variables:**

```env
DATABASE_URL=              # Neon PostgreSQL connection string
JWT_SECRET=                # JWT signing secret
HELIUS_RPC_URL=            # Helius Mainnet RPC endpoint
PAYMENT_WALLET=            # Solana treasury wallet address
NEXT_PUBLIC_HELIUS_RPC=    # Public RPC for frontend
```

---

## 🏆 Colosseum Agent Hackathon

Built by an AI agent for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon/) — Solana's first hackathon for AI agents.

| | |
|---|---|
| **Agent** | privatepay-agent (ID: 3921) |
| **Project** | [colosseum.com/agent-hackathon/projects/privatepay](https://colosseum.com/agent-hackathon/projects/privatepay) |
| **Prize Pool** | $100,000 USDC |
| **Twitter** | [@Privatepay_](https://x.com/Privatepay_) |

---

## 📄 License

MIT
