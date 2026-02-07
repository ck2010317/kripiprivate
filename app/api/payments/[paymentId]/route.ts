import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { verifyPayment } from "@/lib/solana-payment"
import { createCard as createKripiCard, fundCard } from "@/lib/kripicard-client"
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
      // For card issuance, use the topupAmount as the card balance
      // The total we charged includes fees, but the card itself gets only the topup amount
      const topupAmount = payment.topupAmount || (payment.amountUsd - 5) || 10
      
      console.log(`[Card Creation] Starting card creation process`)
      console.log(`[Card Creation] Payment ID: ${payment.id}`)
      console.log(`[Card Creation] Payment topupAmount: ${payment.topupAmount}`)
      console.log(`[Card Creation] Payment amountUsd: ${payment.amountUsd}`)
      console.log(`[Card Creation] Calculated topupAmount: ${topupAmount}`)
      
      if (topupAmount < 10) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        return NextResponse.json(
          { 
            error: `Insufficient topup amount to create card. Required: $10, Provided: $${topupAmount.toFixed(2)}`,
            requiredTopup: 10,
            providedTopup: topupAmount,
          },
          { status: 400 }
        )
      }

      // Issue new card
      try {
        // IMPORTANT: Only send the topup amount to KripiCard, not the fees
        const cardAmount = topupAmount
        console.log(`[Card Creation] Card amount to send to Kripi: ${cardAmount}`)
        console.log(`[Card Creation] Creating card for ${payment.nameOnCard} with $${cardAmount} balance...`)
        
        const cardName = (payment.nameOnCard || user.name || "CARDHOLDER").toUpperCase()
        const cardEmail = user.email || "noemail@example.com"
        
        console.log(`[Card Creation] Parameters:`)
        console.log(`  - Name: ${cardName}`)
        console.log(`  - Email: ${cardEmail}`)
        console.log(`  - Amount (topup only, no fees): ${cardAmount}`)
        console.log(`  - User ID: ${user.id}`)
        
        // If there's already a card linked to this payment, return it
        if (payment.issuedCardId) {
          const linkedCard = await prisma.card.findUnique({
            where: { id: payment.issuedCardId },
          })
          if (linkedCard) {
            console.log(`[Card Creation] Card already linked to payment: ${linkedCard.id}`)
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: "COMPLETED" },
            })
            return NextResponse.json({
              success: true,
              message: "Card already issued",
              card: {
                id: linkedCard.id,
                cardNumber: linkedCard.cardNumber,
                expiryDate: linkedCard.expiryDate,
                cvv: linkedCard.cvv,
                nameOnCard: linkedCard.nameOnCard,
                balance: linkedCard.balance,
                status: linkedCard.status,
              },
            })
          }
        }

        const kripiResponse = await createKripiCard({
          amount: cardAmount,
          name_on_card: cardName,
          email: cardEmail,
          bankBin: "49387519",
        })

        console.log(`[Card Creation] Received KripiCard response:`, JSON.stringify(kripiResponse, null, 2))

        if (!kripiResponse || !kripiResponse.card_id) {
          console.error(`[Card Creation] Invalid response - missing card_id. Response:`, kripiResponse)
          throw new Error("KripiCard API returned invalid response - missing card_id")
        }

        // CRITICAL: Validate card details are REAL, not dummy values
        if (!kripiResponse.card_number || kripiResponse.card_number === "****" || kripiResponse.card_number.length < 10) {
          console.error(`[Card Creation] ❌ Invalid card number from KripiCard:`, kripiResponse.card_number)
          throw new Error(`Card created (ID: ${kripiResponse.card_id}) but got invalid card number. Contact support with card ID: ${kripiResponse.card_id}`)
        }
        if (!kripiResponse.cvv || kripiResponse.cvv === "***" || kripiResponse.cvv.length < 3) {
          console.error(`[Card Creation] ❌ Invalid CVV from KripiCard:`, kripiResponse.cvv)
          throw new Error(`Card created (ID: ${kripiResponse.card_id}) but got invalid CVV. Contact support with card ID: ${kripiResponse.card_id}`)
        }
        if (!kripiResponse.expiry_date || kripiResponse.expiry_date === "12/25" || !kripiResponse.expiry_date.includes("/")) {
          console.error(`[Card Creation] ❌ Invalid expiry from KripiCard:`, kripiResponse.expiry_date)
          throw new Error(`Card created (ID: ${kripiResponse.card_id}) but got invalid expiry. Contact support with card ID: ${kripiResponse.card_id}`)
        }

        console.log(`[Card Creation] ✅ Card created on KripiCard: ${kripiResponse.card_id}`)
        console.log(`[Card Creation] ✅ Card details validated - number: *${kripiResponse.card_number.slice(-4)}, expiry: ${kripiResponse.expiry_date}`)

        // Store card in database - with retry logic
        let card
        try {
          console.log(`[Card Creation] Storing card in database...`)
          card = await prisma.card.create({
            data: {
              kripiCardId: kripiResponse.card_id,
              cardNumber: kripiResponse.card_number,
              expiryDate: kripiResponse.expiry_date,
              cvv: kripiResponse.cvv,
              nameOnCard: cardName,
              balance: kripiResponse.balance || cardAmount,
              userId: user.id,
            },
          })
          console.log(`[Card Creation] ✅ Card stored in database: ${card.id}`)
        } catch (dbError) {
          console.error(`[Card Creation] ❌ Database save failed:`, dbError)
          
          // Check if it's a duplicate kripiCardId error (card already saved)
          if (dbError instanceof Error && dbError.message.includes("Unique constraint")) {
            const existingByKripi = await prisma.card.findUnique({
              where: { kripiCardId: kripiResponse.card_id },
            })
            if (existingByKripi) {
              console.log(`[Card Creation] Card already exists in DB with kripiCardId: ${kripiResponse.card_id}`)
              card = existingByKripi
            }
          }
          
          // If we still don't have a card record, return the KripiCard data directly
          // so the user at least gets their card details
          if (!card) {
            console.error(`[Card Creation] ⚠️ Returning KripiCard data directly (DB save failed)`)
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: "COMPLETED" },
            }).catch(() => {})
            
            return NextResponse.json({
              success: true,
              message: "Card created but database save had an issue. Your card is active.",
              card: {
                id: kripiResponse.card_id,
                cardNumber: kripiResponse.card_number,
                expiryDate: kripiResponse.expiry_date,
                cvv: kripiResponse.cvv,
                nameOnCard: cardName,
                balance: kripiResponse.balance || cardAmount,
                status: "ACTIVE",
              },
              warning: "Card was created successfully on the provider but could not be saved to your account. Please contact support with card ID: " + kripiResponse.card_id,
            })
          }
        }

        // Update payment as completed
        await prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: "COMPLETED",
            issuedCardId: card.id,
          },
        })

        return NextResponse.json({
          success: true,
          message: "Card issued successfully",
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
      } catch (cardError) {
        console.error("[Card Creation] ❌ Exception in card creation:", cardError)
        if (cardError instanceof Error) {
          console.error("[Card Creation] Error message:", cardError.message)
          console.error("[Card Creation] Error stack:", cardError.stack)
        }
        console.error("[Card Creation] Full error object:", JSON.stringify(cardError, null, 2))
        
        const errorMessage = cardError instanceof Error ? cardError.message : JSON.stringify(cardError)
        
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        })
        
        // Pass through the raw error from KripiCard so we can debug real issues
        return NextResponse.json(
          { error: errorMessage, timestamp: new Date().toISOString() },
          { status: 400 }
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
