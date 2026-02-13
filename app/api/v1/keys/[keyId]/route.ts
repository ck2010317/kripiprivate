import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// DELETE /api/v1/keys/[keyId] — Revoke an API key
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Login required." } }, { status: 401 });
  }

  const { keyId } = await params;

  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, userId: user.id },
  });

  if (!key) {
    return NextResponse.json(
      { error: { code: "key_not_found", message: "API key not found." } },
      { status: 404 }
    );
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });

  return NextResponse.json({ message: "API key revoked successfully." });
}

// PATCH /api/v1/keys/[keyId] — Update API key settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Login required." } }, { status: 401 });
  }

  const { keyId } = await params;
  const body = await req.json();
  const { name, webhook_url, allowed_ips } = body;

  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, userId: user.id },
  });

  if (!key) {
    return NextResponse.json(
      { error: { code: "key_not_found", message: "API key not found." } },
      { status: 404 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (webhook_url !== undefined) updateData.webhookUrl = webhook_url;
  if (allowed_ips !== undefined) updateData.allowedIps = allowed_ips;

  const updated = await prisma.apiKey.update({
    where: { id: keyId },
    data: updateData,
    include: { plan: true },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    webhook_url: updated.webhookUrl,
    allowed_ips: updated.allowedIps,
    plan: updated.plan.displayName,
    message: "API key updated.",
  });
}
