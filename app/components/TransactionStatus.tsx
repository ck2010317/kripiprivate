"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getStatus,
  SQUID_COMPLETED_STATES,
  SQUID_FAILED_STATES,
} from "@/lib/squid";
import { getChainById, isSolanaChain } from "@/config/chains";

interface TransactionStatusProps {
  txHash: string;
  fromChainId: string;
  toChainId: string;
  requestId: string;
  quoteId: string;
  bridgeType?: string;
  solanaSignature?: string; // Actual Solana tx signature for explorer links
  toAddress?: string; // Destination address to check balance (for Solana sources)
  toToken?: { address: string; decimals: number }; // Token to check (for Solana sources)
  onComplete: () => void;
  onDismiss: () => void;
}

export function TransactionStatus({
  txHash,
  fromChainId,
  toChainId,
  requestId,
  quoteId,
  bridgeType,
  solanaSignature,
  toAddress,
  toToken,
  onComplete,
  onDismiss,
}: TransactionStatusProps) {
  const [status, setStatus] = useState("ongoing");
  const [axelarUrl, setAxelarUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [notFoundCount, setNotFoundCount] = useState(0);
  const MAX_POLL_FAILURES = 30; // Stop after ~2.5 min of actual errors
  const MAX_NOT_FOUND = 60; // Allow up to 5 min of 'not found yet' (Squid indexing delay)

  const isSolanaSource = isSolanaChain(fromChainId);

  const fromChain = getChainById(fromChainId);
  const toChain = getChainById(toChainId);

  // For explorer links: use actual Solana signature if available, otherwise txHash
  const explorerTxHash = solanaSignature || txHash;

  // Timer
  useEffect(() => {
    const isTerminal =
      SQUID_COMPLETED_STATES.includes(status) || SQUID_FAILED_STATES.includes(status);
    if (isTerminal) return;

    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Poll transaction status via Squid
  const checkStatus = useCallback(async () => {
    try {
      console.log("Status poll:", { transactionId: txHash, fromChainId, toChainId, bridgeType, requestId: requestId?.slice(0, 8) });
      const result = await getStatus({
        transactionId: txHash,
        fromChainId,
        toChainId,
        requestId,
        quoteId,
        bridgeType,
      });

      // Handle 'not_found_yet' (404 from Squid, converted by our proxy)
      if (result.squidTransactionStatus === "not_found_yet") {
        setNotFoundCount((c) => c + 1);
        console.log("Status: not found yet (Squid indexing...), retry", notFoundCount + 1);
        return;
      }

      if (result.squidTransactionStatus) {
        setStatus(result.squidTransactionStatus);
      }
      if (result.axelarTransactionUrl) {
        setAxelarUrl(result.axelarTransactionUrl);
      }
      setFailCount(0); // Reset on success
      setNotFoundCount(0); // Reset on success
    } catch {
      setFailCount((c) => c + 1);
    }
  }, [txHash, fromChainId, toChainId, requestId, quoteId, bridgeType, notFoundCount]);

  useEffect(() => {
    const isTerminal =
      SQUID_COMPLETED_STATES.includes(status) ||
      SQUID_FAILED_STATES.includes(status);

    if (isTerminal) return;

    // Stop polling after too many consecutive actual errors
    if (failCount >= MAX_POLL_FAILURES) {
      setError("Status tracking encountered errors. Your swap may still complete — check the explorer link below.");
      return;
    }

    // After extended 'not found' period, show as likely complete
    if (notFoundCount >= MAX_NOT_FOUND) {
      setStatus("likely_complete");
      return;
    }

    const interval = setInterval(checkStatus, 5000);
    checkStatus(); // initial check

    return () => clearInterval(interval);
  }, [status, checkStatus, failCount, notFoundCount]);

  const isComplete = SQUID_COMPLETED_STATES.includes(status);
  const isFailed = SQUID_FAILED_STATES.includes(status);

  const getExplorerUrl = (chainId: string, hash: string) => {
    if (isSolanaChain(chainId)) {
      return `https://solscan.io/tx/${hash}`;
    }
    const chain = getChainById(chainId);
    return `${chain?.explorerUrl}/tx/${hash}`;
  };

  const getSquidExplorerUrl = () => {
    if (axelarUrl) return axelarUrl;
    return `https://axelarscan.io/gmp/${explorerTxHash}`;
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  // Progress steps
  const steps = [
    { label: "Transaction Sent", done: true },
    { label: "Processing on " + (fromChain?.name || "source"), done: status !== "ongoing" || elapsed > 10 },
    { label: "Bridging to " + (toChain?.name || "destination"), done: isComplete || status === "partial_success" || status === "needs_gas" },
    { label: "Complete", done: isComplete },
  ];

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border overflow-hidden ${
        isComplete
          ? "bg-emerald-500/[0.04] border-emerald-500/20"
          : isFailed
          ? "bg-red-500/[0.04] border-red-500/20"
          : "bg-violet-500/[0.04] border-violet-500/15"
      }`}>
        {/* Header */}
        <div className={`px-4 py-3 flex items-center gap-3 border-b ${
          isComplete ? "border-emerald-500/10" : isFailed ? "border-red-500/10" : "border-violet-500/10"
        }`}>
          {!isComplete && !isFailed && (
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/[0.06]" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400" strokeDasharray="88" strokeDashoffset={88 - (elapsed % 60) * 1.47} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              </div>
            </div>
          )}
          {isComplete && (
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {isFailed && (
            <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          <div className="flex-1">
            <p className="text-sm font-semibold text-white">
              {isComplete ? "Bridge Complete!" : isFailed ? "Bridge Failed" : "Bridging in Progress"}
            </p>
            <p className="text-[11px] text-gray-500">
              {fromChain?.name} → {toChain?.name}
              {!isComplete && !isFailed && (
                <span className="ml-2 text-gray-600">• {formatTime(elapsed)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        {!isFailed && (
          <div className="px-4 py-3 space-y-0">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    s.done
                      ? "border-violet-400 bg-violet-400/20"
                      : i === steps.findIndex((x) => !x.done)
                      ? "border-violet-400/50 bg-transparent animate-pulse"
                      : "border-white/10 bg-transparent"
                  }`}>
                    {s.done && (
                      <svg className="w-2 h-2 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-px h-5 transition-all duration-500 ${
                      s.done ? "bg-violet-400/30" : "bg-white/[0.06]"
                    }`} />
                  )}
                </div>
                <span className={`text-xs font-medium -mt-0.5 ${
                  s.done ? "text-white/70" : "text-gray-600"
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Links */}
        <div className="px-4 py-3 border-t border-white/[0.04] flex items-center gap-4">
          <a
            href={getExplorerUrl(fromChainId, explorerTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-gray-500 hover:text-violet-400 transition-colors flex items-center gap-1 font-medium"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Source Tx
          </a>
          <a
            href={getSquidExplorerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-gray-500 hover:text-violet-400 transition-colors flex items-center gap-1 font-medium"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Axelarscan
          </a>
          <span className="text-[10px] text-gray-700 font-mono ml-auto">
            {explorerTxHash.slice(0, 6)}…{explorerTxHash.slice(-4)}
          </span>
        </div>

        {error && (
          <div className="px-4 pb-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {isComplete && (
          <button
            onClick={onComplete}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-200"
          >
            New Swap
          </button>
        )}
        <button
          onClick={onDismiss}
          className="flex-1 py-2.5 px-4 bg-white/[0.04] border border-white/[0.08] text-gray-400 rounded-xl font-semibold text-sm hover:bg-white/[0.06] transition-colors"
        >
          {isComplete ? "Close" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
