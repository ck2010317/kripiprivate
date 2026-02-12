"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getOrderStatus,
  getOrderIdByTxHash,
  DEBRIDGE_COMPLETED_STATES,
  DEBRIDGE_FAILED_STATES,
} from "@/lib/debridge";
import { getChainById, isSolanaChain } from "@/config/chains";

interface TransactionStatusProps {
  txHash: string;
  orderId: string;
  fromChainId: string;
  toChainId: string;
  onComplete: () => void;
  onDismiss: () => void;
}

export function TransactionStatus({
  txHash,
  orderId: initialOrderId,
  fromChainId,
  toChainId,
  onComplete,
  onDismiss,
}: TransactionStatusProps) {
  const [status, setStatus] = useState("Pending");
  const [resolvedOrderId, setResolvedOrderId] = useState(initialOrderId);
  const [error, setError] = useState("");

  const fromChain = getChainById(fromChainId);
  const toChain = getChainById(toChainId);

  // Resolve order ID from tx hash if not provided
  useEffect(() => {
    if (resolvedOrderId) return;

    let attempts = 0;
    const maxAttempts = 20;

    const resolveOrderId = async () => {
      try {
        const result = await getOrderIdByTxHash(txHash);
        if (result.orderIds && result.orderIds.length > 0) {
          setResolvedOrderId(result.orderIds[0]);
          return true;
        }
      } catch {
        // Silently retry
      }
      return false;
    };

    const interval = setInterval(async () => {
      attempts++;
      const found = await resolveOrderId();
      if (found || attempts >= maxAttempts) {
        clearInterval(interval);
        if (!found && attempts >= maxAttempts) {
          setError("Could not resolve order ID. Check explorer for status.");
        }
      }
    }, 5000);

    resolveOrderId();

    return () => clearInterval(interval);
  }, [txHash, resolvedOrderId]);

  // Poll order status
  const checkStatus = useCallback(async () => {
    if (!resolvedOrderId) return;
    try {
      const result = await getOrderStatus(resolvedOrderId);
      if (result.status) {
        setStatus(result.status);
      }
    } catch {
      // Don't error on polling failures, just retry
    }
  }, [resolvedOrderId]);

  useEffect(() => {
    if (!resolvedOrderId) return;

    const isTerminal =
      DEBRIDGE_COMPLETED_STATES.includes(status) ||
      DEBRIDGE_FAILED_STATES.includes(status);

    if (isTerminal) return;

    const interval = setInterval(checkStatus, 5000);
    checkStatus(); // initial check

    return () => clearInterval(interval);
  }, [status, resolvedOrderId, checkStatus]);

  const isComplete = DEBRIDGE_COMPLETED_STATES.includes(status);
  const isFailed = DEBRIDGE_FAILED_STATES.includes(status);

  const getExplorerUrl = (chainId: string, hash: string) => {
    if (isSolanaChain(chainId)) {
      return `https://solscan.io/tx/${hash}`;
    }
    const chain = getChainById(chainId);
    return `${chain?.explorerUrl}/tx/${hash}`;
  };

  const getDebridgeExplorerUrl = () => {
    if (resolvedOrderId) {
      return `https://app.debridge.finance/order?orderId=${resolvedOrderId}`;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div
        className={`p-4 rounded-xl border ${
          isComplete
            ? "bg-violet-500/10 border-violet-500/30"
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
              {!isComplete && !isFailed && (
                <span className="ml-2 text-gray-500">({status})</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Tx:</span>
            <a
              href={getExplorerUrl(fromChainId, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 font-mono truncate"
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          </div>
          {getDebridgeExplorerUrl() && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Track:</span>
              <a
                href={getDebridgeExplorerUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                View on deBridge Explorer ↗
              </a>
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}
      </div>

      <div className="flex gap-2">
        {isComplete && (
          <button
            onClick={onComplete}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-sm hover:from-violet-600 hover:to-purple-700 transition-colors"
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
