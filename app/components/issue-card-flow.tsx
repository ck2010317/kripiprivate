"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  CreditCard, 
  Loader2, 
  Check, 
  Copy, 
  ArrowLeft,
  Eye,
  EyeOff,
  LogOut,
  Wallet,
  Clock,
  ExternalLink,
  Shield
} from "lucide-react"
import { useAuth } from "@/app/context/auth-context"
import { CardDetailsPage } from "@/app/components/card-details-page"

interface IssuedCard {
  id: string
  cardNumber: string
  expiryDate: string
  cvv: string
  nameOnCard: string
  balance: number
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

interface IssueCardFlowProps {
  onBack: () => void
  onSuccess: () => void
}

// Fixed card issuance fee
const CARD_ISSUANCE_FEE = 30 // $30 card issuance fee
const SERVICE_FEE_PERCENT = 0.02 // 2%
const SERVICE_FEE_FLAT = 1 // $1

// Token gate requirements
const REQUIRED_TOKEN_AMOUNT = 1000

export function IssueCardFlow({ onBack, onSuccess }: IssueCardFlowProps) {
  const { user, logout } = useAuth()
  const [step, setStep] = useState<"form" | "payment" | "verifying" | "processing" | "success">("form")
  const [topupAmount, setTopupAmount] = useState("10") // Minimum $10 (KripiCard minimum)
  const [nameOnCard, setNameOnCard] = useState(user?.name || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [issuedCard, setIssuedCard] = useState<IssuedCard | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [showCVV, setShowCVV] = useState(false)
  const [payment, setPayment] = useState<PaymentRequest | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // Countdown timer for payment expiry
  useEffect(() => {
    if (!payment?.expiresAt) return


    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(payment.expiresAt).getTime()
      const diff = Math.max(0, Math.floor((expiry - now) / 1000))
      setTimeLeft(diff)

      if (diff === 0) {
        setError("Payment has expired. Please create a new payment request.")
        setStep("form")
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

  // Step 1: Create payment request
  const handleCreatePayment = async () => {
    const topup = parseFloat(topupAmount)
    
    if (!nameOnCard.trim()) {
      setError("Cardholder name is required")
      return
    }

    if (isNaN(topup) || topup < 10) {
      setError("Topup amount must be at least $10")
      return
    }

    // Calculate fees
    const serviceFee = (topup * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT
    const totalAmount = topup + CARD_ISSUANCE_FEE + serviceFee
    
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: totalAmount,
          topupAmount: topup,
          cardFee: CARD_ISSUANCE_FEE,
          serviceFee: serviceFee,
          nameOnCard: nameOnCard.trim(),
          cardType: "issue",
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

  // Step 2: Verify payment and issue card
  // Auto-verify payment by checking blockchain
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

      // Payment verified! Now issue the card
      setStep("processing")

      // Call the verification endpoint to issue the card
      const issueResponse = await fetch(`/api/payments/${payment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txSignature: data.txSignature }),
      })

      const issueData = await issueResponse.json()

      if (!issueResponse.ok) {
        console.error("[IssueCard] Error response:", issueData)
        throw new Error(issueData.error || issueData.details || "Failed to issue card")
      }

      if (!issueData.success) {
        console.error("[IssueCard] Response not successful:", issueData)
        throw new Error(issueData.error || issueData.message || "Card creation failed")
      }

      // Short delay for UX then show success
      setTimeout(() => {
        if (issueData.card) {
          setIssuedCard(issueData.card)
          setStep("success")
        } else {
          setError("Card was created but details could not be retrieved. Check your dashboard.")
          setStep("form")
        }
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete payment")
      setStep("payment")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleLogout = async () => {
    await logout()
    onBack()
  }

  const formatCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, "")
    return cleaned.match(/.{1,4}/g)?.join(" ") || number
  }

  // Processing state
  if (step === "processing" || step === "verifying") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 p-8 text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-6 animate-spin text-primary" />
          <h2 className="text-2xl font-bold mb-2">
            {step === "verifying" ? "Verifying Payment" : "Issuing Your Card"}
          </h2>
          <p className="text-muted-foreground">
            {step === "verifying" 
              ? "Confirming your Solana transaction..." 
              : "Creating your virtual card..."
            }
          </p>
        </Card>
      </div>
    )
  }

  // Payment step - show wallet address and wait for payment
  if (step === "payment" && payment) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => {
                setStep("form")
                setPayment(null)
              }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl font-bold">Complete Payment</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-amber-500">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timeLeft)}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-12">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Payment Summary */}
          <Card className="mb-6 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Payment Details
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Total (Card + Fees)</span>
                <span className="font-semibold">${payment.amountUsd.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">SOL Price</span>
                <span>${payment.solPrice.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Amount to Pay</span>
                <span className="font-bold text-xl text-primary">{payment.amountSol.toFixed(6)} SOL</span>
              </div>
            </div>
          </Card>

          {/* Payment Wallet */}
          <Card className="mb-6 p-6 bg-gradient-to-br from-primary/10 to-secondary/5">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Send SOL to this address:</h3>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border">
              <code className="flex-1 text-sm font-mono break-all">{payment.paymentWallet}</code>
              <button
                onClick={() => copyToClipboard(payment.paymentWallet, "wallet")}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
              >
                {copied === "wallet" ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ Send exactly <span className="font-semibold text-primary">{payment.amountSol.toFixed(6)} SOL</span> on Solana Mainnet
            </p>
          </Card>

          {/* Auto-Verify Info */}
          <Card className="mb-6 p-6 bg-green-500/5 border border-green-500/30">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Automatic Verification
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Once you send the payment to the wallet address above, click the button below. We'll automatically check the Solana blockchain and verify your payment.
            </p>
            <div className="flex gap-3">
              <a
                href={`https://explorer.solana.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Open Solana Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </Card>

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
            <Card className="mt-6 p-4 bg-blue-500/5 border border-blue-500/30">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <div>
                  <p className="font-medium">Checking Solana blockchain...</p>
                  <p className="text-sm text-muted-foreground">This may take a few seconds</p>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    )
  }

  // Success state - redirect to card details page
  if (step === "success" && issuedCard) {
    return (
      <CardDetailsPage
        card={{
          id: issuedCard.id,
          cardNumber: issuedCard.cardNumber,
          expiryDate: issuedCard.expiryDate,
          cvv: issuedCard.cvv,
          nameOnCard: issuedCard.nameOnCard,
          balance: issuedCard.balance,
          status: "ACTIVE",
        }}
        onBack={() => onSuccess()}
        onIssueAnother={() => {
          setStep("form")
          setIssuedCard(null)
          setPayment(null)
        }}
      />
    )
  }

  // Form step - initial card configuration
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">Issue New Card</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Card Preview */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Card Preview</h2>
            <Card className="aspect-video p-6 bg-gradient-to-br from-primary/20 via-card to-secondary/10 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">CARDHOLDER</p>
                  <p className="font-semibold">{nameOnCard || "YOUR NAME"}</p>
                </div>
                <CreditCard className="w-8 h-8 text-primary/60" />
              </div>
              <div>
                <p className="font-mono text-sm tracking-widest text-muted-foreground mb-2">
                  4938 •••• •••• ••••
                </p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground">EXPIRES</p>
                    <p className="font-mono text-sm">MM/YY</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">BALANCE</p>
                    <p className="font-semibold text-primary">${parseFloat(topupAmount || "10").toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Info */}
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Wallet className="w-4 h-4" />
                Payment Method
              </div>
              <p className="font-semibold">Pay with Solana (SOL)</p>
              <p className="text-xs text-muted-foreground mt-1">
                You&apos;ll be shown a wallet address to send payment after clicking continue.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Cardholder Name</label>
              <input
                type="text"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value.toUpperCase())}
                placeholder="JOHN DOE"
                className="w-full px-4 py-3 rounded-lg bg-input border border-border/50 focus:border-primary outline-none uppercase"
              />
            </div>

            {/* Topup Amount - User Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Topup Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-muted-foreground">$</span>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="10"
                  min="10"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-lg bg-input border border-border/50 focus:border-primary outline-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum $10 required for initial topup</p>
            </div>

            {/* Card Issuance Fee - Fixed */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/30">
              <p className="text-xs text-muted-foreground font-semibold mb-2">CARD ISSUANCE FEE</p>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-primary">${CARD_ISSUANCE_FEE}</p>
                <p className="text-xs text-muted-foreground">Fixed fee</p>
              </div>
            </div>

            {/* Service Fee - Dynamic */}
            <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/30">
              <p className="text-xs text-muted-foreground font-semibold mb-2">SERVICE FEE (2% + $1)</p>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-secondary">${((parseFloat(topupAmount || "10") * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Variable</p>
              </div>
            </div>

            {/* Total Amount */}
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
              <p className="text-xs text-muted-foreground font-semibold mb-2">TOTAL AMOUNT TO PAY</p>
              <div className="flex items-baseline justify-between">
                <p className="text-4xl font-bold text-accent">${(parseFloat(topupAmount || "10") + CARD_ISSUANCE_FEE + ((parseFloat(topupAmount || "10") * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT)).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Topup + Fees</p>
              </div>
            </div>

            <Button
              onClick={handleCreatePayment}
              disabled={loading}
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
                  Continue to Payment - ${(parseFloat(topupAmount || "10") + CARD_ISSUANCE_FEE + ((parseFloat(topupAmount || "10") * SERVICE_FEE_PERCENT) + SERVICE_FEE_FLAT)).toFixed(2)}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              ⏳ Please allow up to 1 hour for your card to become active after issuance.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
