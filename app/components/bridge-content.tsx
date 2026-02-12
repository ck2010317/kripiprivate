"use client"

import { SwapCard } from "@/app/components/private-bridge-dapp"
import { Web3Provider } from "@/app/components/web3-provider"

export default function BridgeContent() {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-green-950/30 flex items-center justify-center p-4">
        <SwapCard />
      </div>
    </Web3Provider>
  )
}
