"use client";

import { useState, useRef, useEffect } from "react";
import { SUPPORTED_CHAINS, ChainInfo } from "@/config/chains";

interface ChainSelectorProps {
  selectedChainId: string;
  onSelect: (chain: ChainInfo) => void;
  label: string;
  excludeChainId?: string;
}

export function ChainSelector({
  selectedChainId,
  onSelect,
  label,
  excludeChainId,
}: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = SUPPORTED_CHAINS.find((c) => c.chainId === selectedChainId);
  const available = SUPPORTED_CHAINS.filter((c) => c.chainId !== excludeChainId);

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
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-base shadow-sm"
          style={{ backgroundColor: `${selected?.color || "#666"}15` }}
        >
          {selected?.icon}
        </div>
        <div className="text-left flex-1 min-w-0">
          <span className="text-sm font-semibold text-white block leading-tight truncate">
            {selected?.name || "Select"}
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
          <div className="p-1.5 max-h-[280px] overflow-y-auto scrollbar-thin">
            {available.map((chain) => {
              const isSelected = chain.chainId === selectedChainId;
              return (
                <button
                  key={chain.chainId}
                  onClick={() => {
                    onSelect(chain);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                    isSelected
                      ? "bg-violet-500/10 text-violet-300"
                      : "text-white/80 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
                    style={{ backgroundColor: `${chain.color}15` }}
                  >
                    {chain.icon}
                  </div>
                  <span className="text-sm font-medium flex-1 text-left">{chain.name}</span>
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
