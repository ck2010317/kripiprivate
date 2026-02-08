import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"

// Helius Mainnet RPC
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com/?api-key=f3417b56-61ad-4ba8-b0f9-3695ea859a58"

// Your wallet address where users send payments
const PAYMENT_WALLET = process.env.PAYMENT_WALLET || "2WWEW2Ry4XvBP1eQWuS1iKb515UBnkFDuLUsbwYvbxqj"

// Create Solana connection
export function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed")
}

// Get payment wallet public key
export function getPaymentWallet(): PublicKey {
  return new PublicKey(PAYMENT_WALLET)
}

// Get current SOL price in USD
export async function getSolPrice(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } } // Cache for 60 seconds
    )
    const data = await response.json()
    return data.solana?.usd || 100 // Default to $100 if API fails
  } catch (error) {
    console.error("Failed to fetch SOL price:", error)
    return 100 // Default fallback price
  }
}

// Convert USD to SOL
export async function usdToSol(usdAmount: number): Promise<{ solAmount: number; solPrice: number }> {
  const solPrice = await getSolPrice()
  // Add 2% buffer for price fluctuations
  const solAmount = (usdAmount / solPrice) * 1.02
  return {
    solAmount: parseFloat(solAmount.toFixed(6)),
    solPrice,
  }
}

// Verify a transaction to the payment wallet
export async function verifyPayment(
  txSignature: string,
  expectedAmountSol: number,
  senderAddress?: string
): Promise<{
  verified: boolean
  actualAmount?: number
  senderWallet?: string
  error?: string
}> {
  try {
    const connection = getConnection()
    const paymentWallet = getPaymentWallet()

    // Get transaction details
    const tx = await connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    })

    if (!tx) {
      return { verified: false, error: "Transaction not found" }
    }

    if (tx.meta?.err) {
      return { verified: false, error: "Transaction failed" }
    }

    // Check if transaction is to our payment wallet
    let accountKeys
    try {
      accountKeys = tx.transaction.message.getAccountKeys()
    } catch (keyError) {
      // Fallback for lookup table issues
      try {
        const staticKeys = tx.transaction.message.staticAccountKeys
        // Create a simple object that mimics accountKeys interface
        accountKeys = {
          staticAccountKeys: staticKeys,
        } as any
      } catch {
        return { verified: false, error: "Failed to parse transaction accounts" }
      }
    }

    const paymentWalletIndex = accountKeys.staticAccountKeys.findIndex(
      (key: any) => key.toBase58() === paymentWallet.toBase58()
    )

    if (paymentWalletIndex === -1) {
      return { verified: false, error: "Transaction not sent to payment wallet" }
    }

    // Calculate amount received by payment wallet
    const preBalance = tx.meta?.preBalances[paymentWalletIndex] || 0
    const postBalance = tx.meta?.postBalances[paymentWalletIndex] || 0
    const amountReceived = (postBalance - preBalance) / LAMPORTS_PER_SOL

    if (amountReceived <= 0) {
      return { verified: false, error: "No SOL received by payment wallet" }
    }

    // Check if amount is within acceptable range (95% - 105% of expected)
    const minAmount = expectedAmountSol * 0.95
    const maxAmount = expectedAmountSol * 1.05

    if (amountReceived < minAmount) {
      return {
        verified: false,
        actualAmount: amountReceived,
        error: `Insufficient amount: received ${amountReceived.toFixed(6)} SOL, expected ${expectedAmountSol.toFixed(6)} SOL`,
      }
    }

    // Get the sender wallet (first signer, usually the payer)
    const senderWallet = accountKeys.staticAccountKeys[0]?.toBase58() || "unknown"

    // Optionally verify sender if provided
    if (senderAddress) {
      const senderIndex = accountKeys.staticAccountKeys.findIndex(
        (key: any) => key.toBase58() === senderAddress
      )
      if (senderIndex === -1) {
        return { verified: false, error: "Transaction not from expected sender" }
      }
    }

    return {
      verified: true,
      actualAmount: amountReceived,
      senderWallet: senderWallet,
    }
  } catch (error) {
    console.error("[Payments] Verify payment error:", error instanceof Error ? error.message : String(error))
    console.error("[Payments] Error details:", error)
    return {
      verified: false,
      error: error instanceof Error ? error.message : "Verification failed",
    }
  }
}

