-- Telegram Bot Integration
-- Links Telegram accounts to PrivatePay users

-- TelegramLink: permanent mapping between Telegram user and PrivatePay user
CREATE TABLE IF NOT EXISTS "TelegramLink" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "firstName" TEXT,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAction" TEXT,
    "lastActionData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramLink_pkey" PRIMARY KEY ("id")
);

-- TelegramAuthToken: one-time tokens for linking (10-min expiry)
CREATE TABLE IF NOT EXISTS "TelegramAuthToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramAuthToken_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramLink_telegramId_key" ON "TelegramLink"("telegramId");
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramLink_userId_key" ON "TelegramLink"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramAuthToken_token_key" ON "TelegramAuthToken"("token");

-- Performance indexes
CREATE INDEX IF NOT EXISTS "TelegramLink_telegramId_idx" ON "TelegramLink"("telegramId");
CREATE INDEX IF NOT EXISTS "TelegramLink_userId_idx" ON "TelegramLink"("userId");
CREATE INDEX IF NOT EXISTS "TelegramAuthToken_token_idx" ON "TelegramAuthToken"("token");
CREATE INDEX IF NOT EXISTS "TelegramAuthToken_telegramId_idx" ON "TelegramAuthToken"("telegramId");

-- Foreign keys
ALTER TABLE "TelegramLink" ADD CONSTRAINT "TelegramLink_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
