"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState, useRef, useEffect } from "react";

export function BridgeNavbar() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="w-full px-6 py-3.5 flex items-center justify-between border-b border-white/[0.06] bg-black/20 backdrop-blur-2xl relative z-20">
      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-purple-600 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/25">
            PB
          </div>
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          Private<span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Bridge</span>
        </span>
      </div>

      {/* Center nav pill */}
      <div className="hidden sm:flex items-center">
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-full px-1 py-1">
          <span className="px-4 py-1.5 text-sm font-medium text-white bg-violet-500/15 border border-violet-500/20 rounded-full">
            Swap
          </span>
        </div>
      </div>

      {/* Wallet Button */}
      <div className="relative" ref={dropdownRef}>
        {isConnected && address ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-full backdrop-blur-sm">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-50" />
              </div>
              <span className="text-sm text-white/80 font-mono font-medium">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
            <button
              onClick={() => disconnect()}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all duration-200"
              title="Disconnect"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={isConnecting}
              className="relative group px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-semibold text-sm rounded-full shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full blur-lg opacity-0 group-hover:opacity-30 transition-opacity" />
              <span className="relative">
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  "Connect Wallet"
                )}
              </span>
            </button>

            {/* Wallet Dropdown */}
            {showDropdown && !isConnecting && (
              <div className="absolute right-0 top-full mt-3 w-60 bg-[#12121a]/95 border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Select Wallet</p>
                </div>
                <div className="p-2 space-y-0.5">
                  {connectors.map((connector) => (
                    <button
                      key={connector.uid}
                      onClick={() => {
                        connect({ connector });
                        setShowDropdown(false);
                      }}
                      className="w-full px-3.5 py-3 text-left text-sm text-gray-200 hover:bg-white/[0.06] rounded-xl transition-all duration-150 flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 border border-white/[0.06] flex items-center justify-center text-xs font-bold text-gray-300 group-hover:border-violet-500/30 transition-colors">
                        {connector.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium block">{connector.name}</span>
                        <span className="text-[10px] text-gray-500">Click to connect</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
