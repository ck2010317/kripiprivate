import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { checkTokenHolding, REQUIRED_TOKEN_MINT, REQUIRED_TOKEN_AMOUNT, isValidSolanaAddress } from "@/lib/token-gate"

// Check if a wallet holds required tokens for card issuance
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login first." },
        { status: 401 }
      )
    }

    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      )
    }

    // Validate address format
    if (!isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 }
      )
    }

    // Check token holdings
    const result = await checkTokenHolding(walletAddress)

    if (!result.hasRequiredTokens) {
      return NextResponse.json({
        success: false,
        eligible: false,
        message: `You need at least ${REQUIRED_TOKEN_AMOUNT} tokens to create a card.`,
        balance: result.balance,
        required: result.required,
        tokenMint: result.tokenMint,
      })
    }

    return NextResponse.json({
      success: true,
      eligible: true,
      message: "Wallet verified! You are eligible to create a card.",
      balance: result.balance,
      required: result.required,
      tokenMint: result.tokenMint,
    })
  } catch (error) {
    console.error("[Verify Wallet] Error:", error)
    const message = error instanceof Error ? error.message : "Failed to verify wallet"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// Get token requirements info
export async function GET() {
  return NextResponse.json({
    tokenMint: REQUIRED_TOKEN_MINT,
    requiredAmount: REQUIRED_TOKEN_AMOUNT,
    message: `You need to hold at least ${REQUIRED_TOKEN_AMOUNT} tokens of ${REQUIRED_TOKEN_MINT} to create a card.`,
  })
}
