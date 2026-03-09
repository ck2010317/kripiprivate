export const maxDuration = 10

import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Get a specific order
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const order = await prisma.marketplaceOrder.findUnique({
      where: { id: params.orderId },
      include: {
        items: {
          include: {
            product: true,
            store: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    // Verify user owns this order
    if (order.userId !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to view this order" },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error) {
    console.error("[Order] Get error:", error)
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    )
  }
}

// Verify SOL payment for order
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const { txSignature } = await request.json()

    if (!txSignature) {
      return NextResponse.json(
        { error: "Transaction signature is required" },
        { status: 400 }
      )
    }

    // Get order
    const order = await prisma.marketplaceOrder.findUnique({
      where: { id: params.orderId },
      include: {
        items: {
          include: { product: true },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    if (order.userId !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to verify this order" },
        { status: 403 }
      )
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot verify order with status: ${order.status}` },
        { status: 400 }
      )
    }

    // TODO: Verify SOL transaction on blockchain
    // For now, we mark as PAID on signature submission
    // In production, verify with:
    // 1. Solana RPC to confirm transaction
    // 2. Check amount matches order.totalSol
    // 3. Check recipient is shop wallet
    // 4. Confirm transaction is finalized

    // Update order status
    const updatedOrder = await prisma.marketplaceOrder.update({
      where: { id: params.orderId },
      data: {
        status: "PAID",
        txSignature,
        paidAt: new Date(),
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

    // Deduct stock for each item
    for (const item of order.items) {
      await prisma.storeProduct.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
          soldCount: {
            increment: item.quantity,
          },
        },
      })
    }

    // Create vendor payout records for each store
    const storeGroups = new Map<
      string,
      { storeId: string; amount: number }
    >()

    for (const item of order.items) {
      const key = item.storeId
      const current = storeGroups.get(key) || { storeId: key, amount: 0 }
      current.amount += item.subtotal
      storeGroups.set(key, current)
    }

    // Create payout records
    for (const [_, storeData] of storeGroups) {
      const store = await prisma.store.findUnique({
        where: { id: storeData.storeId },
      })

      if (store) {
        const SOL_PRICE = updatedOrder.solPriceAtTime
        const amountSol = parseFloat(
          (storeData.amount / SOL_PRICE).toFixed(6)
        )

        await prisma.vendorPayout.create({
          data: {
            storeId: storeData.storeId,
            userId: store.userId,
            amount: storeData.amount,
            amountSol,
            solPriceAtTime: SOL_PRICE,
            status: "PENDING",
          },
        })

        // Update store stats
        await prisma.store.update({
          where: { id: storeData.storeId },
          data: {
            totalSales: {
              increment: storeData.amount,
            },
            totalOrders: {
              increment: 1,
            },
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Order verified and payment confirmed",
    })
  } catch (error) {
    console.error("[Order] Verify error:", error)
    const message = error instanceof Error ? error.message : "Failed to verify order"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Cancel or update order status (vendor or buyer)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const { status } = await request.json()

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      )
    }

    const order = await prisma.marketplaceOrder.findUnique({
      where: { id: params.orderId },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    // Only buyer can cancel pending orders
    if (status === "CANCELLED") {
      if (order.userId !== user.id) {
        return NextResponse.json(
          { error: "Only order owner can cancel" },
          { status: 403 }
        )
      }

      if (order.status !== "PENDING") {
        return NextResponse.json(
          { error: "Can only cancel pending orders" },
          { status: 400 }
        )
      }

      const updatedOrder = await prisma.marketplaceOrder.update({
        where: { id: params.orderId },
        data: { status: "CANCELLED" },
        include: { items: true },
      })

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        message: "Order cancelled",
      })
    }

    // Other status updates need admin/vendor logic
    return NextResponse.json(
      { error: "Invalid status or operation not allowed" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Order] Update error:", error)
    const message = error instanceof Error ? error.message : "Failed to update order"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
