import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  generatePersonalToken,
  hashToken,
  AVAILABLE_SCOPES,
} from "@/lib/personal-auth";

// GET /api/openclaw/tokens - List user's personal tokens
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokens = await prisma.personalAccessToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        // NEVER return the actual token or hash
      },
    });

    return NextResponse.json({ success: true, tokens });
  } catch (error) {
    console.error("[OpenClaw Tokens] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

// POST /api/openclaw/tokens - Create a new personal access token
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = body.name || "OpenClaw Agent";
    const requestedScopes = body.scopes || AVAILABLE_SCOPES.join(",");
    const expiresInDays = body.expiresInDays || null; // null = never

    // Validate scopes
    const scopeList = requestedScopes.split(",").map((s: string) => s.trim());
    const validScopes = scopeList.filter((s: string) =>
      (AVAILABLE_SCOPES as readonly string[]).includes(s)
    );

    if (validScopes.length === 0) {
      return NextResponse.json(
        { error: "No valid scopes provided" },
        { status: 400 }
      );
    }

    // Limit to 5 active tokens per user
    const activeCount = await prisma.personalAccessToken.count({
      where: { userId: user.id, isActive: true },
    });

    if (activeCount >= 5) {
      return NextResponse.json(
        {
          error:
            "Maximum 5 active tokens allowed. Revoke an existing token first.",
        },
        { status: 400 }
      );
    }

    // Generate token
    const rawToken = generatePersonalToken();
    const hashed = hashToken(rawToken);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const token = await prisma.personalAccessToken.create({
      data: {
        name,
        token: rawToken,
        hashedToken: hashed,
        userId: user.id,
        scopes: validScopes.join(","),
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Return the raw token ONCE - user must save it
    return NextResponse.json({
      success: true,
      token: rawToken,
      details: token,
      warning:
        "Save this token now! You won't be able to see it again. Anyone with this token can access YOUR data only.",
    });
  } catch (error) {
    console.error("[OpenClaw Tokens] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}

// DELETE /api/openclaw/tokens - Revoke a token
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tokenId } = await req.json();

    if (!tokenId) {
      return NextResponse.json(
        { error: "Token ID required" },
        { status: 400 }
      );
    }

    // Ensure user owns this token
    const token = await prisma.personalAccessToken.findFirst({
      where: { id: tokenId, userId: user.id },
    });

    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    await prisma.personalAccessToken.update({
      where: { id: tokenId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Token revoked" });
  } catch (error) {
    console.error("[OpenClaw Tokens] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to revoke token" },
      { status: 500 }
    );
  }
}
