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
    <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-800/50 bg-gray-950/50 backdrop-blur-xl">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/20">
          PB
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          Private<span className="text-violet-400">Bridge</span>
        </span>
      </div>

      {/* Nav Links */}
      <div className="hidden sm:flex items-center gap-6">
        <span className="text-sm font-medium text-violet-400 cursor-default">Swap</span>
      </div>

      {/* Wallet Button */}
      <div className="relative" ref={dropdownRef}>
        {isConnected && address ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-sm text-violet-400 font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
            <button
              onClick={() => disconnect()}
              className="px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl font-medium transition-all duration-200"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={isConnecting}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                "Connect Wallet"
              )}
            </button>

            {/* Wallet Dropdown */}
            {showDropdown && !isConnecting && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                <div className="p-2 space-y-1">
                  {connectors.map((connector) => (
                    <button
                      key={connector.uid}
                      onClick={() => {
                        connect({ connector });
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-violet-500/10 hover:text-violet-400 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-md bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                        {connector.name.charAt(0)}
                      </div>
                      {connector.name}
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
