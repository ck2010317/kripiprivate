import { PublicKey } from "@solana/web3.js"

// Helius Mainnet RPC (token is on mainnet - pump.fun token)
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com/?api-key=f3417b56-61ad-4ba8-b0f9-3695ea859a58"

// Required token for card issuance
export const REQUIRED_TOKEN_MINT = "DrnF17MbiKXu7gVyfL13UydVvhFTSM7DDWN3Ui8npump"
export const REQUIRED_TOKEN_AMOUNT = 2000000

/**
 * Get token balance for a specific mint using direct RPC calls
 * This bypasses web3.js which doesn't work well with Helius's enhanced RPC
 */
export async function getTokenBalanceForMint(
  walletAddress: string,
  mintAddress: string
): Promise<number> {
  try {
    console.log(`[Token Gate] Checking balance for wallet: ${walletAddress}`)
    console.log(`[Token Gate] Token mint: ${mintAddress}`)
    console.log(`[Token Gate] Using RPC: ${SOLANA_RPC_URL}`)
    
    // First try: Use direct RPC call with mint filter
    console.log("[Token Gate] Attempting with mint filter...")
    let response = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          walletAddress,
          { mint: mintAddress },
          { encoding: "jsonParsed" },
        ],
      }),
    })
    
    let result = await response.json()
    
    console.log("[Token Gate] RPC Response with mint filter:", JSON.stringify(result, null, 2))
    
    // If mint filter fails, try fetching all Token-2022 accounts
    if (result.error) {
      console.log(`[Token Gate] Mint filter failed (${result.error.message}), trying Token-2022 program...`)
      
      response = await fetch(SOLANA_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "getTokenAccountsByOwner",
          params: [
            walletAddress,
            { programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" }, // Token-2022
            { encoding: "jsonParsed" },
          ],
        }),
      })
      
      result = await response.json()
      console.log("[Token Gate] RPC Response with Token-2022:", JSON.stringify(result, null, 2))
      
      if (result.error) {
        throw new Error(`RPC Error: ${result.error.message}`)
      }
      
      // Filter for the specific mint
      const accounts = result.result?.value || []
      console.log(`[Token Gate] Found ${accounts.length} total Token-2022 accounts, filtering for ${mintAddress}...`)
      
      if (!Array.isArray(accounts)) {
        console.error("[Token Gate] Accounts is not an array:", accounts)
        throw new Error("Invalid RPC response format")
      }
      
      let totalBalance = 0
      for (let i = 0; i < accounts.length; i++) {
        try {
          const account = accounts[i]
          console.log(`[Token Gate] Processing account ${i}:`, JSON.stringify(account).slice(0, 200))
          
          const parsedInfo = account?.account?.data?.parsed?.info
          if (!parsedInfo) {
            console.log(`[Token Gate] Account ${i} has no parsed info, skipping`)
            continue
          }
          
          const accountMint = parsedInfo.mint
          console.log(`[Token Gate] Account ${i} mint: ${accountMint}, target: ${mintAddress}`)
          
          if (accountMint === mintAddress || accountMint.toLowerCase() === mintAddress.toLowerCase()) {
            const uiAmount = parsedInfo.tokenAmount?.uiAmount || 0
            console.log(`[Token Gate] ✅ FOUND TARGET MINT! Account ${account.pubkey.slice(0, 8)}... has ${uiAmount} tokens`)
            totalBalance += uiAmount
          } else {
            console.log(`[Token Gate] Account ${i} mint doesn't match (${accountMint} vs ${mintAddress})`)
          }
        } catch (accError) {
          console.error(`[Token Gate] Error parsing account ${i}:`, accError)
        }
      }
      
      if (totalBalance === 0) {
        console.log(`[Token Gate] Target mint not found in any Token-2022 account`)
      }
      
      console.log(`[Token Gate] Total balance: ${totalBalance}`)
      return totalBalance
    }
    
    // Mint filter succeeded
    const accounts = result.result?.value || []
    console.log(`[Token Gate] Found ${accounts.length} token accounts`)
    
    if (accounts.length === 0) {
      console.log("[Token Gate] No token accounts found for this mint")
      return 0
    }
    
    // Sum up balances from all accounts
    let totalBalance = 0
    for (const account of accounts) {
      try {
        const parsedInfo = account.account.data.parsed.info
        const uiAmount = parsedInfo.tokenAmount.uiAmount || 0
        console.log(`[Token Gate] Account ${account.pubkey.slice(0, 8)}... has ${uiAmount} tokens`)
        totalBalance += uiAmount
      } catch (accError) {
        console.error("[Token Gate] Error parsing account:", accError)
      }
    }
    
    console.log(`[Token Gate] Total balance: ${totalBalance}`)
    return totalBalance
  } catch (error) {
    console.error("[Token Gate] Error fetching token balance:", error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to fetch token balance: ${errorMsg}`)
  }
}

/**
 * Check if a wallet holds the required amount of the specified token
 */
export async function checkTokenHolding(
  walletAddress: string,
  tokenMint: string = REQUIRED_TOKEN_MINT,
  requiredAmount: number = REQUIRED_TOKEN_AMOUNT
): Promise<{
  hasRequiredTokens: boolean
  balance: number
  required: number
  tokenMint: string
}> {
  try {
    // Validate wallet address
    try {
      new PublicKey(walletAddress)
    } catch {
      throw new Error("Invalid Solana wallet address")
    }
    
    // Validate token mint
    try {
      new PublicKey(tokenMint)
    } catch {
      throw new Error("Invalid token mint address")
    }

    const balance = await getTokenBalanceForMint(walletAddress, tokenMint)
    const hasRequiredTokens = balance >= requiredAmount
    
    console.log(
      `[Token Gate] Wallet ${walletAddress.slice(0, 8)}... has ${balance} tokens (required: ${requiredAmount}): ${
        hasRequiredTokens ? "PASS ✅" : "FAIL ❌"
      }`
    )
    
    return {
      hasRequiredTokens,
      balance,
      required: requiredAmount,
      tokenMint,
    }
  } catch (error) {
    console.error("[Token Gate] Error:", error)
    throw error
  }
}

/**
 * Validate wallet address format
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}
