"use client"

import dynamic from "next/dynamic"

// Dynamically import to avoid SSR issues with wagmi/rainbowkit (localStorage access)
const BridgeContent = dynamic(() => import("@/app/components/bridge-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[120px]" />
      <div className="w-full max-w-[440px] mx-auto relative">
        <div className="relative">
          <div className="absolute -inset-[1px] bg-gradient-to-b from-white/[0.08] to-transparent rounded-[22px]" />
          <div className="relative bg-[#0e0e18]/90 backdrop-blur-2xl rounded-[22px] p-6 shadow-2xl shadow-black/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] animate-pulse" />
              <div className="h-5 w-16 bg-white/[0.04] rounded-lg animate-pulse" />
            </div>
            <div className="h-44 bg-white/[0.02] rounded-2xl border border-white/[0.05] animate-pulse" />
            <div className="h-44 bg-white/[0.02] rounded-2xl border border-white/[0.05] animate-pulse" />
            <div className="h-12 bg-violet-500/15 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  ),
})

export default function BridgePage() {
  return <BridgeContent />
}
