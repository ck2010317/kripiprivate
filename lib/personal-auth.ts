import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Generate a personal access token
export function generatePersonalToken(): string {
  const randomPart = crypto.randomBytes(32).toString("base64url");
  return `pat_${randomPart}`;
}

// Hash token for storage
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Available scopes
export const AVAILABLE_SCOPES = [
  "read:profile",
  "read:cards",
  "read:transactions",
  "read:payments",
  "read:referrals",
] as const;

export type Scope = (typeof AVAILABLE_SCOPES)[number];

export interface PersonalAuthContext {
  userId: string;
  email: string;
  name: string;
  scopes: Scope[];
  tokenId: string;
}

// Authenticate a personal access token from request
// Returns the user context if valid, null otherwise
export async function authenticatePersonalToken(
  req: NextRequest
): Promise<PersonalAuthContext | null> {
  // Extract token from Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer pat_")) {
    return null;
  }

  const rawToken = authHeader.slice(7).trim();
  const hashed = hashToken(rawToken);

  // Look up token
  const tokenRecord = await prisma.personalAccessToken.findFirst({
    where: {
      hashedToken: hashed,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!tokenRecord) {
    return null;
  }

  // Check expiry
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return null;
  }

  // Update last used (don't await, fire and forget)
  prisma.personalAccessToken
    .update({
      where: { id: tokenRecord.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  const scopes = tokenRecord.scopes.split(",").map((s: string) => s.trim()) as Scope[];

  return {
    userId: tokenRecord.user.id,
    email: tokenRecord.user.email,
    name: tokenRecord.user.name,
    scopes,
    tokenId: tokenRecord.id,
  };
}

// Check if a context has a required scope
export function hasScope(ctx: PersonalAuthContext, scope: Scope): boolean {
  return ctx.scopes.includes(scope);
}

// Simple rate limiter for personal tokens
const personalRateLimit = new Map<
  string,
  { count: number; resetAt: number }
>();

export function checkPersonalRateLimit(tokenId: string): {
  allowed: boolean;
  remaining: number;
} {
  const LIMIT = 30; // 30 requests per minute
  const WINDOW = 60_000;
  const now = Date.now();

  const entry = personalRateLimit.get(tokenId);
  if (!entry || now > entry.resetAt) {
    personalRateLimit.set(tokenId, { count: 1, resetAt: now + WINDOW });
    return { allowed: true, remaining: LIMIT - 1 };
  }

  entry.count++;
  if (entry.count > LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: LIMIT - entry.count };
}
