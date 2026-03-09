import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

interface OrderItem {
  productId: string
  quantity: number
}

// Get user's orders
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const orders = await prisma.marketplaceOrder.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        totalAmount: true,
        totalSol: true,
        status: true,
        createdAt: true,
        paidAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            priceAtPurchase: true,
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (error) {
    console.error("[Marketplace Orders] Get error:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}

// Create a new order
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const { items, shippingName, shippingEmail, shippingAddress } =
      await request.json()

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one item" },
        { status: 400 }
      )
    }

    if (!shippingName || !shippingEmail || !shippingAddress) {
      return NextResponse.json(
        { error: "Shipping information is required" },
        { status: 400 }
      )
    }

    // Validate and fetch all products
    const productIds = items.map((item: OrderItem) => item.productId)
    const products = await prisma.storeProduct.findMany({
      where: {
        id: { in: productIds },
      },
    })

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: "Some products in your order no longer exist" },
        { status: 400 }
      )
    }

    // Calculate total and check stock
    let totalAmount = 0
    const orderItems = []

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 400 }
        )
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Not enough stock for ${product.name}` },
          { status: 400 }
        )
      }

      totalAmount += product.price * item.quantity

      orderItems.push({
        productId: product.id,
        storeId: product.storeId,
        quantity: item.quantity,
        priceAtPurchase: product.price,
        subtotal: product.price * item.quantity,
      })
    }

    // Get SOL price (placeholder - integrate with actual price API)
    const SOL_PRICE = 150 // $150 per SOL (replace with real API call)
    const totalSol = parseFloat((totalAmount / SOL_PRICE).toFixed(6))

    // Create order in transaction
    const order = await prisma.marketplaceOrder.create({
      data: {
        userId: user.id,
        totalAmount,
        totalSol,
        solPriceAtTime: SOL_PRICE,
        shippingName,
        shippingEmail,
        shippingAddress,
        status: "PENDING",
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            store: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        totalAmount: order.totalAmount,
        totalSol: order.totalSol,
        status: order.status,
        items: order.items,
        createdAt: order.createdAt,
      },
    })
  } catch (error) {
    console.error("[Marketplace Orders] Create error:", error)
    const message = error instanceof Error ? error.message : "Failed to create order"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
