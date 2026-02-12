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
      <label className="block text-[10px] text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2.5 bg-gray-800/80 border border-gray-700/50 rounded-xl hover:border-gray-600 transition-colors w-full min-w-[130px]"
      >
        <span className="text-lg">{selected?.icon}</span>
        <div className="text-left flex-1">
          <span className="text-sm font-semibold text-white block leading-tight">
            {selected?.name || "Select"}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 w-full min-w-[180px] overflow-hidden">
          {available.map((chain) => (
            <button
              key={chain.chainId}
              onClick={() => {
                onSelect(chain);
                setIsOpen(false);
              }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-gray-800 transition-colors ${
                chain.chainId === selectedChainId
                  ? "bg-green-500/10 text-green-400"
                  : "text-white"
              }`}
            >
              <span className="text-lg">{chain.icon}</span>
              <span className="text-sm font-medium">{chain.name}</span>
              {chain.chainId === selectedChainId && (
                <svg className="w-4 h-4 ml-auto text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
