import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 400 }
      )
    }

    // Hash password if provided, otherwise create random one
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : await bcrypt.hash(Math.random().toString(36).slice(2), 10)

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    })

    return NextResponse.json({
      success: true,
      message: `User created successfully for ${email}`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    })
  } catch (error) {
    console.error("[Create User] Error:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}

// Also allow GET to list all users (for debugging)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: {
          select: { cards: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      users,
    })
  } catch (error) {
    console.error("[List Users] Error:", error)
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    )
  }
}
