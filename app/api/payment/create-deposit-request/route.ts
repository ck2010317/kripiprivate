import { type NextRequest, NextResponse } from "next/server"
import { deriveDepositAddressWithKey } from "@/lib/hd-wallet"
import { solToLamports } from "@/lib/solana-verify"
import { getSupabaseServer } from "@/lib/supabase-server"

function encodePrivateKey(privateKey: string): string {
  return privateKey
}

export async function POST(request: NextRequest) {
  try {
    const { userId, cardValue, solAmount, cardholderName, email, cardType } = await request.json()

    if (!userId || !cardValue || !solAmount || !cardholderName || !email || !cardType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseServer()

    // Get the next derivation index
    const { data: lastRequest } = await supabase
      .from("deposit_requests")
      .select("derivation_index")
      .order("derivation_index", { ascending: false })
      .limit(1)

    const nextIndex = (lastRequest?.[0]?.derivation_index ?? -1) + 1

    let depositAddress: string
    let derivedPrivateKey: string
    try {
      const derived = deriveDepositAddressWithKey(nextIndex)
      depositAddress = derived.address
      derivedPrivateKey = derived.privateKey
    } catch (derivationError) {
      const errorMsg = derivationError instanceof Error ? derivationError.message : "Failed to derive address"
      console.error(" Derivation error:", errorMsg)
      return NextResponse.json(
        { error: `Address derivation failed: ${errorMsg}. Check MASTER_WALLET_PRIVATE_KEY environment variable.` },
        { status: 500 },
      )
    }

    const expectedLamports = solToLamports(solAmount)

    const encodedKey = encodePrivateKey(derivedPrivateKey)

    const { data, error } = await supabase
      .from("deposit_requests")
      .insert({
        user_id: userId,
        deposit_address: depositAddress,
        derivation_index: nextIndex,
        expected_amount: expectedLamports,
        card_value: cardValue,
        card_holder_name: cardholderName,
        email: email,
        card_type: cardType,
        derived_private_key: encodedKey,
        sweep_status: "pending",
      })
      .select()

    if (error) {
      console.error("[v0] Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Error creating deposit request:", errorMsg)
    return NextResponse.json({ error: "Failed to create deposit request" }, { status: 500 })
  }
}
