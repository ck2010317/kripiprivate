export const maxDuration = 10

import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Get all products across all stores (marketplace browse)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const category = searchParams.get("category")
    const storeId = searchParams.get("store")
    const sort = searchParams.get("sort") || "newest"
    const limit = parseInt(searchParams.get("limit") || "50")

    const whereClause: any = {
      isActive: true,
      store: { isActive: true },
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { contains: search, mode: "insensitive" } },
      ]
    }

    if (category) {
      whereClause.category = category
    }

    if (storeId) {
      whereClause.storeId = storeId
    }

    const products = await prisma.storeProduct.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        stock: true,
        category: true,
        soldCount: true,
        rating: true,
        reviewCount: true,
        storeId: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            rating: true,
          },
        },
        createdAt: true,
      },
      orderBy:
        sort === "price-asc"
          ? { price: "asc" }
          : sort === "price-desc"
            ? { price: "desc" }
            : sort === "rating"
              ? { rating: "desc" }
              : sort === "popular"
                ? { soldCount: "desc" }
                : { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
    })
  } catch (error) {
    console.error("[Marketplace] Browse error:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}
