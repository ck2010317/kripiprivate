"use client"

import { SwapCard } from "@/app/components/private-bridge-dapp"
import { BridgeNavbar } from "@/app/components/bridge-navbar"
import { Web3Provider } from "@/app/components/web3-provider"

export default function BridgeContent() {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-[#0a0a12] flex flex-col relative overflow-hidden">
        {/* Animated background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/5 rounded-full blur-[150px]" />
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <BridgeNavbar />
        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <SwapCard />
        </div>

        {/* Bottom ambient glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
      </div>
    </Web3Provider>
  )
}
