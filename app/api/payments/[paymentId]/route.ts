import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { verifyPayment } from "@/lib/solana-payment"
import { fundCard } from "@/lib/kripicard-client"
import { checkTokenHolding } from "@/lib/token-gate"

// Verify payment and process card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { paymentId } = await params
    const { txSignature } = await request.json()

    if (!txSignature) {
      return NextResponse.json(
        { error: "Transaction signature is required" },
        { status: 400 }
      )
    }

    // Find payment
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId: user.id,
      },
    })

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    // Check if already completed
    if (payment.status === "COMPLETED") {
      // If card was already issued, return the card info
      if (payment.issuedCardId) {
        const existingCard = await prisma.card.findUnique({
          where: { id: payment.issuedCardId },
        })
        if (existingCard) {
          return NextResponse.json({
            success: true,
            message: "Card already issued",
            card: {
              id: existingCard.id,
              cardNumber: existingCard.cardNumber,
              expiryDate: existingCard.expiryDate,
              cvv: existingCard.cvv,
              nameOnCard: existingCard.nameOnCard,
              balance: existingCard.balance,
              status: existingCard.status,
            },
          })
        }
      }
      return NextResponse.json(
        { error: "Payment already processed" },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date() > payment.expiresAt) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "EXPIRED" },
      })
      return NextResponse.json(
        { error: "Payment has expired" },
        { status: 400 }
      )
    }

    // If auto-verify already verified the payment, skip re-verification
    const alreadyVerified = payment.status === "VERIFIED"
    
    if (alreadyVerified) {
      console.log(`[Payments] Payment ${payment.id} already verified by auto-verify, skipping re-verification`)
    } else {
      // Update status to confirming
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: "CONFIRMING",
          txSignature,
        },
      })

      // Verify the transaction
      const verification = await verifyPayment(txSignature, payment.amountSol, payment.senderWallet || undefined)

      if (!verification.verified) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { error: verification.error || "Payment verification failed" },
          { status: 400 }
        )
      }

      // For card issuance: Verify the sender holds required tokens
      if (payment.cardType === "issue") {
        const senderWallet = verification.senderWallet
        
        if (!senderWallet) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED" },
          })
          return NextResponse.json(
            { error: "Could not determine payment sender wallet address" },
            { status: 400 }
          )
        }

        console.log(`[Token Gate] Checking if payment sender ${senderWallet} holds required tokens`)
        
        try {
          const tokenCheck = await checkTokenHolding(senderWallet)
          
          if (!tokenCheck.hasRequiredTokens) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: "FAILED" },
            })
            return NextResponse.json(
              { 
                error: `Payment sender does not hold enough tokens. Required: ${tokenCheck.required}, Current balance: ${tokenCheck.balance}`,
                requiredTokens: tokenCheck.required,
                currentBalance: tokenCheck.balance,
              },
              { status: 400 }
            )
          }
          
          console.log(`[Token Gate] ✅ Payment sender ${senderWallet} has ${tokenCheck.balance} tokens - ELIGIBLE`)
        } catch (tokenError) {
          console.error("[Token Gate] Error checking token holdings:", tokenError)
          return NextResponse.json(
            { 
              error: "Failed to verify token holdings. Please try again.",
              details: tokenError instanceof Error ? tokenError.message : "Unknown error",
            },
            { status: 400 }
          )
        }
      }

      // Payment verified - update status
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "VERIFIED" },
      })
    }

    // Process based on card type
    if (payment.cardType === "issue") {
      // Card creation is now manual via KripiCard dashboard
      // We save a PENDING card and admin will assign the kripiCardId later
      const topupAmount = payment.topupAmount || payment.amountUsd
      
      console.log(`[Card Creation] Payment verified, creating PENDING card`)
      console.log(`[Card Creation] Payment ID: ${payment.id}`)
      console.log(`[Card Creation] topupAmount: ${topupAmount}`)
      
      const cardName = (payment.nameOnCard || user.name || "CARDHOLDER").toUpperCase()

      // If there's already a card linked to this payment, return it
      if (payment.issuedCardId) {
        const linkedCard = await prisma.card.findUnique({
          where: { id: payment.issuedCardId },
        })
        if (linkedCard) {
          console.log(`[Card Creation] Card already linked to payment: ${linkedCard.id}`)
          return NextResponse.json({
            success: true,
            message: linkedCard.status === "PENDING" 
              ? "Your card is being set up. This can take up to 4 hours. You'll see full details once it's ready." 
              : "Card already issued",
            card: {
              id: linkedCard.id,
              cardNumber: linkedCard.cardNumber || "",
              expiryDate: linkedCard.expiryDate || "",
              cvv: linkedCard.cvv || "",
              nameOnCard: linkedCard.nameOnCard,
              balance: linkedCard.balance,
              status: linkedCard.status,
            },
            pending: linkedCard.status === "PENDING",
          })
        }
      }

      // Create a PENDING card — admin will assign kripiCardId later
      try {
        const card = await prisma.card.create({
          data: {
            cardNumber: "",
            expiryDate: "",
            cvv: "",
            nameOnCard: cardName,
            balance: topupAmount,
            status: "PENDING",
            userId: user.id,
          },
        })

        console.log(`[Card Creation] ✅ PENDING card created in DB: ${card.id}`)

        // Update payment as completed with card linked
        await prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: "COMPLETED",
            issuedCardId: card.id,
          },
        })

        // === REFERRAL REWARD ===
        // Check if this user was referred by someone — credit $5 reward
        try {
          const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { referredById: true, email: true },
          })

          if (fullUser?.referredById) {
            // Check this is the user's FIRST card (only reward once per referred user)
            const userCardCount = await prisma.card.count({
              where: { userId: user.id },
            })

            if (userCardCount === 1) {
              // This is their first card — credit the referrer
              const REFERRAL_REWARD = 5  // $5
              const REFERRAL_POINTS = 10 // 10 points

              await prisma.$transaction([
                prisma.user.update({
                  where: { id: fullUser.referredById },
                  data: {
                    referralPoints: { increment: REFERRAL_POINTS },
                    referralEarnings: { increment: REFERRAL_REWARD },
                    referralCardCount: { increment: 1 },
                  },
                }),
                prisma.referralLog.create({
                  data: {
                    referrerId: fullUser.referredById,
                    referredEmail: fullUser.email,
                    rewardAmount: REFERRAL_REWARD,
                    points: REFERRAL_POINTS,
                    cardId: card.id,
                    paymentId: payment.id,
                  },
                }),
              ])

              console.log(`[Referral] ✅ Credited $${REFERRAL_REWARD} + ${REFERRAL_POINTS} pts to referrer ${fullUser.referredById} for user ${fullUser.email}`)
            }
          }
        } catch (refErr) {
          // Don't fail the card creation if referral credit fails
          console.error("[Referral] ❌ Failed to credit referral reward:", refErr)
        }

        return NextResponse.json({
          success: true,
          message: "Payment received! Your card is being set up and will appear in your dashboard once ready. This can take up to 4 hours.",
          card: {
            id: card.id,
            cardNumber: "",
            expiryDate: "",
            cvv: "",
            nameOnCard: cardName,
            balance: topupAmount,
            status: "PENDING",
          },
          pending: true,
        })
      } catch (cardError) {
        console.error("[Card Creation] ❌ Failed to create pending card:", cardError)
        const errorMessage = cardError instanceof Error ? cardError.message : JSON.stringify(cardError)
        
        return NextResponse.json(
          { error: "Payment received but failed to create card record. Please contact support.", details: errorMessage },
          { status: 500 }
        )
      }
    } else if ((payment.cardType === "topup" || payment.cardType === "fund") && payment.targetCardId) {
      // Fund existing card with the actual topup amount (not including fee)
      const card = await prisma.card.findFirst({
        where: {
          id: payment.targetCardId,
          userId: user.id,
        },
      })

      if (!card) {
        return NextResponse.json(
          { error: "Target card not found" },
          { status: 404 }
        )
      }

      // Validate that card has kripiCardId
      if (!card.kripiCardId || card.kripiCardId.trim().length === 0) {
        console.error("[Fund Card] ❌ Card missing kripiCardId:", {
          cardId: card.id,
          kripiCardId: card.kripiCardId,
          cardNumber: card.cardNumber,
        })
        return NextResponse.json(
          { 
            error: "Card is not properly initialized. Card ID is missing.",
            details: "This card cannot be funded. Please contact support.",
          },
          { status: 400 }
        )
      }

      // Use the actual topup amount for funding, not the total with fee
      const fundAmount = payment.topupAmount || payment.amountUsd

      // CRITICAL: Validate minimum fund amount ($10 is KripiCard's minimum)
      const KRIPICARD_MIN_FUND = 10
      if (fundAmount < KRIPICARD_MIN_FUND) {
        console.error("[Fund Card] ❌ Fund amount below minimum:", {
          fundAmount,
          minimum: KRIPICARD_MIN_FUND,
          kripiCardId: card.kripiCardId,
          paymentId: payment.id,
        })
        
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })

        return NextResponse.json(
          { 
            error: `Invalid fund amount. Minimum is $${KRIPICARD_MIN_FUND}`,
            details: `The fund amount ($${fundAmount.toFixed(2)}) is below the minimum of $${KRIPICARD_MIN_FUND}`,
            fundAmount,
            minimum: KRIPICARD_MIN_FUND,
          },
          { status: 400 }
        )
      }
      
      console.log(`[Fund Card] Starting fund process:`, {
        targetCardId: payment.targetCardId,
        dbCardId: card.id,
        kripiCardId: card.kripiCardId,
        fundAmount: fundAmount,
        paymentId: payment.id,
      })
      
      try {
        console.log(`[Fund Card] Calling fundCard API...`)
        const fundResponse = await fundCard({
          card_id: card.kripiCardId,
          amount: fundAmount,
        })

        console.log(`[Fund Card] ✅ Fund successful:`, {
          newBalance: fundResponse.new_balance,
          message: fundResponse.message,
        })

        // Update card balance
        await prisma.card.update({
          where: { id: card.id },
          data: { balance: fundResponse.new_balance },
        })

        // Log transaction
        await prisma.cardTransaction.create({
          data: {
            cardId: card.id,
            type: "FUND",
            amount: fundAmount,
            description: `Card funded via Solana payment (${fundAmount.toFixed(2)})`,
            status: "COMPLETED",
            externalTxId: txSignature,
            metadata: JSON.stringify({
              paymentId: payment.id,
              previousBalance: card.balance,
              newBalance: fundResponse.new_balance,
              serviceFee: payment.topupFee,
            }),
          },
        })

        // Update payment as completed
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "COMPLETED" },
        })

        return NextResponse.json({
          success: true,
          message: "Card funded successfully",
          newBalance: fundResponse.new_balance,
        })
      } catch (fundError) {
        console.error("[Fund Card] ❌ Fund error:", fundError)
        const errorMsg = fundError instanceof Error ? fundError.message : JSON.stringify(fundError)
        console.error("[Fund Card] Error details:", {
          message: errorMsg,
          fundAmount,
          kripiCardId: card.kripiCardId,
          timestamp: new Date().toISOString(),
        })
        
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })

        return NextResponse.json(
          { 
            error: "Failed to fund card",
            details: errorMsg,
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: "Invalid card type" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Payments] Verify payment error:", error)
    const message = error instanceof Error ? error.message : "Failed to verify payment"
    const stack = error instanceof Error ? error.stack : ""
    
    console.error("[Payments] Error details:", {
      message,
      stack,
      type: error instanceof Error ? error.constructor.name : typeof error,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    })
    
    return NextResponse.json(
      { 
        error: message || "Failed to verify payment",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Get payment status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { paymentId } = await params

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId: user.id,
      },
    })

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amountUsd: payment.amountUsd,
        amountSol: payment.amountSol,
        status: payment.status,
        cardType: payment.cardType,
        txSignature: payment.txSignature,
        issuedCardId: payment.issuedCardId,
        createdAt: payment.createdAt,
        expiresAt: payment.expiresAt,
      },
    })
  } catch (error) {
    console.error("[Payments] Get payment error:", error)
    return NextResponse.json(
      { error: "Failed to get payment" },
      { status: 500 }
    )
  }
}
