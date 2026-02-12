"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowRight, 
  Loader2, 
  Copy, 
  Check,
  Bridge as BridgeIcon,
  AlertCircle,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const SQUID_API_URL = "https://v2.api.squidrouter.com"
const INTEGRATOR_ID = "privatebridge-c0f6657e-1f07-4dfe-a743-7f0721e7cf57"

interface BridgeRoute {
  route: {
    fromAmount: string
    fromAmountUSD: string
    toAmount: string
    toAmountUSD: string
    fromChain: string
    toChain: string
    fromToken: string
    toToken: string
    exchangeRate: string
    priceImpact: string
    slippage: string
    feeDetails: {
      bridgeFee: string
      exchangeFee: string
    }
  }
}

export function PrivateBridge() {
  const [step, setStep] = useState<"select" | "bridge">("select")
  const [fromChain, setFromChain] = useState("Ethereum")
  const [toChain, setToChain] = useState("Solana")
  const [fromAmount, setFromAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState<BridgeRoute | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supportedChains = [
    { name: "Ethereum", id: "Ethereum", logo: "🔵" },
    { name: "Solana", id: "Solana", logo: "🟣" },
    { name: "Polygon", id: "Polygon", logo: "🟣" },
    { name: "Arbitrum", id: "Arbitrum", logo: "🔵" },
    { name: "Optimism", id: "Optimism", logo: "🔴" },
    { name: "Base", id: "Base", logo: "🔵" },
  ]

  const getQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${SQUID_API_URL}/route?fromChain=${fromChain}&toChain=${toChain}&fromToken=native&toToken=native&fromAmount=${parseFloat(fromAmount) * 1e18}&slippage=1.5&integratorId=${INTEGRATOR_ID}`,
        { method: "GET" }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch quote")
      }

      const data = await response.json()
      setQuote(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get quote")
      console.error("Bridge error:", err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (step === "select") {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur border border-primary/30">
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <BridgeIcon className="w-6 h-6 text-primary" />
              PrivateBridge
            </h3>
            <p className="text-sm text-muted-foreground">
              Bridge assets across multiple blockchains with Squid protocol
            </p>
          </div>

          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription>
              Powered by Squid Router - Secure cross-chain bridging
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>From Chain</Label>
              <select
                value={fromChain}
                onChange={(e) => setFromChain(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
              >
                {supportedChains.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.logo} {chain.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <Label>To Chain</Label>
              <select
                value={toChain}
                onChange={(e) => setToChain(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
              >
                {supportedChains
                  .filter((c) => c.id !== fromChain)
                  .map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.logo} {chain.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount to bridge"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="bg-background border border-input"
            />
          </div>

          {error && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={getQuote}
            disabled={loading || !fromAmount}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-xl"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Getting Quote...
              </>
            ) : (
              <>
                Get Quote
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-card/50 backdrop-blur border border-primary/30">
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <BridgeIcon className="w-6 h-6 text-primary" />
            Bridge Quote
          </h3>
          <p className="text-sm text-muted-foreground">
            Review your cross-chain bridge details
          </p>
        </div>

        {quote && (
          <>
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-background/50 rounded-lg border border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">From</p>
                <p className="text-lg font-semibold">
                  {quote.route.fromAmount} {quote.route.fromChain}
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ ${quote.route.fromAmountUSD}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">To</p>
                <p className="text-lg font-semibold">
                  {quote.route.toAmount} {quote.route.toChain}
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ ${quote.route.toAmountUSD}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 p-4 bg-background/50 rounded-lg border border-border text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Exchange Rate</p>
                <p className="font-semibold">{quote.route.exchangeRate}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Price Impact</p>
                <p className="font-semibold text-yellow-500">
                  {quote.route.priceImpact}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Slippage</p>
                <p className="font-semibold">{quote.route.slippage}%</p>
              </div>
            </div>

            <div className="p-4 bg-background/50 rounded-lg border border-border text-sm space-y-2">
              <p className="font-semibold mb-3">Fee Details</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bridge Fee:</span>
                <span>{quote.route.feeDetails.bridgeFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange Fee:</span>
                <span>{quote.route.feeDetails.exchangeFee}</span>
              </div>
            </div>

            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Squid Integrator ID:</p>
              <div className="flex items-center gap-2 bg-background p-2 rounded border border-border">
                <code className="text-xs flex-1 break-all font-mono">
                  {INTEGRATOR_ID}
                </code>
                <button
                  onClick={() => copyToClipboard(INTEGRATOR_ID)}
                  className="p-2 hover:bg-primary/10 rounded transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => {
              setStep("select")
              setQuote(null)
              setError(null)
            }}
            variant="outline"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={() => {
              // Redirect to Squid bridge with parameters
              window.open(
                `https://widget.squidrouter.com?sourceChain=${fromChain}&destinationChain=${toChain}&defaultTokens=${quote?.route.fromToken || "native"},${quote?.route.toToken || "native"}&integratorId=${INTEGRATOR_ID}`,
                "_blank"
              )
            }}
            className="flex-1 bg-gradient-to-r from-primary to-secondary"
          >
            Execute Bridge
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
