"use client"

import dynamic from "next/dynamic"

// Dynamically import to avoid SSR issues with wagmi/rainbowkit (localStorage access)
const BridgeContent = dynamic(() => import("@/app/components/bridge-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-green-950/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl shadow-black/30 animate-pulse">
          <div className="h-8 w-24 bg-gray-700 rounded mb-5" />
          <div className="h-40 bg-gray-800/30 rounded-xl mb-4" />
          <div className="h-40 bg-gray-800/30 rounded-xl mb-4" />
          <div className="h-12 bg-gray-700 rounded-xl" />
        </div>
      </div>
    </div>
  ),
})

export default function BridgePage() {
  return <BridgeContent />
}
