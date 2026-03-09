import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Get the current user's store (private endpoint)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      // Not authenticated - return 401 to indicate user needs to login
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const store = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (!store) {
      // User is authenticated but has no store - return 404
      return NextResponse.json(
        { error: "No store found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        image: store.image,
        solWallet: store.solWallet,
        totalSales: store.totalSales,
        totalOrders: store.totalOrders,
        rating: store.rating,
        reviewCount: store.reviewCount,
        isActive: store.isActive,
        isVerified: store.isVerified,
        createdAt: store.createdAt,
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