// Check for recent transactions to payment wallet (for automatic detection)
export async function checkRecentPayments(
  sinceSignature?: string
): Promise<Array<{
  signature: string
  amount: number
  sender: string
  timestamp: number
}>> {
  try {
    const connection = getConnection()
    const paymentWallet = getPaymentWallet()

    console.log(`[checkRecentPayments] Checking for payments to wallet: ${paymentWallet.toBase58()}`)

    const signatures = await connection.getSignaturesForAddress(
      paymentWallet,
      {
        limit: 100, // Increased to 100
        until: sinceSignature,
      },
      "confirmed"
    )

    console.log(`[checkRecentPayments] Found ${signatures.length} recent transactions`)

    const payments: Array<{
      signature: string
      amount: number
      sender: string
      timestamp: number
    }> = []

    for (const sig of signatures) {
      if (sig.err) {
        console.log(`[checkRecentPayments] Skipping ${sig.signature} - has error`)
        continue
      }

      let tx
      try {
        tx = await connection.getTransaction(sig.signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        })
      } catch (txError) {
        console.log(`[checkRecentPayments] Skipping ${sig.signature} - failed to get transaction`)
        continue
      }

      if (!tx || tx.meta?.err) {
        console.log(`[checkRecentPayments] Skipping ${sig.signature} - no tx or tx error`)
        continue
      }

      // Try to get account keys, but if it fails due to lookup tables, use fallback
      let accountKeys
      let paymentWalletIndex = -1
      
      try {
        accountKeys = tx.transaction.message.getAccountKeys()
        paymentWalletIndex = accountKeys.staticAccountKeys.findIndex(
          (key) => key.toBase58() === paymentWallet.toBase58()
        )
      } catch (keyError) {
        // Lookup table error - try manual parsing
        console.log(`[checkRecentPayments] Lookup table issue for ${sig.signature}, using fallback`)
        try {
          const staticKeys = tx.transaction.message.staticAccountKeys
          paymentWalletIndex = staticKeys.findIndex(
            (key) => key.toBase58() === paymentWallet.toBase58()
          )
        } catch (fallbackError) {
          console.log(`[checkRecentPayments] Skipping ${sig.signature} - couldn't parse accounts`)
          continue
        }
      }

      if (paymentWalletIndex === -1) {
        console.log(`[checkRecentPayments] Skipping ${sig.signature} - payment wallet not in accounts`)
        continue
      }

      const preBalance = tx.meta?.preBalances[paymentWalletIndex] || 0
      const postBalance = tx.meta?.postBalances[paymentWalletIndex] || 0
      const amount = (postBalance - preBalance) / LAMPORTS_PER_SOL

      console.log(`[checkRecentPayments] ${sig.signature}: amount=${amount}, pre=${preBalance}, post=${postBalance}`)

      if (amount > 0) {
        // Get sender - try to get the first signer
        let sender = "unknown"
        try {
          const accountKeys = tx.transaction.message.getAccountKeys()
          sender = accountKeys.staticAccountKeys[0]?.toBase58() || "unknown"
        } catch {
          // Fallback
          try {
            const staticKeys = tx.transaction.message.staticAccountKeys
            sender = staticKeys[0]?.toBase58() || "unknown"
          } catch {
            sender = "unknown"
          }
        }

        payments.push({
          signature: sig.signature,
          amount,
          sender,
          timestamp: tx.blockTime || Date.now() / 1000,
        })
        
        console.log(`[checkRecentPayments] ✅ Payment found: ${sig.signature}, amount: ${amount} SOL, sender: ${sender}`)
      }
    }

    console.log(`[checkRecentPayments] Returning ${payments.length} valid payments`)
    return payments
  } catch (error) {
    console.error("Failed to check recent payments:", error)
    return []
  }
}
