import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Get all active stores or create a new store
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("search")
    const sort = searchParams.get("sort") || "newest"

    // Public endpoint - list all stores
    const whereClause: any = { isActive: true }

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ]
    }

    const stores = await prisma.store.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        totalSales: true,
        totalOrders: true,
        rating: true,
        reviewCount: true,
        isVerified: true,
        _count: {
          select: { products: true },
        },
        createdAt: true,
      },
      orderBy:
        sort === "popular"
          ? { totalOrders: "desc" }
          : sort === "rating"
            ? { rating: "desc" }
            : { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      stores: stores.map((store) => ({
        ...store,
        productCount: store._count.products,
      })),
    })
  } catch (error) {
    console.error("[Marketplace] Get stores error:", error)
    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 }
    )
  }
}

// Create a new store for the current user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const { name, description, image } = await request.json()

    // Validation
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: "Store name must be at least 3 characters" },
        { status: 400 }
      )
    }

    // Check if user already has a store
    const existingStore = await prisma.store.findUnique({
      where: { userId: user.id },
    })

    if (existingStore) {
      return NextResponse.json(
        { error: "You already have a store. You can only own one store." },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    // Check if slug is unique
    const existingSlug = await prisma.store.findUnique({
      where: { slug },
    })

    if (existingSlug) {
      return NextResponse.json(
        {
          error: "Store name already taken. Please choose a different name.",
        },
        { status: 400 }
      )
    }

    // Create store
    const store = await prisma.store.create({
      data: {
        name,
        slug,
        description: description || "",
        image: image || "",
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        userId: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      store,
    })
  } catch (error) {
    console.error("[Marketplace] Create store error:", error)
    const message = error instanceof Error ? error.message : "Failed to create store"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
