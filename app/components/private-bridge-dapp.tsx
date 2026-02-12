"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowRight,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  LogOut,
  Wallet as WalletIcon,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const SQUID_API_URL = "https://v2.api.squidrouter.com/v2"
const INTEGRATOR_ID = "privatebridge-c0f6657e-1f07-4dfe-a743-7f0721e7cf57"

interface RouteData {
  route: {
    id: string
    fromChain: string
    toChain: string
    fromAmount: string
    toAmount: string
    exchangeRate: string
    priceImpact: string
    slippage: string
    minReceived: string
    transactionRequest?: {
      target: string
      data: string
      value: string
      gasLimit: string
      gasPrice: string
    }
    feeCosts?: Array<{
      name: string
      percentage: string
      amount: string
    }>
  }
}

interface WalletInfo {
  address: string
  chainId: number
  balance: string
}

export function PrivateBridge() {
  // Wallet state
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)

  // Bridge state
  const [fromChain, setFromChain] = useState("1") // Ethereum
  const [toChain, setToChain] = useState("8453") // Base
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState<RouteData | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoteTimestamp, setQuoteTimestamp] = useState<number>(0)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  const chains = [
    { id: "1", name: "Ethereum", symbol: "ETH" },
    { id: "137", name: "Polygon", symbol: "MATIC" },
    { id: "42161", name: "Arbitrum", symbol: "ETH" },
    { id: "10", name: "Optimism", symbol: "ETH" },
    { id: "8453", name: "Base", symbol: "ETH" },
    { id: "56", name: "BNB Chain", symbol: "BNB" },
  ]

  // Connect wallet
  const connectWallet = useCallback(async () => {
    setConnecting(true)
    setWalletError(null)

    try {
      // Check if window.ethereum exists
      if (!window.ethereum) {
        throw new Error("MetaMask not installed. Please install MetaMask.")
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from wallet")
      }

      // Get chain ID
      const chainIdHex = await window.ethereum.request({
        method: "eth_chainId",
      })
      const chainId = parseInt(chainIdHex, 16)

      // Get balance
      const balanceWei = await window.ethereum.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      })
      const balance = (parseInt(balanceWei, 16) / 1e18).toFixed(4)

      setWallet({
        address: accounts[0],
        chainId: chainId,
        balance: balance,
      })

      setError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to connect wallet"
      setWalletError(errorMsg)
      console.error("Wallet connection error:", err)
    } finally {
      setConnecting(false)
    }
  }, [])

  // Disconnect wallet
  const disconnectWallet = () => {
    setWallet(null)
    setQuote(null)
    setFromAmount("")
    setToAmount("")
    setWalletError(null)
  }

  // Get quote from Squid API
  const getQuote = useCallback(async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (fromChain === toChain) {
      setError("Please select different chains")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const amountInWei = (parseFloat(fromAmount) * 1e18).toString()

      const params = {
        fromAddress: wallet?.address || "0x0000000000000000000000000000000000000000",
        fromChain: fromChain,
        toChain: toChain,
        fromToken: "0x0000000000000000000000000000000000000000", // Native token
        toToken: "0x0000000000000000000000000000000000000000", // Native token
        fromAmount: amountInWei,
        toAddress: wallet?.address || "0x0000000000000000000000000000000000000000",
        slippage: 1.5,
        slippageConfig: {
          autoMode: 1,
        },
      }

      console.log("Requesting quote with params:", params)

      const response = await fetch(`${SQUID_API_URL}/route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-integrator-id": INTEGRATOR_ID,
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `API Error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      console.log("Quote received:", data)

      setQuote(data)
      setToAmount((parseFloat(data.route.toAmount) / 1e18).toFixed(6))
      setQuoteTimestamp(Date.now())
      setError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get quote"
      setError(errorMsg)
      console.error("Quote error:", err)
    } finally {
      setLoading(false)
    }
  }, [fromAmount, fromChain, toChain, wallet?.address])

  // Auto-fetch quote when amount or chains change
  useEffect(() => {
    if (!autoRefreshEnabled || !wallet) return

    const timer = setTimeout(() => {
      if (fromAmount && parseFloat(fromAmount) > 0) {
        getQuote()
      }
    }, 1000) // Wait 1 second after user stops typing

    return () => clearTimeout(timer)
  }, [fromAmount, fromChain, toChain, autoRefreshEnabled, wallet, getQuote])

  // Execute swap
  const executeSwap = async () => {
    if (!wallet) {
      setError("Please connect wallet first")
      return
    }

    if (!quote) {
      setError("Please get a quote first")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const txRequest = quote.route.transactionRequest

      if (!txRequest) {
        throw new Error("No transaction request in quote")
      }

      // Send transaction
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet.address,
            to: txRequest.target,
            data: txRequest.data,
            value: txRequest.value,
            gas: txRequest.gasLimit,
            gasPrice: txRequest.gasPrice,
          },
        ],
      })

      alert(`Transaction sent! Hash: ${txHash}`)
      console.log("Transaction hash:", txHash)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to execute swap"
      setError(errorMsg)
      console.error("Swap error:", err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const swapChains = () => {
    setFromChain(toChain)
    setToChain(fromChain)
    setQuote(null)
    setToAmount("")
  }

  const getChainName = (chainId: string) => {
    return chains.find((c) => c.id === chainId)?.name || `Chain ${chainId}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/20 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">PrivateBridge</h1>
          <p className="text-lg text-muted-foreground">
            Cross-chain bridging powered by Squid Router V2
          </p>
        </div>

        {/* Wallet Connection */}
        {!wallet ? (
          <Card className="p-6 bg-card/50 backdrop-blur border border-primary/30 mb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <WalletIcon className="w-5 h-5" />
                Connect Your Wallet
              </div>
              <p className="text-sm text-muted-foreground">
                You need to connect your wallet to bridge assets across chains
              </p>

              {walletError && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    {walletError}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={connectWallet}
                disabled={connecting}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-xl text-base py-6"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <WalletIcon className="w-4 h-4 mr-2" />
                    Connect MetaMask
                  </>
                )}
              </Button>

              <div className="text-xs text-muted-foreground bg-background/50 p-3 rounded border border-border">
                <p className="font-semibold mb-2">Requirements:</p>
                <ul className="space-y-1">
                  <li>✓ MetaMask or compatible Web3 wallet</li>
                  <li>✓ Sufficient funds for bridging</li>
                  <li>✓ Gas fees for both chains</li>
                </ul>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Wallet Info */}
            <Card className="p-4 bg-green-500/10 border border-green-500/30 mb-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Connected Wallet</p>
                  <p className="font-mono text-sm">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Balance: {wallet.balance} ETH
                  </p>
                </div>
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </Card>

            {/* Bridge Card */}
            <Card className="p-6 bg-card/50 backdrop-blur border border-primary/30 mb-6">
              <div className="space-y-6">
                {/* From Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-base">From</Label>
                    <span className="text-xs text-muted-foreground">
                      {getChainName(fromChain)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      className="bg-background/50 border border-border text-lg"
                      step="0.0001"
                      min="0"
                    />
                    <select
                      value={fromChain}
                      onChange={(e) => {
                        setFromChain(e.target.value)
                        setQuote(null)
                      }}
                      className="px-4 py-2 bg-background border border-border rounded-md text-foreground font-medium min-w-[140px]"
                    >
                      {chains.map((chain) => (
                        <option key={chain.id} value={chain.id}>
                          {chain.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={swapChains}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </Button>
                </div>

                {/* To Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-base">To</Label>
                    <span className="text-xs text-muted-foreground">
                      {getChainName(toChain)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={toAmount}
                      readOnly
                      className="bg-background/50 border border-border text-lg opacity-70"
                    />
                    <select
                      value={toChain}
                      onChange={(e) => {
                        setToChain(e.target.value)
                        setQuote(null)
                      }}
                      className="px-4 py-2 bg-background border border-border rounded-md text-foreground font-medium min-w-[140px]"
                    >
                      {chains.map((chain) => (
                        <option key={chain.id} value={chain.id}>
                          {chain.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto Refresh Toggle */}
                <div className="flex items-center gap-2 p-3 bg-background/50 rounded border border-border">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={autoRefreshEnabled}
                    onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="autoRefresh" className="text-sm cursor-pointer">
                    Auto-fetch quotes
                  </label>
                </div>

                {/* Error Alert */}
                {error && (
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Quote Info */}
                {quote && (
                  <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h4 className="font-semibold text-sm">Quote Details</h4>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          Exchange Rate
                        </p>
                        <p className="font-mono font-semibold">
                          {quote.route.exchangeRate}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          Price Impact
                        </p>
                        <p className="font-mono font-semibold text-yellow-400">
                          {quote.route.priceImpact}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          Min Received
                        </p>
                        <p className="font-mono font-semibold">
                          {(parseFloat(quote.route.minReceived) / 1e18).toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          Slippage
                        </p>
                        <p className="font-mono font-semibold">
                          {quote.route.slippage}%
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Quote updated {new Date(quoteTimestamp).toLocaleTimeString()}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={getQuote}
                    disabled={loading || !fromAmount || fromChain === toChain}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary hover:shadow-xl"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Getting Quote...
                      </>
                    ) : (
                      <>
                        Get Quote
                        <RefreshCw className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={executeSwap}
                    disabled={!quote || loading || !wallet}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-xl"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Bridge Assets
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Squid Info Card */}
        <Card className="p-4 bg-card/50 backdrop-blur border border-primary/30">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Squid Integration Details</h4>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-background/50 rounded border border-border">
                <span className="text-muted-foreground">API:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono">{SQUID_API_URL}</code>
                  <button
                    onClick={() => copyToClipboard(SQUID_API_URL)}
                    className="p-1 hover:bg-primary/10 rounded transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-background/50 rounded border border-border">
                <span className="text-muted-foreground">Integrator ID:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono truncate">{INTEGRATOR_ID}</code>
                  <button
                    onClick={() => copyToClipboard(INTEGRATOR_ID)}
                    className="p-1 hover:bg-primary/10 rounded transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <a
                href="https://docs.squidrouter.com/quick-start"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-background/50 rounded border border-border hover:border-primary/50 transition-colors"
              >
                <span className="text-muted-foreground">Documentation</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Card>

        {/* Features */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="p-4 bg-card/50 backdrop-blur border border-border">
            <h5 className="font-semibold text-sm mb-2">🔐 Secure</h5>
            <p className="text-xs text-muted-foreground">
              Audited Squid protocol with multi-chain security
            </p>
          </Card>
          <Card className="p-4 bg-card/50 backdrop-blur border border-border">
            <h5 className="font-semibold text-sm mb-2">⚡ Real-time</h5>
            <p className="text-xs text-muted-foreground">
              Auto-fetching quotes as you type with live updates
            </p>
          </Card>
          <Card className="p-4 bg-card/50 backdrop-blur border border-border">
            <h5 className="font-semibold text-sm mb-2">💰 Transparent</h5>
            <p className="text-xs text-muted-foreground">
              Clear fee breakdown with no hidden charges
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Add window.ethereum type declaration
declare global {
  interface Window {
    ethereum?: any
  }
}
