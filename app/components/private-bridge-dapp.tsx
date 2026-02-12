"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const SQUID_API_URL = "https://v2.api.squidrouter.com"
const INTEGRATOR_ID = "privatebridge-c0f6657e-1f07-4dfe-a743-7f0721e7cf57"

interface RouteData {
  route: {
    id: string
    routeType: string
    fromChain: string
    toChain: string
    fromToken: {
      address: string
      chainId: number
      decimals: number
      name: string
      symbol: string
    }
    toToken: {
      address: string
      chainId: number
      decimals: number
      name: string
      symbol: string
    }
    fromAmount: string
    toAmount: string
    exchangeRate: string
    priceImpact: string
    slippage: string
    minReceived: string
    feeCosts: Array<{
      name: string
      description: string
      percentage: string
      token: {
        address: string
        chainId: number
        decimals: number
        name: string
        symbol: string
      }
      amount: string
    }>
    gasCosts: Array<{
      type: string
      token: {
        address: string
        chainId: number
        decimals: number
        name: string
        symbol: string
      }
      amount: string
      amountUSD: string
    }>
  }
  transactionRequest?: {
    data: string
    to: string
    from: string
    value: string
    chainId: number
    gasPrice: string
    gasLimit: string
  }
}

interface ChainData {
  chainId: number
  chainName: string
  chainNativeContracts: {
    wrappedNativeToken: string
    multicallContract: string
    usdcContract: string
  }
}

export function PrivateBridge() {
  const [fromChain, setFromChain] = useState("1") // Ethereum
  const [toChain, setToChain] = useState("101") // Solana
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [quoting, setQuoting] = useState(false)
  const [quote, setQuote] = useState<RouteData | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chains, setChains] = useState<ChainData[]>([])

  // Fetch supported chains
  useEffect(() => {
    const fetchChains = async () => {
      try {
        const response = await fetch(`${SQUID_API_URL}/chains`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
        if (response.ok) {
          const data = await response.json()
          setChains(data.chains || [])
        }
      } catch (err) {
        console.error("Failed to fetch chains:", err)
      }
    }
    fetchChains()
  }, [])

  const getChainName = (chainId: string) => {
    const chain = chains.find((c) => c.chainId.toString() === chainId)
    return chain?.chainName || `Chain ${chainId}`
  }

  const getQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    setQuoting(true)
    setError(null)
    setQuote(null)

    try {
      // Convert amount to proper decimal format (accounting for token decimals, usually 18)
      const amountInWei = (parseFloat(fromAmount) * 1e18).toString()

      const params = new URLSearchParams({
        fromChain: fromChain,
        toChain: toChain,
        fromToken: "0x0000000000000000000000000000000000000000", // Native token
        toToken: "0x0000000000000000000000000000000000000000", // Native token
        fromAmount: amountInWei,
        slippage: "1.5",
        integratorId: INTEGRATOR_ID,
        quoteOnly: "true",
      })

      const response = await fetch(`${SQUID_API_URL}/route?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.message || `Failed to get quote (${response.status})`
        )
      }

      const data = await response.json()
      setQuote(data)
      setToAmount(
        (parseFloat(data.route.toAmount) / 1e18).toFixed(6)
      )
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to get quote"
      setError(errorMsg)
      console.error("Bridge error:", err)
    } finally {
      setQuoting(false)
    }
  }

  const executeSwap = async () => {
    if (!quote) return

    setLoading(true)
    setError(null)

    try {
      // For a real implementation, you would:
      // 1. Connect user's wallet
      // 2. Get transaction request from Squid
      // 3. Sign and send transaction
      // 4. Monitor transaction status

      // This opens the Squid widget for now
      window.open(
        `https://widget.squidrouter.com?` +
          `sourceChain=${fromChain}&` +
          `destinationChain=${toChain}&` +
          `defaultTokens=native,native&` +
          `defaultAmount=${parseFloat(fromAmount) * 1e18}&` +
          `integratorId=${INTEGRATOR_ID}&` +
          `comitId=${quote.route.id}`,
        "_blank"
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute swap")
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/20 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">PrivateBridge</h1>
          <p className="text-lg text-muted-foreground">
            Cross-chain bridging powered by Squid Router
          </p>
          <div className="mt-4 inline-block px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
            <span className="text-sm text-green-400">
              ✓ Connected to Squid V2 API
            </span>
          </div>
        </div>

        {/* Main Bridge Card */}
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
                  onChange={(e) => {
                    setFromAmount(e.target.value)
                    setQuote(null)
                  }}
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
                  <option value="1">Ethereum</option>
                  <option value="42161">Arbitrum</option>
                  <option value="137">Polygon</option>
                  <option value="10">Optimism</option>
                  <option value="8453">Base</option>
                  <option value="101">Solana</option>
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
                  <option value="1">Ethereum</option>
                  <option value="42161">Arbitrum</option>
                  <option value="137">Polygon</option>
                  <option value="10">Optimism</option>
                  <option value="8453">Base</option>
                  <option value="101">Solana</option>
                </select>
              </div>
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
                      {(
                        parseFloat(quote.route.minReceived) / 1e18
                      ).toFixed(6)}{" "}
                      {getChainName(toChain).split(" ")[0]}
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

                {/* Fee Details */}
                {quote.route.feeCosts.length > 0 && (
                  <div className="border-t border-primary/20 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Fees
                    </p>
                    {quote.route.feeCosts.map((fee, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs mb-1"
                      >
                        <span>{fee.name}</span>
                        <span>{fee.percentage}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={getQuote}
                disabled={quoting || !fromAmount || fromChain === toChain}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:shadow-xl"
              >
                {quoting ? (
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
                disabled={!quote || loading}
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

        {/* Squid Info Card */}
        <Card className="p-4 bg-card/50 backdrop-blur border border-primary/30">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Squid Integration Details</h4>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-background/50 rounded border border-border">
                <span className="text-muted-foreground">API:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono">
                    {SQUID_API_URL}
                  </code>
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
                  <code className="text-xs font-mono truncate">
                    {INTEGRATOR_ID}
                  </code>
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
            <h5 className="font-semibold text-sm mb-2">🔒 Secure</h5>
            <p className="text-xs text-muted-foreground">
              Audited Squid protocol with multi-chain security
            </p>
          </Card>
          <Card className="p-4 bg-card/50 backdrop-blur border border-border">
            <h5 className="font-semibold text-sm mb-2">⚡ Fast</h5>
            <p className="text-xs text-muted-foreground">
              Real-time quotes and instant settlements
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
