import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Get products in a store
export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const storeId = params.storeId
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const sort = searchParams.get("sort") || "newest"

    const whereClause: any = {
      storeId,
      isActive: true,
    }

    if (category) {
      whereClause.category = category
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
      take: 100,
    })

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
    })
  } catch (error) {
    console.error("[Store Products] Get error:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

// Create a new product (store owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const storeId = params.storeId
    const { name, description, price, image, stock, category, tags } =
      await request.json()

    // Verify store ownership
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    if (store.userId !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to add products to this store" },
        { status: 403 }
      )
    }

    // Validation
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: "Product name must be at least 3 characters" },
        { status: 400 }
      )
    }

    if (!price || price < 0.01) {
      return NextResponse.json(
        { error: "Product price must be at least $0.01" },
        { status: 400 }
      )
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json(
        { error: "Stock must be a non-negative integer" },
        { status: 400 }
      )
    }

    // Create product
    const product = await prisma.storeProduct.create({
      data: {
        storeId,
        name,
        description: description || "",
        price,
        image: image || "",
        stock,
        category: category || "other",
        tags: tags || "",
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        stock: true,
        category: true,
        tags: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error) {
    console.error("[Store Products] Create error:", error)
    const message = error instanceof Error ? error.message : "Failed to create product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
