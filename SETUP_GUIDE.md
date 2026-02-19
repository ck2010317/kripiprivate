# PrivatePay - HD Wallet Payment System Setup Guide

## Overview
This system allows users to issue virtual cards paid with SOL cryptocurrency. Each user has their own dashboard where they can view and manage their cards.

## New Architecture (Updated)

### Authentication System
- User registration/login with email and password
- JWT-based session management
- Each user can only see their own cards

### Card System (KripiCard API)
- Cards are issued via KripiCard API
- Users can fund, freeze, and view their cards
- Full card details (number, CVV, expiry) stored securely

## Setup Steps

### 1. Environment Variables
Add these to your environment (`.env.local` or Vercel Environment Variables):

```bash
# Database (PostgreSQL required)
DATABASE_URL=postgresql://username:password@host:5432/database_name

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# KripiCard API
KRIPICARD_API_KEY=your-kripicard-api-key-here

# Solana (for payment processing)
MASTER_WALLET_PRIVATE_KEY=<your-base64-encoded-private-key>

# Supabase (if using for additional features)
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

### 2. Generate Master Wallet (for SOL payments)
Run the wallet generation script to create your master keypair:

```bash
node scripts/generate-wallet.js
```

This will output:
- **Public Key**: Your wallet address (where users send SOL)
- **Private Key**: Base64 encoded secret key (KEEP SECURE!)

### 3. Database Setup (Prisma)
Run Prisma migrations to create the database schema:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Or run migrations in production
npx prisma migrate deploy
```

### 4. KripiCard API Setup
The KripiCard API key is already configured. The system uses:
- **Bank BIN**: 49387520 (Visa)
- **API Endpoint**: https://kripicard.com/api/

### 5. Deploy to Vercel

```bash
# Build locally first to verify
pnpm build

# Deploy
vercel deploy --prod
```

## User Flow

1. **Landing Page**: User sees the product landing page
2. **Issue Cards Button**: If not logged in, shows login/signup modal
3. **Sign Up/Login**: User creates account or logs in
4. **Issue Card Flow**: 
   - Select card amount (e.g., $50, $100)
   - Enter name for the card
   - Pay with SOL
   - Card is created via KripiCard API
5. **Dashboard**: User sees all their cards with:
   - Card number (masked)
   - Balance
   - Status (active/frozen)
   - Actions (view details, fund, freeze/unfreeze)

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login existing user
- `POST /api/auth/logout` - Logout (clear session)
- `GET /api/auth/me` - Get current user

### Cards
- `GET /api/cards` - Get all cards for logged-in user
- `POST /api/cards` - Create a new card
- `GET /api/cards/[cardId]` - Get card details
- `POST /api/cards/[cardId]` - Fund or freeze/unfreeze card

## Security Notes

⚠️ **CRITICAL:**
- Never expose `MASTER_WALLET_PRIVATE_KEY` in client code
- Never expose `JWT_SECRET` 
- Only use secrets in server-side API routes
- All passwords are hashed with bcrypt (10 rounds)
- JWTs expire after 7 days

## Troubleshooting

**"MASTER_WALLET_PRIVATE_KEY environment variable not set"**
- Run `node scripts/generate-wallet.js`
- Add the MASTER_WALLET_PRIVATE_KEY to environment

**Database connection errors**
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check network access (firewall, Vercel allowed IPs)

**KripiCard API errors**
- Check API key is correct
- Verify card BIN is valid
- Check KripiCard API status

**JWT/Auth issues**
- Ensure JWT_SECRET is set
- Clear cookies and re-login
- Check cookie domain settings for production

## Support

For issues with:
- **Authentication**: Check lib/auth.ts and API routes
- **Cards**: Check lib/kripicard-client.ts
- **Database**: Run `npx prisma studio` to inspect data
- **Solana**: Check lib/solana-verify.ts

