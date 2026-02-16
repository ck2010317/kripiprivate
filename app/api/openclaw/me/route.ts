import { NextRequest, NextResponse } from "next/server";
import {
  authenticatePersonalToken,
  checkPersonalRateLimit,
  hasScope,
} from "@/lib/personal-auth";

// GET /api/openclaw/me — Get authenticated user's profile
export async function GET(req: NextRequest) {
  try {
    const ctx = await authenticatePersonalToken(req);

    if (!ctx) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          hint: "Pass your personal token via: Authorization: Bearer pat_xxxxx",
        },
        { status: 401 }
      );
    }

    // Rate limit
    const rateCheck = checkPersonalRateLimit(ctx.tokenId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 30 requests/minute." },
        { status: 429 }
      );
    }

    // Check scope
    if (!hasScope(ctx, "read:profile")) {
      return NextResponse.json(
        { error: "Token missing scope: read:profile" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: ctx.userId,
        email: ctx.email,
        name: ctx.name,
      },
    });
  } catch (error) {
    console.error("[OpenClaw Me] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
