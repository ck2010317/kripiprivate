# Setting Up the Database for PrivatePay

## Quick Setup Options

### Option 1: Supabase (Recommended for Development)
**Easiest and fastest - completely free tier**

1. Go to https://supabase.com and sign up
2. Create a new project
3. Copy your connection string from Settings → Database
4. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
   ```
5. Run migrations:
   ```bash
   npx prisma db push
   ```

### Option 2: Railway
**Also free, good for quick development**

1. Go to https://railway.app
2. Create new project → PostgreSQL
3. Get connection string from the PostgreSQL service
4. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://...
   ```
5. Run migrations:
   ```bash
   npx prisma db push
   ```

### Option 3: Local PostgreSQL via Homebrew (macOS)
**If you have PostgreSQL installed locally**

1. Install PostgreSQL:
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```

2. Create database:
   ```bash
   createdb privatepay
   ```

3. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres@localhost:5432/privatepay
   ```

4. Run migrations:
   ```bash
   npx prisma db push
   ```

## After Setting DATABASE_URL

Once you have a database connection string set in `.env.local`:

1. **Push schema to database:**
   ```bash
   npx prisma db push
   ```

2. **Inspect data (optional):**
   ```bash
   npx prisma studio
   ```

3. **Restart the dev server:**
   ```bash
   pnpm dev
   ```

## Troubleshooting

**Error: ECONNREFUSED**
- Database is not running or connection string is wrong
- Check `.env.local` has correct DATABASE_URL
- Verify database is accessible from your machine

**Error: Database does not exist**
- Create the database manually or let Prisma create it
- Run: `npx prisma db push` to create tables

**Error: Column "id" does not exist**
- Schema wasn't pushed to database
- Run: `npx prisma db push`

## What Gets Created

When you run `npx prisma db push`, these tables are created:
- `User` - User accounts (email, password, name)
- `Card` - Virtual cards (cardNumber, balance, status, etc.)
- `Session` - JWT session tracking

You're then ready to test signup/login!
