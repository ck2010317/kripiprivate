import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const orderData = await request.json()

    // Log the order for admin visibility
    console.log("═══════════════════════════════════════")
    console.log("🛍️  NEW SHOP ORDER RECEIVED")
    console.log("═══════════════════════════════════════")
    console.log("Customer:", orderData.name)
    console.log("Email:", orderData.email)
    console.log("Shipping:", orderData.shippingAddress)
    console.log("Total: $" + orderData.total?.toFixed(2))
    console.log("SOL Amount:", orderData.solAmount?.toFixed(4), "SOL")
    console.log("Tx Hash:", orderData.txHash || "not provided")
    console.log("Items:")
    orderData.items?.forEach((item: { name: string; color: string; size: string; quantity: number; price: number }, i: number) => {
      console.log(`  ${i + 1}. ${item.name} - ${item.color} / ${item.size} x${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`)
    })
    console.log("═══════════════════════════════════════")

    // Store order in database
    try {
      const { Client } = require("pg")
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
      })
      await client.connect()

      // Create shop_orders table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS shop_orders (
          id SERIAL PRIMARY KEY,
          customer_name TEXT NOT NULL,
          email TEXT NOT NULL,
          shipping_address TEXT NOT NULL,
          items JSONB NOT NULL,
          total_usd DECIMAL(10,2) NOT NULL,
          sol_amount DECIMAL(20,6) NOT NULL,
          tx_hash TEXT,
          wallet_address TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `)

      await client.query(
        `INSERT INTO shop_orders (customer_name, email, shipping_address, items, total_usd, sol_amount, tx_hash, wallet_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          orderData.name,
          orderData.email,
          orderData.shippingAddress,
          JSON.stringify(orderData.items),
          orderData.total,
          orderData.solAmount,
          orderData.txHash || null,
          orderData.walletAddress,
        ]
      )

      await client.end()
    } catch (dbError) {
      console.error("DB save failed (order still logged):", dbError)
    }

    return NextResponse.json({ 
      success: true, 
      message: "Order placed successfully",
      orderId: Date.now().toString(36),
    })
  } catch (error) {
    console.error("Order error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process order" },
      { status: 500 }
    )
  }
}
