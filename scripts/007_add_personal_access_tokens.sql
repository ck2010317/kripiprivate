-- ============================================
-- 007: Add Personal Access Tokens for OpenClaw AI Integration
-- Users can generate tokens to let their OpenClaw agent access their own data
-- ============================================

CREATE TABLE IF NOT EXISTS "PersonalAccessToken" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"        TEXT NOT NULL DEFAULT 'OpenClaw Agent',
  "token"       TEXT NOT NULL,
  "hashedToken" TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "scopes"      TEXT NOT NULL DEFAULT 'read:profile,read:cards,read:transactions,read:payments',
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt"  TIMESTAMP(3),
  "expiresAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PersonalAccessToken_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on token
CREATE UNIQUE INDEX IF NOT EXISTS "PersonalAccessToken_token_key" ON "PersonalAccessToken"("token");

-- Index for fast token lookup by hash
CREATE INDEX IF NOT EXISTS "PersonalAccessToken_hashedToken_idx" ON "PersonalAccessToken"("hashedToken");

-- Index for user's tokens
CREATE INDEX IF NOT EXISTS "PersonalAccessToken_userId_idx" ON "PersonalAccessToken"("userId");

-- Foreign key to User
ALTER TABLE "PersonalAccessToken" 
  ADD CONSTRAINT "PersonalAccessToken_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
