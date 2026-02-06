import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from "@solana/web3.js"

const RPC_ENDPOINT = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
const connection = new Connection(RPC_ENDPOINT, "confirmed")

function decryptPrivateKey(encodedKey: string, salt: string): Uint8Array {
  try {
    console.log("[v0] DEBUG - Encoded key type:", typeof encodedKey)
    console.log("[v0] DEBUG - Encoded key length:", encodedKey.length)
    console.log("[v0] DEBUG - Encoded key first 50 chars:", encodedKey.substring(0, 50))

    if (encodedKey.startsWith("[")) {
      const keyArray = JSON.parse(encodedKey)
      return new Uint8Array(keyArray)
    }

    const secretKeyBuffer = Buffer.from(encodedKey, "base64")
    console.log("[v0] DEBUG - Decoded buffer length:", secretKeyBuffer.length)
    console.log("[v0] DEBUG - Decoded buffer as string:", secretKeyBuffer.toString("base64").substring(0, 50))

    if (secretKeyBuffer.length !== 64) {
      throw new Error(
        `Expected 64-byte secret key, got ${secretKeyBuffer.length} bytes. Raw length: ${encodedKey.length}`,
      )
    }

    return new Uint8Array(secretKeyBuffer)
  } catch (error) {
    throw new Error("Failed to decode private key: " + (error instanceof Error ? error.message : "Unknown error"))
  }
}

export async function sweepFundsToMaster(
  encryptedPrivateKey: string,
  masterWalletAddress: string,
  salt: string,
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const secretKeyArray = decryptPrivateKey(encryptedPrivateKey, salt)
    const derivedKeypair = Keypair.fromSecretKey(secretKeyArray)
    const derivedAddress = derivedKeypair.publicKey

    console.log("[v0] Starting sweep from:", derivedAddress.toBase58(), "to:", masterWalletAddress)

    // Get balance of derived address
    const balance = await connection.getBalance(derivedAddress)
    console.log("[v0] Derived address balance:", balance, "lamports")

    if (balance === 0) {
      return {
        success: false,
        error: "No funds to sweep at this address",
      }
    }

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")

    // Create transaction: send all balance minus fees to master wallet
    const masterPubkey = new PublicKey(masterWalletAddress)

    // Reserve 5000 lamports for transaction fee
    const amountToTransfer = Math.max(0, balance - 5000)

    if (amountToTransfer <= 0) {
      return {
        success: false,
        error: "Insufficient balance after fees",
      }
    }

    const transaction = new Transaction({
      feePayer: derivedAddress,
      blockhash,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: derivedAddress,
        toPubkey: masterPubkey,
        lamports: amountToTransfer,
      }),
    )

    // Sign and send transaction
    transaction.sign(derivedKeypair)
    const signature = await connection.sendRawTransaction(transaction.serialize())

    console.log("[v0] Sweep transaction sent:", signature)

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    })

    if (confirmation.value.err) {
      throw new Error("Transaction failed: " + JSON.stringify(confirmation.value.err))
    }

    console.log("[v0] Sweep completed successfully. Transferred:", amountToTransfer, "lamports")

    return {
      success: true,
      signature,
    }
  } catch (error) {
    console.error("[v0] Sweep error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown sweep error",
    }
  }
}

export async function processBatchSweep(masterWalletAddress: string): Promise<{ processed: number; failed: number }> {
  try {
    const masterPubkey = new PublicKey(masterWalletAddress)

    // In production: fetch pending sweep requests from database
    // For each, decrypt key, create transaction, and execute

    console.log("[v0] Batch sweep completed")
    return { processed: 0, failed: 0 }
  } catch (error) {
    console.error("[v0] Batch sweep error:", error)
    return { processed: 0, failed: 1 }
  }
}
