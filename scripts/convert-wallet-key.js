// This script converts the wallet JSON array format to base64
// Run: node scripts/convert-wallet-key.js

import { Keypair } from "@solana/web3.js"

// Paste the JSON array from your wallet generation here
const keyArray = [
  66, 167, 77, 208, 250, 241, 51, 75, 99, 101, 157, 182, 253, 150, 217, 231, 54, 26, 78, 67, 49, 8, 252, 151, 114, 75,
  128, 86, 230, 222, 219, 0, 78, 149, 65, 50, 15, 124, 176, 209, 218, 57, 198, 89, 54, 122, 27, 203, 21, 71, 2, 133, 84,
  169, 241, 171, 241, 126, 80, 236, 12, 27, 228, 113,
]

try {
  const secretKey = Buffer.from(keyArray)
  const keypair = Keypair.fromSecretKey(secretKey)
  const base64Key = Buffer.from(keypair.secretKey).toString("base64")

  console.log("✅ Wallet Key Conversion")
  console.log("========================")
  console.log("📍 Public Key:")
  console.log(keypair.publicKey.toString())
  console.log("\n🔑 Private Key (Base64 - Copy this):")
  console.log(base64Key)
  console.log("\n📋 Add to environment variables:")
  console.log(`MASTER_WALLET_PRIVATE_KEY=${base64Key}`)
  console.log("========================\n")
} catch (error) {
  console.error("Error converting wallet key:", error.message)
}
