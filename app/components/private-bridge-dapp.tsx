"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient } from "wagmi";
import { ethers } from "ethers";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  SystemProgram,
} from "@solana/web3.js";
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
  type SquidTransactionRequest,
  ERC20_ABI,
  isChainflipChain,
  getChainflipBridgeType,
} from "@/lib/squid";

// Phantom wallet types
interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: { toBase58(): string; toString(): string } | null;
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signAndSendTransaction(
    transaction: Transaction | VersionedTransaction,
    options?: { skipPreflight?: boolean }
  ): Promise<{ signature: string }>;
  signTransaction(
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction>;
  isConnected: boolean;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
    phantom?: { solana?: PhantomProvider };
  }
}

const SOLANA_RPC = "https://mainnet.helius-rpc.com/?api-key=7d359733-8771-4d20-af8c-54f756c96bb1";

type SwapStep = "idle" | "fetching-route" | "approving" | "swapping" | "tracking";

interface ActiveTx {
  hash: string;
  fromChainId: string;
  toChainId: string;
  requestId: string;
  quoteId: string;
  bridgeType?: string;
  solanaSignature?: string; // Actual Solana tx signature for explorer links
}

function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  return window.phantom?.solana || window.solana || null;
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

  // Solana wallet state
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [solanaConnecting, setSolanaConnecting] = useState(false);

  // Debounce ref
  const quoteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const quoteAbortRef = useRef(0);

  // Wallet
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  // Auto-detect Phantom wallet connection
  useEffect(() => {
    const phantom = getPhantomProvider();
    if (phantom?.isConnected && phantom.publicKey) {
      setSolanaAddress(phantom.publicKey.toBase58());
    }
  }, []);

  // Connect Phantom wallet
  const connectPhantom = useCallback(async () => {
    const phantom = getPhantomProvider();
    if (!phantom) {
      window.open("https://phantom.app/", "_blank");
      return;
    }
    try {
      setSolanaConnecting(true);
      const resp = await phantom.connect();
      setSolanaAddress(resp.publicKey.toBase58());
    } catch (err) {
      console.error("Phantom connect error:", err);
      setError("Failed to connect Phantom wallet");
    } finally {
      setSolanaConnecting(false);
    }
  }, []);

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
  // Solana placeholder address for quote estimation
  const SOLANA_ESTIMATION_ADDRESS = "BnWoJBMZV3M1bBghanUE4PJqg3bqwQaxdA4Y6W3mgMBP";

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
        // Use appropriate address based on source chain
        const isSolSource = isSolanaChain(fChainId);
        const fromAddr = isSolSource
          ? (solanaAddress || SOLANA_ESTIMATION_ADDRESS)
          : (quoteAddress || QUOTE_ESTIMATION_ADDRESS);
        const toAddr = isSolanaChain(tChainId)
          ? (solanaAddress || SOLANA_ESTIMATION_ADDRESS)
          : (quoteAddress || QUOTE_ESTIMATION_ADDRESS);

        const isQuoteOnly = isSolSource
          ? !solanaAddress
          : !quoteAddress;

        const result = await getRoute({
          fromChain: fChainId,
          fromToken: fToken.address,
          fromAmount: amountWei,
          fromAddress: fromAddr,
          toChain: tChainId,
          toToken: tToken.address,
          toAddress: toAddr,
          slippageConfig: { autoMode: 1 },
          quoteOnly: isQuoteOnly,
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
    [step, solanaAddress]
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
  }, [fromChainId, toChainId, fromToken, toToken, amount, address, solanaAddress, slippage, fetchRoute]);

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

  // Execute swap via Squid Router (EVM source)
  const handleSwap = useCallback(async () => {
    if (!walletClient || !address || !fromToken || !toToken || !amount) return;
    if (!isEvmChain(fromChainId)) {
      // Solana source is handled by handleSolanaSwap
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

      const txRequest = freshRoute.route.transactionRequest as SquidTransactionRequest;

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

  // Execute Solana → EVM swap
  // Handles two Squid response types:
  // 1. ON_CHAIN_EXECUTION: Squid returns a serialized Solana tx to sign & send directly
  // 2. CHAINFLIP_DEPOSIT_ADDRESS: Need to call /deposit-address then do a simple SOL transfer
  const handleSolanaSwap = useCallback(async () => {
    if (!solanaAddress || !fromToken || !toToken || !amount || !address) return;
    if (!isSolanaChain(fromChainId)) return;

    const phantom = getPhantomProvider();
    if (!phantom || !phantom.publicKey) {
      setError("Phantom wallet not connected");
      return;
    }

    setError("");
    setStep("fetching-route");

    try {
      const amountWei = ethers.utils.parseUnits(amount, fromToken.decimals).toString();

      // Get route with real addresses
      const freshRoute = await getRoute({
        fromChain: fromChainId,
        fromToken: fromToken.address,
        fromAmount: amountWei,
        fromAddress: solanaAddress,
        toChain: toChainId,
        toToken: toToken.address,
        toAddress: address, // EVM destination address
        slippageConfig: { autoMode: 1 },
        quoteOnly: false,
      });

      setRouteResponse(freshRoute);

      if (!freshRoute.route.transactionRequest) {
        throw new Error("No transaction data returned. Try again or adjust amount.");
      }

      const txRequest = freshRoute.route.transactionRequest;
      const txType = txRequest.type as string;
      console.log("Solana route transactionRequest type:", txType);

      setStep("swapping");

      if (txType === "ON_CHAIN_EXECUTION") {
        // Direct Solana transaction — deserialize, sign, send
        const txData = txRequest.data as string;
        const txBytes = Uint8Array.from(atob(txData), (c) => c.charCodeAt(0));

        let signature: string;

        // Try as VersionedTransaction first, fall back to legacy Transaction
        try {
          const versionedTx = VersionedTransaction.deserialize(txBytes);
          console.log("Deserialized as VersionedTransaction");

          // Phantom signs and sends VersionedTransaction
          const result = await phantom.signAndSendTransaction(versionedTx, {
            skipPreflight: false,
          });
          signature = result.signature;
        } catch (versionedErr) {
          console.log("VersionedTransaction failed, trying legacy Transaction:", versionedErr);
          const legacyTx = Transaction.from(txBytes);

          const result = await phantom.signAndSendTransaction(legacyTx, {
            skipPreflight: false,
          });
          signature = result.signature;
        }

        console.log("Solana tx signature:", signature);
        console.log(`Solscan: https://solscan.io/tx/${signature}`);

        // For Solana ON_CHAIN_EXECUTION: use requestId as transactionId for status API
        // requestId can come from: route response header, response body, or transactionRequest
        const trackingId = freshRoute.requestId || (txRequest.requestId as string) || "";
        const bridgeType = getChainflipBridgeType(toChainId);
        console.log("Status tracking ID:", trackingId);
        console.log("Bridge type:", bridgeType);

        setActiveTx({
          hash: trackingId || signature, // Use requestId; fallback to signature if all else fails
          fromChainId,
          toChainId,
          requestId: trackingId,
          quoteId: freshRoute.route.quoteId || "",
          bridgeType,
          solanaSignature: signature, // Keep actual tx hash for explorer link
        });
        setStep("tracking");

      } else if (txType === "CHAINFLIP_DEPOSIT_ADDRESS") {
        // Deposit address flow — call /deposit-address, then simple SOL transfer
        setStep("approving");

        const depositResult = await getDepositAddress(txRequest);
        console.log("Deposit address result:", depositResult);

        setDepositInfo({
          address: depositResult.depositAddress,
          trackingId: depositResult.chainflipStatusTrackingId,
        });

        setStep("swapping");

        const connection = new Connection(SOLANA_RPC, "confirmed");
        const fromPubkey = new PublicKey(solanaAddress);
        const toPubkey = new PublicKey(depositResult.depositAddress);
        const lamports = parseInt(depositResult.amount);

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          })
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = fromPubkey;

        const { signature } = await phantom.signAndSendTransaction(transaction, {
          skipPreflight: false,
        });

        console.log("SOL deposit transfer signature:", signature);

        const bridgeType = getChainflipBridgeType(toChainId);

        setActiveTx({
          hash: depositResult.chainflipStatusTrackingId,
          fromChainId,
          toChainId,
          requestId: freshRoute.requestId,
          quoteId: freshRoute.route.quoteId || "",
          bridgeType,
        });
        setStep("tracking");

      } else {
        throw new Error(`Unsupported transaction type: ${txType}`);
      }
    } catch (err: unknown) {
      console.error("Solana swap error:", err);
      const message =
        err instanceof Error
          ? err.message.includes("User rejected")
            ? "Transaction rejected by user"
            : err.message
          : "Swap failed";
      setError(message);
      setStep("idle");
    }
  }, [solanaAddress, address, fromToken, toToken, amount, fromChainId, toChainId]);

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
    <div className="w-full max-w-[440px] mx-auto">
      {/* Outer glow effect */}
      <div className="relative group">
        <div className="absolute -inset-[1px] bg-gradient-to-b from-violet-500/20 via-purple-500/10 to-transparent rounded-[22px] opacity-60" />
        <div className="absolute -inset-[1px] bg-gradient-to-b from-white/[0.08] to-transparent rounded-[22px]" />
        
        <div className="relative bg-[#0e0e18]/90 backdrop-blur-2xl rounded-[22px] p-6 shadow-2xl shadow-black/40">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">Swap</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 mr-1 uppercase tracking-wider">Slippage</span>
            <div className="flex gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5">
              {[0.5, 1, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200 ${
                    slippage === s
                      ? "bg-violet-500/20 text-violet-300 shadow-sm shadow-violet-500/10"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* From Section */}
        <div className="relative bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05] hover:border-white/[0.08] transition-colors">
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <ChainSelector
                selectedChainId={fromChainId}
                onSelect={handleFromChainSelect}
                label="From"
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
          <div className="relative">
            <label className="block text-[10px] text-gray-500 mb-1.5 font-semibold uppercase tracking-widest">
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
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-xl font-semibold placeholder-gray-700 focus:outline-none focus:border-violet-500/30 focus:bg-white/[0.04] transition-all duration-200"
            />
            {fromAmountUSD !== undefined && (
              <div className="absolute right-4 bottom-3.5 text-xs text-gray-500 font-medium">
                ≈ ${fromAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={handleSwapDirection}
            className="relative group/swap"
          >
            <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-md opacity-0 group-hover/swap:opacity-100 transition-opacity" />
            <div className="relative w-10 h-10 rounded-full bg-[#0e0e18] border-[3px] border-[#1a1a2e] flex items-center justify-center transition-all duration-300 group-hover/swap:border-violet-500/30 group-hover/swap:scale-110 group-active/swap:scale-95">
              <svg
                className="w-4 h-4 text-gray-400 group-hover/swap:text-violet-400 transition-all duration-300 group-hover/swap:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </button>
        </div>

        {/* To Section */}
        <div className="relative bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05] hover:border-white/[0.08] transition-colors">
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <ChainSelector
                selectedChainId={toChainId}
                onSelect={handleToChainSelect}
                label="To"
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
          <div className="relative bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06]">
            <div className="text-[10px] text-gray-500 mb-1 font-semibold uppercase tracking-widest">
              You receive (estimated)
            </div>
            {quoteLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-36 bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] rounded-lg animate-pulse" />
                <div className="h-3.5 w-20 bg-white/[0.04] rounded animate-pulse" />
              </div>
            ) : estimatedOutput && toToken ? (
              <>
                <div className="text-2xl font-bold bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">
                  {estimatedOutput}{" "}
                  <span className="text-base font-semibold text-violet-400/60">{toToken.symbol}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {toAmountUSD !== undefined && (
                    <span className="text-xs text-gray-500 font-medium">
                      ≈ ${toAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  {fromAmountUSD !== undefined && toAmountUSD !== undefined && fromAmountUSD > 0 && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      toAmountUSD >= fromAmountUSD * 0.99
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {toAmountUSD >= fromAmountUSD * 0.99 ? "✓" : "↓"} {((toAmountUSD / fromAmountUSD) * 100 - 100).toFixed(2)}%
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xl text-gray-700 font-semibold">0.0</div>
            )}
          </div>
        </div>

        {/* Route Details */}
        {route && estimate && (
          <div className="mt-4 space-y-0">
            <div className="relative bg-white/[0.02] rounded-2xl border border-white/[0.05] overflow-hidden">
              {/* Route header */}
              <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Route Details</span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {estimatedDuration !== undefined && (
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Est. Time
                    </span>
                    <span className="text-xs text-white/70 font-medium">
                      {estimatedDuration < 60 ? `~${estimatedDuration}s` : `~${Math.ceil(estimatedDuration / 60)} min`}
                    </span>
                  </div>
                )}
                {estimate.exchangeRate && (
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Rate
                    </span>
                    <span className="text-xs text-white/70 font-medium">
                      1 {fromToken?.symbol} ≈ {parseFloat(estimate.exchangeRate).toFixed(4)} {toToken?.symbol}
                    </span>
                  </div>
                )}
                {estimate.aggregatePriceImpact && parseFloat(estimate.aggregatePriceImpact) > 0 && (
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                      Impact
                    </span>
                    <span className={`text-xs font-medium ${
                      parseFloat(estimate.aggregatePriceImpact) > 3 ? "text-red-400" : "text-white/70"
                    }`}>
                      {parseFloat(estimate.aggregatePriceImpact).toFixed(2)}%
                    </span>
                  </div>
                )}
                {estimate.feeCosts && estimate.feeCosts.length > 0 && (
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Fees
                    </span>
                    <span className="text-xs text-white/70 font-medium">
                      ${estimate.feeCosts.reduce((sum, f) => sum + parseFloat(f.amountUSD || "0"), 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3.5 bg-red-500/[0.06] border border-red-500/15 rounded-xl flex items-start gap-2.5">
            <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-red-400/90 leading-snug">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5">
          {step === "tracking" && activeTx ? (
            <TransactionStatus
              txHash={activeTx.hash}
              fromChainId={activeTx.fromChainId}
              toChainId={activeTx.toChainId}
              requestId={activeTx.requestId}
              quoteId={activeTx.quoteId}
              bridgeType={activeTx.bridgeType}
              solanaSignature={activeTx.solanaSignature}
              onComplete={handleTxComplete}
              onDismiss={handleTxDismiss}
            />
          ) : isSolanaSource ? (
            /* Solana source chain buttons */
            !solanaAddress ? (
              <button
                onClick={connectPhantom}
                disabled={solanaConnecting}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:shadow-xl hover:shadow-purple-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                <span className="relative flex items-center justify-center gap-2">
                  {solanaConnecting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 128 128" fill="currentColor">
                        <path d="M108.53 68.58L93.83 83.27a3.59 3.59 0 01-2.54 1.05H21.62a1.8 1.8 0 01-1.27-3.07l14.7-14.69a3.59 3.59 0 012.54-1.05h69.67a1.8 1.8 0 011.27 3.07zm-14.7-26.44a3.59 3.59 0 00-2.54-1.05H21.62a1.8 1.8 0 00-1.27 3.07l14.7 14.69a3.59 3.59 0 002.54 1.05h69.67a1.8 1.8 0 001.27-3.07zm-71.45-1.37h69.67a1.8 1.8 0 001.27-3.07L78.63 23.01a3.59 3.59 0 00-2.54-1.05H6.42a1.8 1.8 0 00-1.27 3.07l14.69 14.69a3.59 3.59 0 002.54 1.05z" />
                      </svg>
                      Connect Phantom Wallet
                    </>
                  )}
                </span>
              </button>
            ) : !isConnected ? (
              <div className="space-y-2">
                <div className="px-3 py-2 bg-purple-500/[0.06] border border-purple-500/15 rounded-xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-xs text-purple-300 font-medium">
                    Phantom: {solanaAddress.slice(0, 4)}...{solanaAddress.slice(-4)}
                  </span>
                </div>
                <button
                  disabled
                  className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-500 to-purple-600 text-white cursor-default shadow-lg shadow-violet-500/20 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                  <span className="relative flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Connect EVM Wallet for Destination
                  </span>
                </button>
              </div>
            ) : !isValidInput ? (
              <div className="space-y-2">
                <div className="px-3 py-2 bg-purple-500/[0.06] border border-purple-500/15 rounded-xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-xs text-purple-300 font-medium">
                    Phantom: {solanaAddress.slice(0, 4)}...{solanaAddress.slice(-4)}
                  </span>
                  <span className="text-[10px] text-gray-600 ml-auto">→</span>
                  <span className="text-xs text-violet-300 font-medium">
                    EVM: {address?.slice(0, 4)}...{address?.slice(-4)}
                  </span>
                </div>
                <button disabled className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-white/[0.04] border border-white/[0.06] text-gray-600 cursor-not-allowed">
                  Enter an amount
                </button>
              </div>
            ) : quoteLoading ? (
              <button disabled className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-violet-500/15 border border-violet-500/20 text-violet-300 cursor-wait">
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Finding best route...
                </span>
              </button>
            ) : !route ? (
              <button disabled className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-white/[0.04] border border-white/[0.06] text-gray-600 cursor-not-allowed">
                {error ? "No route available" : "Enter an amount"}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="px-3 py-2 bg-purple-500/[0.06] border border-purple-500/15 rounded-xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-xs text-purple-300 font-medium">
                    Phantom: {solanaAddress.slice(0, 4)}...{solanaAddress.slice(-4)}
                  </span>
                  <span className="text-[10px] text-gray-600 ml-auto">→</span>
                  <span className="text-xs text-violet-300 font-medium">
                    EVM: {address?.slice(0, 4)}...{address?.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={handleSolanaSwap}
                  disabled={step !== "idle"}
                  className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 relative overflow-hidden group ${
                    step !== "idle"
                      ? "bg-violet-500/30 text-white cursor-wait"
                      : "bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:shadow-xl hover:shadow-purple-500/25 hover:scale-[1.01] active:scale-[0.99]"
                  }`}
                >
                  {step === "idle" && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
                  )}
                  <span className="relative">
                    {step === "fetching-route" ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Finding route...
                      </span>
                    ) : step === "approving" ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Getting deposit address...
                      </span>
                    ) : step === "swapping" ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Confirm in Phantom...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Bridge {fromToken?.symbol} → {toToken?.symbol}
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    )}
                  </span>
                </button>
              </div>
            )
          ) : !isConnected ? (
            <button
              disabled
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-500 to-purple-600 text-white cursor-default shadow-lg shadow-violet-500/20 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
              <span className="relative flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect Wallet to Swap
              </span>
            </button>
          ) : needsChainSwitch ? (
            <button
              onClick={async () => {
                try {
                  await switchChainAsync({ chainId: parseInt(fromChainId) });
                } catch {
                  setError("Failed to switch chain");
                }
              }}
              className="w-full py-3.5 px-4 bg-amber-500/[0.08] text-amber-400 border border-amber-500/20 rounded-xl font-semibold text-sm hover:bg-amber-500/[0.12] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Switch to {SUPPORTED_CHAINS.find((c) => c.chainId === fromChainId)?.name}
            </button>
          ) : !isValidInput ? (
            <button disabled className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-white/[0.04] border border-white/[0.06] text-gray-600 cursor-not-allowed">
              Enter an amount
            </button>
          ) : quoteLoading ? (
            <button disabled className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-violet-500/15 border border-violet-500/20 text-violet-300 cursor-wait">
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Finding best route...
              </span>
            </button>
          ) : !route ? (
            <button disabled className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-white/[0.04] border border-white/[0.06] text-gray-600 cursor-not-allowed">
              {error ? "No route available" : "Enter an amount"}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={step !== "idle"}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 relative overflow-hidden group ${
                step !== "idle"
                  ? "bg-violet-500/30 text-white cursor-wait"
                  : "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-xl hover:shadow-violet-500/25 hover:scale-[1.01] active:scale-[0.99]"
              }`}
            >
              {step === "idle" && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
              )}
              <span className="relative">
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
                  <span className="flex items-center justify-center gap-2">
                    Swap {fromToken?.symbol} → {toToken?.symbol}
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                )}
              </span>
            </button>
          )}
        </div>

        {/* Powered by */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.04]" />
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">
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
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.04]" />
        </div>
        </div>
      </div>
    </div>
  );
}
