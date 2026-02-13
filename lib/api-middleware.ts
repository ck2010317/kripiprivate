import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface ApiContext {
  apiKey: {
    id: string;
    key: string;
    userId: string;
    planId: string;
    isTest: boolean;
    rateLimit: number;
    monthlyLimit: number;
    totalCards: number;
    walletBalance: number;
    totalDeposited: number;
    totalCharged: number;
    totalVolume: number;
    allowedIps: string | null;
    webhookUrl: string | null;
    webhookSecret: string | null;
    plan: {
      name: string;
      cardsPerMonth: number;
      requestsPerMin: number;
      cardIssueFee: number;
      cardFundFee: number;
      markupPercent: number;
      liveCards: boolean;
      testMode: boolean;
      webhooks: boolean;
      ipWhitelist: boolean;
    };
  };
}

// Hash API key for storage/lookup
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Generate a new API key
export function generateApiKey(isTest: boolean = false): string {
  const prefix = isTest ? "ppay_test_" : "ppay_live_";
  const randomPart = crypto.randomBytes(24).toString("base64url");
  return `${prefix}${randomPart}`;
}

// Rate limiting using simple in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(keyId: string, limit: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  const entry = rateLimitStore.get(keyId);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(keyId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Main middleware: authenticate API key, check limits, track usage
export async function withApiKey(
  req: NextRequest,
  handler: (req: NextRequest, ctx: ApiContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  let statusCode = 200;

  // Extract API key from header
  const authHeader = req.headers.get("authorization");
  const apiKeyParam = req.nextUrl.searchParams.get("api_key");
  
  let rawKey: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    rawKey = authHeader.slice(7).trim();
  } else if (apiKeyParam) {
    rawKey = apiKeyParam;
  }

  if (!rawKey) {
    return NextResponse.json(
      {
        error: {
          code: "missing_api_key",
          message: "API key is required. Pass it via Authorization: Bearer ppay_live_xxx header.",
        },
      },
      { status: 401 }
    );
  }

  if (!rawKey.startsWith("ppay_live_") && !rawKey.startsWith("ppay_test_")) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_api_key",
          message: "Invalid API key format. Keys start with ppay_live_ or ppay_test_.",
        },
      },
      { status: 401 }
    );
  }

  // Look up key
  const hashed = hashApiKey(rawKey);
  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: { hashedKey: hashed, isActive: true },
    include: { plan: true },
  });

  if (!apiKeyRecord) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_api_key",
          message: "API key not found or has been revoked.",
        },
      },
      { status: 401 }
    );
  }

  // Check IP whitelist
  if (apiKeyRecord.allowedIps) {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const allowed = apiKeyRecord.allowedIps.split(",").map((ip) => ip.trim());
    if (!allowed.includes(clientIp) && !allowed.includes("*")) {
      return NextResponse.json(
        {
          error: {
            code: "ip_not_allowed",
            message: `IP ${clientIp} is not in the allowed list for this API key.`,
          },
        },
        { status: 403 }
      );
    }
  }

  // Rate limiting
  const rateCheck = checkRateLimit(apiKeyRecord.id, apiKeyRecord.plan.requestsPerMin);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "rate_limit_exceeded",
          message: `Rate limit of ${apiKeyRecord.plan.requestsPerMin} requests/minute exceeded. Try again later.`,
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(apiKeyRecord.plan.requestsPerMin),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rateCheck.resetAt / 1000)),
          "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // Monthly card limit check
  if (apiKeyRecord.totalCards >= apiKeyRecord.plan.cardsPerMonth) {
    const isCardCreate = req.method === "POST" && req.nextUrl.pathname.endsWith("/cards");
    if (isCardCreate) {
      return NextResponse.json(
        {
          error: {
            code: "monthly_limit_reached",
            message: `Monthly card limit of ${apiKeyRecord.plan.cardsPerMonth} reached. Upgrade your plan for more.`,
          },
        },
        { status: 403 }
      );
    }
  }

  const ctx: ApiContext = {
    apiKey: {
      id: apiKeyRecord.id,
      key: rawKey,
      userId: apiKeyRecord.userId,
      planId: apiKeyRecord.planId,
      isTest: apiKeyRecord.isTest,
      rateLimit: apiKeyRecord.rateLimit,
      monthlyLimit: apiKeyRecord.monthlyLimit,
      totalCards: apiKeyRecord.totalCards,
      walletBalance: apiKeyRecord.walletBalance,
      totalDeposited: apiKeyRecord.totalDeposited,
      totalCharged: apiKeyRecord.totalCharged,
      totalVolume: apiKeyRecord.totalVolume,
      allowedIps: apiKeyRecord.allowedIps,
      webhookUrl: apiKeyRecord.webhookUrl,
      webhookSecret: apiKeyRecord.webhookSecret,
      plan: {
        name: apiKeyRecord.plan.name,
        cardsPerMonth: apiKeyRecord.plan.cardsPerMonth,
        requestsPerMin: apiKeyRecord.plan.requestsPerMin,
        cardIssueFee: apiKeyRecord.plan.cardIssueFee,
        cardFundFee: apiKeyRecord.plan.cardFundFee,
        markupPercent: apiKeyRecord.plan.markupPercent,
        liveCards: apiKeyRecord.plan.liveCards,
        testMode: apiKeyRecord.plan.testMode,
        webhooks: apiKeyRecord.plan.webhooks,
        ipWhitelist: apiKeyRecord.plan.ipWhitelist,
      },
    },
  };

  try {
    const response = await handler(req, ctx);
    statusCode = response.status;

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", String(apiKeyRecord.plan.requestsPerMin));
    response.headers.set("X-RateLimit-Remaining", String(rateCheck.remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateCheck.resetAt / 1000)));

    return response;
  } catch (err) {
    statusCode = 500;
    console.error("[PrivatePay API] Handler error:", err);
    return NextResponse.json(
      {
        error: {
          code: "internal_error",
          message: "An unexpected error occurred. Please try again.",
        },
      },
      { status: 500 }
    );
  } finally {
    // Track usage async (don't block response)
    const responseTime = Date.now() - startTime;
    prisma.apiUsage
      .create({
        data: {
          apiKeyId: apiKeyRecord.id,
          endpoint: req.nextUrl.pathname,
          method: req.method,
          statusCode,
          responseTime,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          userAgent: req.headers.get("user-agent"),
        },
      })
      .catch(() => {}); // Swallow usage tracking errors

    // Update last used
    prisma.apiKey
      .update({
        where: { id: apiKeyRecord.id },
        data: {
          lastUsedAt: new Date(),
          totalRequests: { increment: 1 },
        },
      })
      .catch(() => {});
  }
}

// Webhook helper: send event to customer's webhook URL
export async function sendWebhook(
  webhookUrl: string,
  webhookSecret: string | null,
  event: string,
  data: Record<string, unknown>
) {
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (webhookSecret) {
    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");
    headers["X-PrivatePay-Signature"] = signature;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: payload,
    });
  } catch (err) {
    console.error("[Webhook] Failed to send:", err);
  }
}

// Test mode card data generator
export function generateTestCard() {
  const num = `4111${Math.random().toString().slice(2, 14).padEnd(12, "0")}`;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const year = String(new Date().getFullYear() + 3).slice(-2);
  return {
    card_id: `test_${crypto.randomBytes(8).toString("hex")}`,
    card_number: num,
    expiry_date: `${month}/${year}`,
    cvv: String(Math.floor(Math.random() * 900) + 100),
    balance: 0,
    status: "ACTIVE",
    name_on_card: "TEST CARD",
  };
}
