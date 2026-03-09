export const maxDuration = 10

import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Get a single product
export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string; productId: string } }
) {
  try {
    const product = await prisma.storeProduct.findFirst({
      where: {
        id: params.productId,
        storeId: params.storeId,
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
        soldCount: true,
        rating: true,
        reviewCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        store: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error) {
    console.error("[Product] Get error:", error)
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    )
  }
}

// Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: { storeId: string; productId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const { storeId, productId } = params
    const { name, description, price, image, stock, category, tags, isActive } =
      await request.json()

    // Verify ownership
    const product = await prisma.storeProduct.findUnique({
      where: { id: productId },
      include: { store: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    if (product.store.userId !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to update this product" },
        { status: 403 }
      )
    }

    // Prepare update
    const updateData: any = {}

    if (name !== undefined) {
      if (name.trim().length < 3) {
        return NextResponse.json(
          { error: "Product name must be at least 3 characters" },
          { status: 400 }
        )
      }
      updateData.name = name
    }

    if (description !== undefined) updateData.description = description
    if (price !== undefined) {
      if (price < 0.01) {
        return NextResponse.json(
          { error: "Price must be at least $0.01" },
          { status: 400 }
        )
      }
      updateData.price = price
    }
    if (image !== undefined) updateData.image = image
    if (stock !== undefined) {
      if (!Number.isInteger(stock) || stock < 0) {
        return NextResponse.json(
          { error: "Stock must be a non-negative integer" },
          { status: 400 }
        )
      }
      updateData.stock = stock
    }
    if (category !== undefined) updateData.category = category
    if (tags !== undefined) updateData.tags = tags
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedProduct = await prisma.storeProduct.update({
      where: { id: productId },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        stock: true,
        category: true,
        tags: true,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    })
  } catch (error) {
    console.error("[Product] Update error:", error)
    const message = error instanceof Error ? error.message : "Failed to update product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { storeId: string; productId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const product = await prisma.storeProduct.findUnique({
      where: { id: params.productId },
      include: { store: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    if (product.store.userId !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to delete this product" },
        { status: 403 }
      )
    }

    await prisma.storeProduct.delete({
      where: { id: params.productId },
    })

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("[Product] Delete error:", error)
    const message = error instanceof Error ? error.message : "Failed to delete product"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
