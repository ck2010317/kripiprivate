"use client";

import { useState, useRef, useEffect } from "react";
import { getTokensForChain, TokenInfo } from "@/config/chains";

interface TokenSelectorProps {
  chainId: string;
  selectedToken: TokenInfo | null;
  onSelect: (token: TokenInfo) => void;
  label: string;
}

export function TokenSelector({
  chainId,
  selectedToken,
  onSelect,
  label,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const tokens = getTokensForChain(chainId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] text-gray-500 mb-1.5 font-semibold uppercase tracking-widest">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.03] border rounded-xl hover:bg-white/[0.06] transition-all duration-200 w-full min-w-[130px] group ${
          isOpen ? "border-violet-500/40 bg-white/[0.06]" : "border-white/[0.06] hover:border-white/[0.12]"
        }`}
      >
        <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-base">
          {selectedToken?.icon || "🪙"}
        </div>
        <div className="text-left flex-1 min-w-0">
          <span className="text-sm font-bold text-white block leading-tight">
            {selectedToken?.symbol || "Select"}
          </span>
          <span className="text-[10px] text-gray-500 leading-tight block truncate">
            {selectedToken?.name || "Token"}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[#12121a]/95 border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 z-50 w-full min-w-[200px] overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
            {tokens.map((token) => {
              const isSelected = selectedToken?.address === token.address;
              return (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelect(token);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-all duration-150 ${
                    isSelected
                      ? "bg-violet-500/10 text-violet-300"
                      : "text-white/80 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-base">
                    {token.icon}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-sm font-semibold block">{token.symbol}</span>
                    <span className="text-[10px] text-gray-500 block truncate">{token.name}</span>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
