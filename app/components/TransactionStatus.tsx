"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatus } from "@/lib/squid";
import { getChainById } from "@/config/chains";

interface TransactionStatusProps {
  txHash: string;
  requestId: string;
  fromChainId: string;
  toChainId: string;
  onComplete: () => void;
  onDismiss: () => void;
}

export function TransactionStatus({
  txHash,
  requestId,
  fromChainId,
  toChainId,
  onComplete,
  onDismiss,
}: TransactionStatusProps) {
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState("");

  const fromChain = getChainById(fromChainId);
  const toChain = getChainById(toChainId);

  const checkStatus = useCallback(async () => {
    try {
      const result = await getStatus({
        transactionId: txHash,
        requestId,
        fromChainId,
        toChainId,
      });
      setStatus(result.squidTransactionStatus);
    } catch {
      // Don't error on polling failures, just retry
    }
  }, [txHash, requestId, fromChainId, toChainId]);

  useEffect(() => {
    const completedStatuses = ["success", "partial_success", "needs_gas", "not_found"];

    if (completedStatuses.includes(status)) return;

    const interval = setInterval(checkStatus, 5000);
    checkStatus(); // initial check

    return () => clearInterval(interval);
  }, [status, checkStatus]);

  const isComplete = status === "success" || status === "partial_success";
  const isFailed = status === "needs_gas" || status === "not_found";

  return (
    <div className="space-y-3">
      <div
        className={`p-4 rounded-xl border ${
          isComplete
            ? "bg-green-500/10 border-green-500/30"
            : isFailed
            ? "bg-red-500/10 border-red-500/30"
            : "bg-blue-500/10 border-blue-500/30"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          {!isComplete && !isFailed && (
            <svg
              className="animate-spin h-5 w-5 text-blue-400"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isComplete && <span className="text-2xl">✅</span>}
          {isFailed && <span className="text-2xl">❌</span>}

          <div>
            <p className="text-sm font-semibold text-white">
              {isComplete
                ? "Bridge Complete!"
                : isFailed
                ? "Bridge Failed"
                : "Bridging in Progress..."}
            </p>
            <p className="text-xs text-gray-400">
              {fromChain?.name} → {toChain?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Tx:</span>
          <a
            href={`${fromChain?.explorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 font-mono truncate"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>

        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}
      </div>

      <div className="flex gap-2">
        {isComplete && (
          <button
            onClick={onComplete}
            className="flex-1 py-2.5 px-4 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition-colors"
          >
            New Swap
          </button>
        )}
        <button
          onClick={onDismiss}
          className="flex-1 py-2.5 px-4 bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-600 transition-colors"
        >
          {isComplete ? "Close" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
