import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Get the current user's store (private endpoint)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const store = await prisma.store.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        solWallet: true,
        totalSales: true,
        totalOrders: true,
        rating: true,
        reviewCount: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: { products: true, reviews: true },
        },
      },
    })

    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      store: {
        ...store,
        productCount: store._count.products,
        reviewCount: store._count.reviews,
      },
    })
  } catch (error) {
    console.error("[Marketplace] Get my store error:", error)
    return NextResponse.json(
      { error: "Failed to fetch store" },
      { status: 500 }
    )
  }
}
