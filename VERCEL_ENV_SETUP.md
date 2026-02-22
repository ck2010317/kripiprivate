# Vercel Environment Variables Setup

The application is failing on Vercel because environment variables are not configured. Follow these steps to fix it:

## Required Environment Variables for Vercel

You need to set these variables in the Vercel dashboard:

### 1. Database Configuration
- **Key**: `DATABASE_URL`
- **Value**: `postgresql://neondb_owner:npg_e7fLJ8XWxAIO@ep-ancient-mouse-aiafcyi4-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require`

### 2. JWT Secret (Authentication)
- **Key**: `JWT_SECRET`
- **Value**: `sMRmv91fQgsJRFaaoosHrTYC62OSQed/kYlxKc0YMnk=`
- ⚠️ **Important**: Generate a new one if deploying for real using: `openssl rand -base64 32`

### 3. KripiCard API
- **Key**: `KRIPICARD_API_KEY`
- **Value**: `2b1f645315fb1950339e89b2be619a42321f49f1`

### 4. Solana Configuration
- **Key**: `PAYMENT_WALLET`
- **Value**: `F4ZYTm8goUhKVQ8W5LmsrkrpsVoLPGtyykGnYau8676t`

- **Key**: `SOLANA_RPC_URL`
- **Value**: `https://mainnet.helius-rpc.com/?api-key=f3417b56-61ad-4ba8-b0f9-3695ea859a58`

- **Key**: `MASTER_WALLET_PRIVATE_KEY`
- **Value**: (Leave as placeholder for now, or provide your actual private key in base64)

## How to Set Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project: `kripiprivate`
3. Click on "Settings" tab
4. Go to "Environment Variables" section
5. Click "Add New" for each variable above
6. Select "Production" for the environment
7. Click "Save"
8. **Redeploy**: After adding all variables, trigger a redeploy (Git push or manual redeploy from dashboard)

## Verification

After setting all variables and redeploying:
1. Test signup: `curl -X POST https://kripiprivate.vercel.app/api/auth/signup -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"pass123","name":"Test"}'`
2. Should return: `{"success":true,"user":{...},"token":"..."}`

## Database Initialization

The Neon database should already have the schema from previous deployments. If tables are missing, run:
```bash
npx prisma db push --skip-generate
```

