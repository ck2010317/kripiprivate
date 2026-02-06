import { Keypair } from "@solana/web3.js"
import crypto from "crypto"

function getMasterKeypair(): Keypair {
  const privateKeyInput = process.env.MASTER_WALLET_PRIVATE_KEY

  if (!privateKeyInput) {
    throw new Error("MASTER_WALLET_PRIVATE_KEY environment variable not set")
  }

  try {
    let secretKey: Buffer
    if (privateKeyInput.startsWith("[")) {
      const jsonArray = JSON.parse(privateKeyInput)
      secretKey = Buffer.from(jsonArray)
    } else {
      secretKey = Buffer.from(privateKeyInput, "base64")
    }

    if (secretKey.length !== 64) {
      throw new Error(`Invalid key length: ${secretKey.length} bytes`)
    }

    return Keypair.fromSecretKey(secretKey)
  } catch (error) {
    throw new Error(`Invalid MASTER_WALLET_PRIVATE_KEY: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function getMasterPublicKey(): string {
  return getMasterKeypair().publicKey.toString()
}

export function deriveDepositAddressWithKey(index: number): { address: string; privateKey: string } {
  try {
    const masterKeypair = getMasterKeypair()
    const masterSeed = masterKeypair.secretKey.slice(0, 32)

    // Create unique seed using HMAC
    const hmac = crypto.createHmac("sha256", masterSeed)
    hmac.update(`deposit_${index}`)
    const derivedSeed = hmac.digest()

    // Create keypair from derived seed
    const derivedKeypair = Keypair.fromSeed(derivedSeed)

    const fullSecretKey = derivedKeypair.secretKey // This is already 64 bytes
    const secretKeyBase64 = Buffer.from(fullSecretKey).toString("base64")

    // Return both public address and private key
    return {
      address: derivedKeypair.publicKey.toString(),
      privateKey: secretKeyBase64,
    }
  } catch (error) {
    throw new Error(`Failed to derive address at index ${index}`)
  }
}

export function deriveDepositAddress(index: number): string {
  return deriveDepositAddressWithKey(index).address
}

export function deriveMultipleAddresses(count: number): string[] {
  const addresses: string[] = []
  for (let i = 0; i < count; i++) {
    addresses.push(deriveDepositAddress(i))
  }
  return addresses
}
