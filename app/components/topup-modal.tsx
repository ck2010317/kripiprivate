"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Wallet, Clock, X, Check, Copy } from "lucide-react"

const TOPUP_FEE_PERCENT = 0.03 // 3%
const TOPUP_FEE_FLAT = 1 // $1
const MIN_TOPUP = 10 // $10 minimum - KripiCard requirement

interface TopupModalProps {
  cardId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentId: string) => void
}

interface PaymentRequest {
  id: string
  amountUsd: number
  amountSol: number
  solPrice: number
  paymentWallet: string
  expiresAt: string
  status: string
}

export function TopupModal({ cardId, isOpen, onClose, onSuccess }: TopupModalProps) {
  const [step, setStep] = useState<"form" | "payment" | "verifying">("form")
  const [amount, setAmount] = useState("50")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [payment, setPayment] = useState<PaymentRequest | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [copied, setCopied] = useState<string | null>(null)

  // Calculate fee
  const topupAmount = parseFloat(amount) || 0
  const fee = topupAmount > 0 ? topupAmount * TOPUP_FEE_PERCENT + TOPUP_FEE_FLAT : 0
  const totalAmount = topupAmount + fee

  // Countdown timer for payment expiry
  useEffect(() => {
    if (!payment?.expiresAt) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const expiryTime = new Date(payment.expiresAt).getTime()
      const secondsLeft = Math.max(0, Math.floor((expiryTime - now) / 1000))
      setTimeLeft(secondsLeft)

      if (secondsLeft === 0) {
        setError("Payment expired. Please create a new payment request.")
        setPayment(null)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [payment?.expiresAt])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  // Create topup payment request
  const handleCreatePayment = async () => {
    const inputAmount = parseFloat(amount)

    if (isNaN(inputAmount) || inputAmount < MIN_TOPUP) {
      setError(`Minimum top-up amount is $${MIN_TOPUP}`)
      return
    }

    if (inputAmount > 10000) {
      setError("Amount cannot exceed $10,000")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: totalAmount, // Total including fee
          topupAmount: inputAmount, // Actual topup amount
          topupFee: fee, // Fee charged
          cardType: "topup",
          targetCardId: cardId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment")
      }

      setPayment(data.payment)
      setStep("payment")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment")
    } finally {
      setLoading(false)
    }
  }

  // Auto-verify topup payment
  const handleAutoVerifyPayment = async () => {
    if (!payment) {
      setError("Payment not found")
      return
    }

    setLoading(true)
    setError("")
    setStep("verifying")

    try {
      // Check for payment automatically
      const response = await fetch(`/api/payments/auto-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.message || "Payment not detected. Please wait a moment and try again.")
        setStep("payment")
        setLoading(false)
        return
      }

      // Payment verified! Now fund the card
      const fundResponse = await fetch(`/api/payments/${payment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txSignature: data.txSignature }),
      })

      const fundData = await fundResponse.json()

      if (!fundResponse.ok) {
        throw new Error(fundData.error || "Failed to fund card")
      }

      // Success!
      onSuccess(payment.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete top-up")
      setStep("payment")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">Add Balance</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Form Step */}
          {step === "form" && (
            <div className="space-y-6">
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
                  <p className="text-sm font-semibold text-destructive">Error</p>
                  <p className="text-sm text-destructive">{error}</p>
                  {error.includes("below") && (
                    <p className="text-xs text-destructive/80 mt-2">
                      💡 KripiCard requires a minimum of $10 per transaction.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Top-up Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min={MIN_TOPUP}
                    max="10000"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50"
                    className="w-full pl-8 pr-4 py-3 rounded-lg bg-input border border-border/50 focus:border-primary outline-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum: ${MIN_TOPUP}
                </p>
              </div>

              {/* Fee Breakdown */}
              {topupAmount > 0 && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Top-up Amount:</span>
                    <span className="font-semibold">${topupAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Fee (3% + $1):
                    </span>
                    <span className="font-semibold">${fee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold">Total Payment:</span>
                    <span className="font-bold text-lg text-primary">
                      ${totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Amounts */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 25, 50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset.toString())}
                      className={`py-2 rounded-lg border text-sm transition-all ${
                        amount === preset.toString()
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreatePayment}
                disabled={loading || topupAmount < MIN_TOPUP}
                className="w-full py-6 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Payment...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 mr-2" />
                    Continue to Payment - ${totalAmount.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Payment Step */}
          {step === "payment" && payment && (
            <div className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Payment Info */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Wallet className="w-4 h-4" />
                  Send Payment
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Send exactly this amount:
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {payment.amountSol.toFixed(6)} SOL
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ ${payment.amountUsd.toFixed(2)} USD
                  </p>
                </div>

                <div className="border-t border-primary/30 pt-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Send to wallet address:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono p-2 rounded bg-muted break-all">
                      {payment.paymentWallet}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(payment.paymentWallet, "wallet")
                      }
                      className="p-2 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
                    >
                      {copied === "wallet" ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Payment expires in: {formatTime(timeLeft)}
              </div>

              {/* Auto-Verify Info */}
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/30">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Automatic Verification
                </h3>
                <p className="text-sm text-muted-foreground">
                  Once you send the payment, click the button below. We'll automatically verify it on the Solana blockchain.
                </p>
              </div>

              {/* Auto-Verify Button */}
              <Button
                onClick={handleAutoVerifyPayment}
                disabled={loading}
                className="w-full py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-600/30 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying Payment...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    I Have Sent the Payment
                  </>
                )}
              </Button>

              {loading && (
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/30">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <div>
                      <p className="font-medium text-sm">Checking Solana blockchain...</p>
                      <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setStep("form")
                  setPayment(null)
                  setError("")
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Amount
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
