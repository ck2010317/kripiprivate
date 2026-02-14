"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import { ChainSelector } from "./ChainSelector";
import { TokenSelector } from "./TokenSelector";
import { TransactionStatus } from "./TransactionStatus";
import {
  SUPPORTED_CHAINS,
  getTokensForChain,
  NATIVE_TOKEN_ADDRESS,
  SOLANA_CHAIN_ID,
  isEvmChain,
  isSolanaChain,
  type ChainInfo,
  type TokenInfo,
} from "@/config/chains";
import {
  getRoute,
  getDepositAddress,
  type SquidRoute,
  type SquidRouteResponse,
  ERC20_ABI,
  isChainflipChain,
  getChainflipBridgeType,
} from "@/lib/squid";

type SwapStep = "idle" | "fetching-route" | "approving" | "swapping" | "tracking";

interface ActiveTx {
  hash: string;
  fromChainId: string;
  toChainId: string;
  requestId: string;
  quoteId: string;
  bridgeType?: string;
}

export function SwapCard() {
  // Chain & token state
  const [fromChainId, setFromChainId] = useState("1");
  const [toChainId, setToChainId] = useState(SOLANA_CHAIN_ID);
  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(1);

  // Route state
  const [routeResponse, setRouteResponse] = useState<SquidRouteResponse | null>(null);
  const [step, setStep] = useState<SwapStep>("idle");
  const [error, setError] = useState("");
  const [activeTx, setActiveTx] = useState<ActiveTx | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Deposit address for Solana→EVM
  const [depositInfo, setDepositInfo] = useState<{ address: string; trackingId: string } | null>(null);

  // Debounce ref
  const quoteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const quoteAbortRef = useRef(0);

  // Wallet
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  // Initialize tokens on mount
  useEffect(() => {
    const fromTokens = getTokensForChain(fromChainId);
    if (fromTokens.length > 0 && !fromToken) setFromToken(fromTokens[0]);
    const toTokens = getTokensForChain(toChainId);
    if (toTokens.length > 0 && !toToken) setToToken(toTokens[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format token amount for display
  const formatTokenAmount = useCallback(
    (rawAmount: string, decimals: number): string => {
      try {
        const formatted = ethers.utils.formatUnits(rawAmount, decimals);
        const num = parseFloat(formatted);
        if (num < 0.0001) return "<0.0001";
        if (num < 1) return num.toFixed(6);
        if (num < 1000) return num.toFixed(4);
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
      } catch {
        return "0";
      }
    },
    []
  );

  // Placeholder address for estimation when wallet not connected
  const QUOTE_ESTIMATION_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

  // Fetch route from Squid Router
  const fetchRoute = useCallback(
    async (
      fChainId: string,
      tChainId: string,
      fToken: TokenInfo,
      tToken: TokenInfo,
      amountWei: string,
      quoteAddress: string | undefined,
      quoteId: number
    ) => {
      try {
        const fromAddr = quoteAddress || QUOTE_ESTIMATION_ADDRESS;
        const toAddr = quoteAddress || QUOTE_ESTIMATION_ADDRESS;

        const result = await getRoute({
          fromChain: fChainId,
          fromToken: fToken.address,
          fromAmount: amountWei,
          fromAddress: fromAddr,
          toChain: tChainId,
          toToken: tToken.address,
          toAddress: toAddr,
          slippageConfig: { autoMode: 1 },
          quoteOnly: !quoteAddress,
        });

        if (quoteAbortRef.current === quoteId) {
          setRouteResponse(result);
          setError("");
        }
      } catch (err: unknown) {
        if (quoteAbortRef.current === quoteId) {
          const message = err instanceof Error ? err.message : "Failed to get route";
          if (
            !message.includes("insufficient") &&
            !message.includes("too small")
          ) {
            setError(message);
          }
          setRouteResponse(null);
        }
      } finally {
        if (quoteAbortRef.current === quoteId) {
          setQuoteLoading(false);
          if (step === "fetching-route") setStep("idle");
        }
      }
    },
    [step]
  );

  // Auto-quote with debounce
  useEffect(() => {
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);

    if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
      setRouteResponse(null);
      setQuoteLoading(false);
      return;
    }

    let amountWei: string;
    try {
      amountWei = ethers.utils.parseUnits(amount, fromToken.decimals).toString();
    } catch {
      setRouteResponse(null);
      setQuoteLoading(false);
      return;
    }

    if (amountWei === "0") {
      setRouteResponse(null);
      setQuoteLoading(false);
      return;
    }

    setQuoteLoading(true);
    setError("");

    const quoteId = ++quoteAbortRef.current;

    quoteTimerRef.current = setTimeout(() => {
      fetchRoute(fromChainId, toChainId, fromToken, toToken, amountWei, address || undefined, quoteId);
    }, 1200);

    return () => {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    };
  }, [fromChainId, toChainId, fromToken, toToken, amount, address, slippage, fetchRoute]);

  const handleFromChainSelect = useCallback((chain: ChainInfo) => {
    setFromChainId(chain.chainId);
    setFromToken(null);
    const tokens = getTokensForChain(chain.chainId);
    if (tokens.length > 0) setFromToken(tokens[0]);
  }, []);

  const handleToChainSelect = useCallback((chain: ChainInfo) => {
    setToChainId(chain.chainId);
    setToToken(null);
    const tokens = getTokensForChain(chain.chainId);
    if (tokens.length > 0) setToToken(tokens[0]);
  }, []);

  const handleSwapDirection = useCallback(() => {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
    setFromToken(toToken);
    setToToken(fromToken);
  }, [fromChainId, toChainId, fromToken, toToken]);

  // Execute swap via Squid Router
  const handleSwap = useCallback(async () => {
    if (!walletClient || !address || !fromToken || !toToken || !amount) return;
    if (!isEvmChain(fromChainId)) {
      setError("Solana as source chain requires a Solana wallet (coming soon)");
      return;
    }

    setError("");
    setStep("fetching-route");

    try {
      const amountWei = ethers.utils.parseUnits(amount, fromToken.decimals).toString();

      // Ensure wallet is on the correct source chain
      const requiredChainId = parseInt(fromChainId);
      if (walletChainId !== requiredChainId) {
        setStep("approving");
        await switchChainAsync({ chainId: requiredChainId });
      }

      const provider = new ethers.providers.Web3Provider(
        walletClient.transport as ethers.providers.ExternalProvider
      );
      const signer = provider.getSigner();

      // Get fresh route with wallet addresses for tx generation
      setStep("fetching-route");

      const toAddr = isSolanaChain(toChainId) ? address : address;

      const freshRoute = await getRoute({
        fromChain: fromChainId,
        fromToken: fromToken.address,
        fromAmount: amountWei,
        fromAddress: address,
        toChain: toChainId,
        toToken: toToken.address,
        toAddress: toAddr,
        slippageConfig: { autoMode: 1 },
        quoteOnly: false,
      });

      setRouteResponse(freshRoute);

      if (!freshRoute.route.transactionRequest) {
        throw new Error("No transaction data returned. Try again or adjust amount.");
      }

      const txRequest = freshRoute.route.transactionRequest;

      // Approve token if ERC20 (not native)
      if (fromToken.address !== NATIVE_TOKEN_ADDRESS) {
        setStep("approving");

        const tokenContract = new ethers.Contract(fromToken.address, ERC20_ABI, signer);
        const targetAddress = txRequest.target;
        if (!targetAddress) throw new Error("No target address for approval");

        const currentAllowance = await tokenContract.allowance(address, targetAddress);
        const amountBN = ethers.BigNumber.from(amountWei);

        if (currentAllowance.lt(amountBN)) {
          const approveTx = await tokenContract.approve(targetAddress, ethers.constants.MaxUint256);
          await approveTx.wait();
        }
      }

      // Execute the bridge transaction
      setStep("swapping");

      const txResponse = await walletClient.sendTransaction({
        to: txRequest.target as `0x${string}`,
        data: txRequest.data as `0x${string}`,
        value: txRequest.value ? BigInt(txRequest.value) : BigInt(0),
        ...(txRequest.gasLimit ? { gas: BigInt(txRequest.gasLimit) } : {}),
      });

      setActiveTx({
        hash: txResponse,
        fromChainId,
        toChainId,
        requestId: freshRoute.requestId,
        quoteId: freshRoute.route.quoteId || "",
        bridgeType: isChainflipChain(fromChainId) ? getChainflipBridgeType(toChainId) : undefined,
      });
      setStep("tracking");
    } catch (err: unknown) {
      console.error("Swap error:", err);
      const message =
        err instanceof Error
          ? err.message.includes("user rejected")
            ? "Transaction rejected by user"
            : err.message
          : "Swap failed";
      setError(message);
      setStep("idle");
    }
  }, [walletClient, address, fromToken, toToken, amount, fromChainId, toChainId, walletChainId, switchChainAsync, slippage]);

  const handleTxComplete = useCallback(() => {
    setStep("idle");
    setRouteResponse(null);
    setAmount("");
    setActiveTx(null);
    setDepositInfo(null);
  }, []);

  const handleTxDismiss = useCallback(() => {
    setStep("idle");
    setActiveTx(null);
    setDepositInfo(null);
  }, []);

  // Computed values from Squid route estimate
  const route = routeResponse?.route;
  const estimate = route?.estimate;
  const estimatedOutput = estimate?.toAmount && toToken
    ? formatTokenAmount(estimate.toAmount, toToken.decimals)
    : null;
  const fromAmountUSD = estimate?.fromAmountUSD ? parseFloat(estimate.fromAmountUSD) : undefined;
  const toAmountUSD = estimate?.toAmountUSD ? parseFloat(estimate.toAmountUSD) : undefined;
  const estimatedDuration = estimate?.estimatedRouteDuration;

  const isValidInput = fromToken && toToken && amount && parseFloat(amount) > 0;
  const isSolanaSource = isSolanaChain(fromChainId);
  const needsChainSwitch =
    isConnected && isEvmChain(fromChainId) && walletChainId !== parseInt(fromChainId);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 shadow-2xl shadow-black/30">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white italic">Swap</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Slippage:</span>
            <div className="flex gap-1">
              {[0.5, 1, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                    slippage === s
                      ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                      : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* From Section */}
        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <ChainSelector
                selectedChainId={fromChainId}
                onSelect={handleFromChainSelect}
                label="From Chain"
                excludeChainId={toChainId}
              />
            </div>
            <div className="flex-1">
              <TokenSelector
                chainId={fromChainId}
                selectedToken={fromToken}
                onSelect={setFromToken}
                label="Token"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">
              Amount
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) setAmount(val);
              }}
              placeholder="0.0"
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-700/50 rounded-xl text-white text-lg font-medium placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            {fromAmountUSD !== undefined && (
              <div className="text-xs text-gray-500 mt-1 pl-1">
                ${fromAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleSwapDirection}
            className="w-9 h-9 rounded-full bg-gray-800 border-2 border-gray-700 hover:border-violet-500/50 flex items-center justify-center transition-all group hover:scale-105"
          >
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-violet-400 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Section */}
        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <ChainSelector
                selectedChainId={toChainId}
                onSelect={handleToChainSelect}
                label="To Chain"
                excludeChainId={fromChainId}
              />
            </div>
            <div className="flex-1">
              <TokenSelector
                chainId={toChainId}
                selectedToken={toToken}
                onSelect={setToToken}
                label="Token"
              />
            </div>
          </div>

          {/* Estimated output */}
          <div className="bg-gray-800/60 rounded-xl px-3 py-2.5 border border-gray-700/30">
            <div className="text-[10px] text-gray-400 mb-0.5 font-semibold uppercase tracking-wider">
              You receive (estimated)
            </div>
            {quoteLoading ? (
              <div className="space-y-1.5">
                <div className="h-7 w-40 bg-gray-700/60 rounded-lg animate-pulse" />
                <div className="h-3 w-28 bg-gray-700/40 rounded animate-pulse" />
              </div>
            ) : estimatedOutput && toToken ? (
              <>
                <div className="text-xl font-bold text-violet-400">
                  {estimatedOutput}{" "}
                  <span className="text-base text-violet-400/70">{toToken.symbol}</span>
                </div>
                <div className="flex items-center gap-2">
                  {toAmountUSD !== undefined && (
                    <span className="text-xs text-gray-400">
                      ${toAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-lg text-gray-600 font-medium">0.0</div>
            )}
          </div>
        </div>

        {/* Route Details */}
        {route && estimate && (
          <div className="mt-3 p-3 bg-gray-800/20 rounded-xl border border-gray-700/20 space-y-1.5">
            {estimatedDuration !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Est. Time</span>
                <span className="text-gray-300">
                  {estimatedDuration < 60 ? `~${estimatedDuration}s` : `~${Math.ceil(estimatedDuration / 60)} min`}
                </span>
              </div>
            )}
            {estimate.exchangeRate && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Exchange Rate</span>
                <span className="text-gray-300">
                  1 {fromToken?.symbol} ≈ {parseFloat(estimate.exchangeRate).toFixed(4)} {toToken?.symbol}
                </span>
              </div>
            )}
            {estimate.aggregatePriceImpact && parseFloat(estimate.aggregatePriceImpact) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Price Impact</span>
                <span className="text-gray-300">{parseFloat(estimate.aggregatePriceImpact).toFixed(2)}%</span>
              </div>
            )}
            {estimate.feeCosts && estimate.feeCosts.length > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Fees</span>
                <span className="text-gray-300">
                  ${estimate.feeCosts.reduce((sum, f) => sum + parseFloat(f.amountUSD || "0"), 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4">
          {!isConnected ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-500 to-purple-600 text-white cursor-default shadow-lg shadow-violet-500/25"
            >
              Connect Wallet to Swap
            </button>
          ) : isSolanaSource ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gray-700 text-gray-400 cursor-not-allowed"
            >
              Solana → EVM bridging coming soon
            </button>
          ) : step === "tracking" && activeTx ? (
            <TransactionStatus
              txHash={activeTx.hash}
              fromChainId={activeTx.fromChainId}
              toChainId={activeTx.toChainId}
              requestId={activeTx.requestId}
              quoteId={activeTx.quoteId}
              bridgeType={activeTx.bridgeType}
              onComplete={handleTxComplete}
              onDismiss={handleTxDismiss}
            />
          ) : needsChainSwitch ? (
            <button
              onClick={async () => {
                try {
                  await switchChainAsync({ chainId: parseInt(fromChainId) });
                } catch {
                  setError("Failed to switch chain");
                }
              }}
              className="w-full py-3 px-4 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl font-semibold text-sm hover:bg-yellow-500/30 transition-colors"
            >
              Switch to {SUPPORTED_CHAINS.find((c) => c.chainId === fromChainId)?.name}
            </button>
          ) : !isValidInput ? (
            <button disabled className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gray-700 text-gray-500 cursor-not-allowed">
              Enter an amount
            </button>
          ) : quoteLoading ? (
            <button disabled className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-violet-500/50 text-white cursor-wait">
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Getting best price...
              </span>
            </button>
          ) : !route ? (
            <button disabled className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gray-700 text-gray-500 cursor-not-allowed">
              {error ? "No route available" : "Enter an amount"}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={step !== "idle"}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                step !== "idle"
                  ? "bg-violet-500/50 text-white cursor-wait"
                  : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25"
              }`}
            >
              {step === "fetching-route" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Finding best route...
                </span>
              ) : step === "approving" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Confirm in wallet...
                </span>
              ) : step === "swapping" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Executing swap...
                </span>
              ) : (
                `Swap ${fromToken?.symbol} → ${toToken?.symbol}`
              )}
            </button>
          )}
        </div>

        {/* Powered by */}
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-600">
            Powered by{" "}
            <a
              href="https://squidrouter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-violet-400 transition-colors"
            >
              Squid Router
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
