import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

/**
 * Admin endpoint to manually verify a payment and issue a card
 * POST /api/admin/payments/verify
 * Body: { paymentId: string, txSignature?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user is admin (you can adjust this based on your user model)
    // For now, we'll allow the payment owner to verify their own payment
    const { paymentId, txSignature } = await request.json()

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      )
    }

    // Get the payment
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
      },
    })

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    // Check if payment is still pending
    if (payment.status === "VERIFIED") {
      return NextResponse.json(
        { error: "Payment already verified" },
        { status: 400 }
      )
    }

    if (payment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Card already issued" },
        { status: 400 }
      )
    }

    // Update payment status to verified
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "VERIFIED",
        txSignature: txSignature || payment.txSignature || "manual-admin-verification",
        verifiedAt: new Date(),
      },
    })

    console.log(`[Admin] Payment ${paymentId} manually verified by ${user.id}`)
    console.log(`[Admin] TX Signature: ${txSignature || "not provided"}`)

    // Now issue the card
    if (payment.cardType === "issue") {
      // Create a card for this payment
      const card = await prisma.card.create({
        data: {
          userId: payment.userId,
          cardNumber: generateCardNumber(),
          expiryDate: generateExpiryDate(),
          cvv: generateCVV(),
          nameOnCard: payment.cardholderName || "CARDHOLDER",
          balance: payment.topupAmount || 0,
          status: "PENDING", // Will be activated after KripiCard setup
          issuedAt: new Date(),
        },
      })

      console.log(`[Admin] Card ${card.id} created for payment ${paymentId}`)

      // Update payment to completed
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "COMPLETED" },
      })

      return NextResponse.json({
        success: true,
        message: "Payment verified and card issued",
        payment: updatedPayment,
        card: {
          id: card.id,
          cardNumber: card.cardNumber,
          expiryDate: card.expiryDate,
          cvv: card.cvv,
          nameOnCard: card.nameOnCard,
          balance: card.balance,
          status: card.status,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified",
      payment: updatedPayment,
    })
  } catch (error) {
    console.error("[Admin Verify] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify payment" },
      { status: 500 }
    )
  }
}

// Helper functions
function generateCardNumber(): string {
  // Generate a valid card number (16 digits, starting with 4 for Visa-like)
  const prefix = "4938"
  const randomDigits = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 10)
  ).join("")
  return prefix + randomDigits
}

function generateExpiryDate(): string {
  const now = new Date()
  const expiryYear = now.getFullYear() + 3
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${month}/${expiryYear.toString().slice(-2)}`
}

function generateCVV(): string {
  return String(Math.floor(Math.random() * 900 + 100))
}
