export const maxDuration = 10

import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Get a specific store by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id

    const store = await prisma.store.findFirst({
      where: {
        OR: [{ id: storeId }, { slug: storeId }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        userId: true,
        totalSales: true,
        totalOrders: true,
        rating: true,
        reviewCount: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: { products: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      store: {
        ...store,
        productCount: store._count.products,
        owner: store.user,
      },
    })
  } catch (error) {
    console.error("[Marketplace] Get store error:", error)
    return NextResponse.json(
      { error: "Failed to fetch store" },
      { status: 500 }
    )
  }
}

// Update store info (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const storeId = params.id
    const { name, description, image, solWallet } = await request.json()

    // Get store and verify ownership
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    if (store.userId !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to update this store" },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (name) {
      if (name.trim().length < 3) {
        return NextResponse.json(
          { error: "Store name must be at least 3 characters" },
          { status: 400 }
        )
      }
      updateData.name = name

      // Generate new slug if name changed
      if (name !== store.name) {
        const newSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")

        const existingSlug = await prisma.store.findUnique({
          where: { slug: newSlug },
        })

        if (existingSlug && existingSlug.id !== storeId) {
          return NextResponse.json(
            { error: "Store name already taken" },
            { status: 400 }
          )
        }

        updateData.slug = newSlug
      }
    }

    if (description !== undefined) updateData.description = description
    if (image !== undefined) updateData.image = image
    if (solWallet !== undefined) updateData.solWallet = solWallet

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: updateData,
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
      },
    })

    return NextResponse.json({
      success: true,
      store: updatedStore,
    })
  } catch (error) {
    console.error("[Marketplace] Update store error:", error)
    const message = error instanceof Error ? error.message : "Failed to update store"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
