# PrivatePay

**Privacy-first virtual card issuing platform powered by Solana payments.**

Issue, fund, and manage Visa/Mastercard virtual cards via API or dashboard — paid entirely with SOL.

🌐 **Live:** [kripiprivate.vercel.app](https://kripiprivate.vercel.app)

---

## The Problem

Businesses and developers who want to issue virtual cards programmatically face a fragmented landscape:

- Card issuing APIs (Stripe Issuing, Marqeta) charge thousands in setup fees and require US entities
- None accept crypto payments
- Crypto-native businesses holding SOL have no direct path to spendable virtual cards without centralized exchanges, KYC-heavy on-ramps, and traditional banking rails

## The Solution

PrivatePay accepts SOL as payment and issues real Visa/Mastercard virtual cards in seconds. It provides:

- **Consumer Dashboard** — Buy and manage virtual cards, fund with SOL, view transactions
- **Developer API** — White-label card issuing API with Bearer token auth, rate limiting, wallet system
- **Cross-Chain Bridge** — deBridge DLN integration for Solana-to-EVM swaps

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React, Tailwind CSS |
| Backend | Next.js API Routes (App Router) |
| Database | Neon PostgreSQL (serverless) |
| ORM | Prisma 7 with PrismaPg adapter |
| Blockchain | Solana (Mainnet via Helius RPC) |
| Card Issuing | KripiCard REST API |
| Bridge | deBridge DLN API |
| Hosting | Vercel |

### Solana Integration

All payments flow through native SOL transfers with on-chain verification:

```
User wants card → POST /api/payments (creates payment with SOL conversion)
                → CoinGecko API fetches real-time SOL/USD price (60s cache, 2% buffer)
                → User sends exact SOL amount to treasury wallet
                → POST /api/payments/auto-verify
                → Helius RPC: getSignaturesForAddress scans last 100 txs
                → Matches sender address + amount within tolerance
                → Payment marked VERIFIED → Card issued via KripiCard API
```

**Treasury Wallet:** `2WWEW2Ry4XvBP1eQWuS1iKb515UBnkFDuLUsbwYvbxqj`

### Developer API

White-label card issuing API for businesses:

```bash
# Issue a card
curl -X POST https://privatepay.site/api/v1/cards \
  -H "Authorization: Bearer ppay_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "name_on_card": "JOHN DOE", "email": "john@example.com"}'
```

**API Features:**
- Bearer token authentication (`ppay_live_` / `ppay_test_` prefixed keys)
- SHA-256 hashed key storage
- Per-key rate limiting (requests/min)
- Wallet balance system with atomic transactions
- Usage tracking and analytics
- Webhook support for card events

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/cards` | Issue a virtual card (deducts from wallet) |
| `GET /api/v1/cards` | List all cards |
| `GET /api/v1/cards/:id` | Get card details |
| `POST /api/v1/cards/:id/fund` | Fund a card (deducts from wallet) |
| `GET /api/v1/cards/:id/transactions` | Card transaction history |
| `GET/POST /api/v1/keys` | Manage API keys |
| `GET /api/v1/wallet` | Wallet balance + transaction history |
| `POST /api/v1/wallet/deposit` | Deposit funds via verified SOL payment |
| `GET /api/v1/usage` | Usage analytics |
| `GET /api/v1/plans` | Available pricing plans |

### Payment Verification Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend    │────▶│  /api/payments│────▶│  CoinGecko API  │
│  (React)     │     │  (create)    │     │  (SOL/USD price) │
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
                    ┌──────────────┐     ┌──────────────┐
                    │  KripiCard   │────▶│  Virtual Card │
                    │  API         │     │  Issued!      │
                    └──────────────┘     └──────────────┘
```

### Database Schema

Key models (Prisma):

- **User** — Email/password auth with JWT sessions
- **Card** — Virtual cards linked to KripiCard API
- **Payment** — SOL payment records with verification status
- **ApiKey** — Developer API keys with wallet balance, rate limits
- **ApiPlan** — Pricing tiers (Starter $2,999 / Growth $7,999)
- **ApiTransaction** — Wallet deposits, card issuance fees, refunds
- **ApiCard** — Cards issued via the developer API

### Cross-Chain Bridge

deBridge DLN integration enables Solana-to-EVM token swaps:

- Fetches supported chains and tokens from deBridge API
- Creates cross-chain swap orders
- Tracks order status via deBridge order API
- Supports Solana ↔ Ethereum, BSC, Polygon, Arbitrum, etc.

---

## Pricing

| Plan | Price | Cards/Month | Card Fee | Markup |
|------|-------|-------------|----------|--------|
| Starter | $2,999 (one-time) | 500 | $20/card | 3% + $1 |
| Growth | $7,999 (one-time) | 2,500 | $9/card | 2% + $1 |

All payments accepted in SOL.

---

## Project Structure

```
app/
  api/
    v1/           # Developer API (cards, keys, wallet, usage, plans)
    payments/     # SOL payment creation + verification
    auth/         # Login, signup, session management
    admin/        # Admin dashboard endpoints
    cards/        # Consumer card management
  developers/     # Developer portal + API docs
  bridge/         # Cross-chain bridge UI
  components/     # React components (dashboard, auth, card management)
  context/        # Auth context provider

lib/
  auth.ts             # JWT auth + session management
  prisma.ts           # Prisma client singleton
  api-middleware.ts   # API key auth, rate limiting, usage tracking
  solana-payment.ts   # Solana payment utilities
  solana-verify.ts    # On-chain transaction verification
  kripicard-client.ts # KripiCard API client
  debridge.ts         # deBridge DLN bridge client
  sweep-funds.ts      # Fund sweeping utilities

prisma/
  schema.prisma       # Database schema (14 models)
```

---

## Running Locally

```bash
pnpm install
cp .env.example .env.local  # Add your keys
npx prisma generate
npx prisma db push
pnpm dev
```

**Required Environment Variables:**
- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `HELIUS_RPC_URL` — Helius Mainnet RPC endpoint
- `KRIPICARD_API_KEY` — KripiCard API key
- `PAYMENT_WALLET` — Solana treasury wallet address

---

## Built for Colosseum Agent Hackathon

This project was built by an AI agent for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon/) — Solana's first hackathon for AI agents.

**Agent:** privatepay-agent (ID: 3921)
**Prize Pool:** $100,000 USDC
