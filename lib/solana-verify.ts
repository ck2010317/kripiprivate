import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"

// Get your free API key from: https://dev.helius.xyz
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "free"
const SOLANA_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
const connection = new Connection(SOLANA_RPC, "confirmed")

export interface PaymentVerification {
  verified: boolean
  transactionSignature: string | null
  amountReceived: number
  timestamp: number
}

const verificationCache = new Map<string, { result: PaymentVerification; timestamp: number }>()
const CACHE_DURATION_MS = 5000 // 5 second cache
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 15000] // Exponential backoff in ms

/**
 * Verify payment received at a specific address
 * Checks for transactions sending SOL to the address
 */
export async function verifyPaymentToAddress(
  depositAddress: string,
  expectedAmount: number, // in lamports
  sinceTimestamp?: number,
): Promise<PaymentVerification> {
  try {
    console.log("[v0] Verifying payment at address:", depositAddress)
    console.log("[v0] Expected amount (lamports):", expectedAmount)

    const publicKey = new PublicKey(depositAddress)

    // Get account info to check balance
    const accountInfo = await connection.getAccountInfo(publicKey)
    const balance = accountInfo?.lamports || 0
    console.log("[v0] Current balance at address:", balance, "lamports")

    if (balance >= expectedAmount) {
      console.log("[v0] Balance sufficient! Balance:", balance, "Expected:", expectedAmount)
      // Get recent signatures to find the transaction
      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: 50,
      })
      console.log("[v0] Found", signatures.length, "recent signatures")

      // Find a transaction that matches the amount
      for (const sig of signatures) {
        if (sig.err) continue

        const tx = await connection.getParsedTransaction(sig.signature, "confirmed")
        if (!tx) continue

        // Check if this transaction has the expected transfer
        const instructions = tx.transaction.message.instructions
        for (const instruction of instructions) {
          if (instruction.program === "system" && "parsed" in instruction) {
            const parsed = instruction.parsed
            if (
              parsed.type === "transfer" &&
              parsed.info.destination === depositAddress &&
              parsed.info.lamports >= expectedAmount
            ) {
              return {
                verified: true,
                transactionSignature: sig.signature,
                amountReceived: parsed.info.lamports,
                timestamp: tx.blockTime || 0,
              }
            }
          }
        }
      }

      // Balance exists but transaction not found, still consider it verified
      if (balance >= expectedAmount) {
        return {
          verified: true,
          transactionSignature: signatures[0]?.signature || null,
          amountReceived: balance,
          timestamp: Date.now() / 1000,
        }
      }
    }

    console.log("[v0] Verification failed - insufficient balance. Balance:", balance, "Expected:", expectedAmount)
    return {
      verified: false,
      transactionSignature: null,
      amountReceived: balance,
      timestamp: Date.now() / 1000,
    }
  } catch (error) {
    console.error(" Payment verification error:", error)
    return {
      verified: false,
      transactionSignature: null,
      amountReceived: 0,
      timestamp: Date.now() / 1000,
    }
  }
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL)
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL
}

/**
 * Verify payment received at a specific address with backoff strategy
 * Checks for transactions sending SOL to the address
 */
export async function verifyPaymentToAddressWithBackoff(
  depositAddress: string,
  expectedAmount: number,
  sinceTimestamp?: number,
  retryCount = 0,
): Promise<PaymentVerification> {
  // Check cache first to avoid duplicate requests
  const cacheKey = `${depositAddress}:${expectedAmount}`
  const cached = verificationCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.result
  }

  try {
    const result = await verifyPaymentToAddress(depositAddress, expectedAmount, sinceTimestamp)

    // Cache the result
    verificationCache.set(cacheKey, { result, timestamp: Date.now() })
    return result
  } catch (error: unknown) {
    // Handle 429 rate limit errors with exponential backoff
    const isRateLimit = error instanceof Error && error.message.includes("429")

    if (isRateLimit && retryCount < BACKOFF_DELAYS.length) {
      const delay = BACKOFF_DELAYS[retryCount]
      console.log(`[v0] Rate limited. Retrying after ${delay}ms (attempt ${retryCount + 1})`)

      await new Promise((resolve) => setTimeout(resolve, delay))
      return verifyPaymentToAddressWithBackoff(depositAddress, expectedAmount, sinceTimestamp, retryCount + 1)
    }

    throw error
  }
}
