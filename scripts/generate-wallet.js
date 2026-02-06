import { Keypair } from "@solana/web3.js"

// Generate a new keypair for master wallet
const keypair = Keypair.generate()
const secretKeyBase64 = Buffer.from(keypair.secretKey).toString("base64")

console.log("\n🔐 NEW SOLANA MASTER WALLET GENERATED")
console.log("=====================================")
console.log("📍 Public Key (Your Wallet Address):")
console.log(keypair.publicKey.toString())
console.log("\n🔑 Private Key (KEEP SECRET - Base64):")
console.log(secretKeyBase64)
console.log("\n📋 Add to your environment variables:")
console.log(`MASTER_WALLET_PRIVATE_KEY=${secretKeyBase64}`)
console.log("=====================================\n")
