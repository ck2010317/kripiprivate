import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { createToken, setAuthCookie } from "@/lib/auth"

function generateReferralCode(): string {
  return "PP" + crypto.randomBytes(4).toString("hex").toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, referralCode } = await request.json()

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      )
    }

    // Look up referrer if referral code provided
    let referredById: string | null = null
    if (referralCode && typeof referralCode === "string" && referralCode.trim()) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim() },
      })
      if (referrer) {
        referredById = referrer.id
      }
      // Silently ignore invalid referral codes — don't block signup
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate a unique referral code for the new user
    const newReferralCode = generateReferralCode()

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        referredById,
        referralCode: newReferralCode,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        referralCode: true,
      },
    })

    // Create JWT token
    const token = await createToken({ userId: user.id, email: user.email })

    // Set cookie
    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      user,
      token,
    })
  } catch (error) {
    console.error("[Auth] Signup error:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
