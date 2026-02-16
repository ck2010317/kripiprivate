"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  CreditCard, 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Loader2, 
  RefreshCw,
  Snowflake,
  Play,
  DollarSign,
  LogOut,
  ArrowLeft,
  Wallet,
  Clock,
} from "lucide-react"
import { useAuth } from "@/app/context/auth-context"
import { TelegramConnect } from "@/app/components/telegram-connect"

interface CardData {
  id: string
  kripiCardId: string
  cardNumber: string
  expiryDate: string
  cvv: string
  nameOnCard: string
  balance: number
  status: "ACTIVE" | "FROZEN" | "CANCELLED" | "PENDING"
  createdAt: string
}

interface UserDashboardProps {
  onBack: () => void
  onCreateCard: () => void
  onAdmin?: () => void
  onReferrals?: () => void
  onOpenClaw?: () => void
}

export function UserDashboard({ onBack, onCreateCard, onAdmin, onReferrals, onOpenClaw }: UserDashboardProps) {
  const { user, logout } = useAuth()
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [showCVV, setShowCVV] = useState<Record<string, boolean>>({})
  const [showFullNumber, setShowFullNumber] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [selectedCardForHistory, setSelectedCardForHistory] = useState<CardData | null>(null)

  const fetchCards = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/cards")
      const data = await response.json()
      
      if (data.success) {
        setCards(data.cards)
      }
    } catch (error) {
      console.error("Failed to fetch cards:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const syncCardBalance = useCallback(async (cardId: string) => {
    try {
      setActionLoading(cardId)
      const response = await fetch(`/api/cards/${cardId}`)
      const data = await response.json()
      
      if (data.success) {
        // Update the card with ALL synced data from KripiCard (balance, number, cvv, expiry, status)
        setCards(cards.map(card => 
          card.id === cardId ? { 
            ...card, 
            balance: data.card.balance,
            cardNumber: data.card.cardNumber || card.cardNumber,
            expiryDate: data.card.expiryDate || card.expiryDate,
            cvv: data.card.cvv || card.cvv,
            status: data.card.status || card.status,
          } : card
        ))
      }
    } catch (error) {
      console.error("Failed to sync card:", error)
    } finally {
      setActionLoading(null)
    }
  }, [cards])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  // Auto-refresh cards every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefreshEnabled) return

    const interval = setInterval(() => {
      fetchCards()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [autoRefreshEnabled, fetchCards])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCardAction = async (cardId: string, action: "freeze" | "unfreeze") => {
    setActionLoading(cardId)
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()
      
      if (data.success) {
        setCards(cards.map(card => 
          card.id === cardId ? { ...card, status: data.status } : card
        ))
      }
    } catch (error) {
      console.error("Failed to perform action:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const maskCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, "")
    return `${cleaned.slice(0, 4)} •••• •••• ${cleaned.slice(-4)}`
  }

  const formatCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, "")
    return cleaned.match(/.{1,4}/g)?.join(" ") || number
  }

  const handleLogout = async () => {
    await logout()
    onBack()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold">My Cards</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant={autoRefreshEnabled ? "default" : "outline"}
              size="sm" 
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              title={autoRefreshEnabled ? "Auto-refresh every 30 seconds" : "Auto-refresh disabled"}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {autoRefreshEnabled ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchCards} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={onCreateCard}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Issue New Card
            </Button>
            {onAdmin && (
              <Button variant="outline" size="sm" onClick={onAdmin} className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
                ⚡ Admin
              </Button>
            )}
            {onReferrals && (
              <Button variant="outline" size="sm" onClick={onReferrals} className="border-green-500/50 text-green-400 hover:bg-green-500/10">
                🎁 Referrals
              </Button>
            )}
            {onOpenClaw && (
              <Button variant="outline" size="sm" onClick={onOpenClaw} className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
                🦞 AI Agent
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Telegram Bot Connection */}
        <div className="mb-6">
          <TelegramConnect />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
              <CreditCard className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Cards Yet</h2>
            <p className="text-muted-foreground mb-6">Issue your first virtual card to get started</p>
            <Button 
              onClick={onCreateCard}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Issue Your First Card
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <Card 
                key={card.id}
                className={`relative overflow-hidden border-border/50 transition-all hover:shadow-lg hover:shadow-primary/10 ${
                  card.status === "FROZEN" ? "opacity-75" : ""
                }`}
              >
                {card.status === "PENDING" ? (
                  /* PENDING card — show provisioning state */
                  <>
                    <div className="p-6 bg-gradient-to-br from-orange-500/10 via-card to-yellow-500/5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">CARDHOLDER</p>
                          <p className="font-semibold">{card.nameOnCard}</p>
                        </div>
                        <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </div>
                      <div className="text-center py-6">
                        <Loader2 className="w-10 h-10 text-orange-400 animate-spin mx-auto mb-3" />
                        <p className="text-sm font-medium text-orange-400">Your card is being set up</p>
                        <p className="text-xs text-muted-foreground mt-2">This can take up to 4 hours.<br/>Card details will appear here once ready.</p>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs text-muted-foreground">BALANCE</p>
                          <p className="font-semibold text-primary">${card.balance.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-t border-border/50">
                      <Button
                        onClick={() => fetchCards()}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Check Status
                      </Button>
                    </div>
                  </>
                ) : (
                  /* ACTIVE / FROZEN / CANCELLED card — show full details */
                  <>
                <div className="p-6 bg-gradient-to-br from-primary/20 via-card to-secondary/10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-xs text-muted-foreground">CARDHOLDER</p>
                      <p className="font-semibold">{card.nameOnCard}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {card.status === "FROZEN" && (
                        <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-1">
                          <Snowflake className="w-3 h-3" />
                          Frozen
                        </span>
                      )}
                      <CreditCard className="w-8 h-8 text-primary/60" />
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-lg tracking-wider">
                        {showFullNumber[card.id] 
                          ? formatCardNumber(card.cardNumber)
                          : maskCardNumber(card.cardNumber)
                        }
                      </p>
                      <button
                        onClick={() => setShowFullNumber(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                        className="p-1 rounded hover:bg-muted/50"
                      >
                        {showFullNumber[card.id] ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(card.cardNumber, `number-${card.id}`)}
                        className="p-1 rounded hover:bg-muted/50"
                      >
                        {copied === `number-${card.id}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expiry & CVV */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-muted-foreground">EXPIRES</p>
                      <p className="font-mono">{card.expiryDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CVV</p>
                      <div className="flex items-center gap-1">
                        <p className="font-mono">
                          {showCVV[card.id] ? card.cvv : "•••"}
                        </p>
                        <button
                          onClick={() => setShowCVV(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                          className="p-1 rounded hover:bg-muted/50"
                        >
                          {showCVV[card.id] ? (
                            <EyeOff className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <Eye className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">BALANCE</p>
                      <p className="font-semibold text-primary">${card.balance.toFixed(2)}</p>
                    </div>
                  </div>
                </div>


                {/* Card Actions */}
                <div className="p-4 border-t border-border/50 grid grid-cols-3 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => syncCardBalance(card.id)}
                    disabled={actionLoading === card.id}
                    title="Sync balance from KripiCard"
                  >
                    {actionLoading === card.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCardForHistory(card)}
                    title="View transaction history"
                  >
                    <CreditCard className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCardAction(card.id, card.status === "FROZEN" ? "unfreeze" : "freeze")}
                    disabled={actionLoading === card.id}
                  >
                    {actionLoading === card.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : card.status === "FROZEN" ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Snowflake className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                {/* Fund Button - Full Width */}
                <div className="p-4 border-t border-border/50">
                  <Button
                    onClick={() => setSelectedCard(card)}
                    className="w-full bg-gradient-to-r from-primary to-secondary"
                    size="sm"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Fund Card
                  </Button>
                </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Fund Modal */}
      {selectedCard && (
        <FundCardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onSuccess={() => {
            setSelectedCard(null)
            fetchCards()
          }}
        />
      )}

      {/* Transaction History Modal */}
      {selectedCardForHistory && (
        <TransactionHistoryModal
          card={selectedCardForHistory}
          onClose={() => setSelectedCardForHistory(null)}
        />
      )}
    </div>
  )
}

// Fund Card Modal
function FundCardModal({ 
  card, 
  onClose, 
  onSuccess 
}: { 
  card: CardData
  onClose: () => void
  onSuccess: () => void 
}) {
  const [amount, setAmount] = useState("10")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [payment, setPayment] = useState<{ id: string; amountUsd: number; amountSol: number; solPrice: number; paymentWallet: string; expiresAt: string } | null>(null)
  const [step, setStep] = useState<"input" | "payment" | "verifying" | "success">("input")
  const [copied, setCopied] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [autoVerifying, setAutoVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Fee constants - IMPORTANT: These match the card issuance fees
  const CARD_ISSUANCE_FEE = 30.0 // Fixed card issuance fee (when creating new card)
  const SERVICE_FEE_PERCENT = 0.03 // 3%
  const SERVICE_FEE_FLAT = 1.0 // $1 flat

  // Calculate for top-up (only service fee, no card issuance fee)
  const topupAmount = parseFloat(amount) || 0
  const serviceFee = topupAmount > 0 ? topupAmount * SERVICE_FEE_PERCENT + SERVICE_FEE_FLAT : 0
  const totalToCharge = topupAmount + serviceFee
  const finalBalance = card.balance + topupAmount // Balance after topup (before fees)

  // Countdown timer
  useEffect(() => {
    if (!payment?.expiresAt || step !== "payment") return

    const updateTimer = () => {
      const now = new Date().getTime()
      const expiry = new Date(payment.expiresAt).getTime()
      const diff = Math.max(0, Math.floor((expiry - now) / 1000))
      setTimeLeft(diff)

      if (diff === 0) {
        setVerifyError("Payment has expired. Please create a new payment request.")
        setStep("input")
        setPayment(null)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [payment?.expiresAt, step])

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

  const handleAutoVerifyPayment = async () => {
    if (!payment) {
      setVerifyError("Payment not found")
      return
    }

    setAutoVerifying(true)
    setVerifyError("")
    setStep("verifying")

    try {
      // Check for payment automatically
      const response = await fetch(`/api/payments/auto-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      })

      const data = await response.json()
      console.log("[Fund] Auto-verify response:", data)

      if (!data.success) {
        setVerifyError(data.message || "Payment not detected. Please wait a moment and try again.")
        setStep("payment")
        setAutoVerifying(false)
        return
      }

      // Payment verified! Now process the topup
      const issueResponse = await fetch(`/api/payments/${payment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txSignature: data.txSignature }),
      })

      const issueData = await issueResponse.json()
      console.log("[Fund] Verification response:", issueData, "Status:", issueResponse.status)

      if (!issueResponse.ok) {
        console.error("[Fund] Verification failed:", issueData)
        throw new Error(issueData.error || "Failed to process fund")
      }

      if (!issueData.success) {
        throw new Error(issueData.message || "Failed to process fund")
      }

      // Success! Show success message then close
      setSuccessMessage(`Card funded successfully! New balance: $${issueData.newBalance?.toFixed(2) || (card.balance + parseFloat(amount)).toFixed(2)}`)
      setStep("success")
      
      // Close modal and refresh after 2 seconds
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err) {
      console.error("[Fund] Error:", err)
      setVerifyError(err instanceof Error ? err.message : "Failed to complete payment")
      setStep("payment")
    } finally {
      setAutoVerifying(false)
    }
  }

  const handleFund = async () => {
    const fundAmount = parseFloat(amount)
    if (isNaN(fundAmount) || fundAmount < 10) {
      setError("Amount must be at least $10 (KripiCard minimum)")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Step 1: Calculate fees and get payment request
      const response = await fetch(`/api/cards/${card.id}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: fundAmount }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || "Failed to process fund request")
        setLoading(false)
        return
      }

      // Step 2: Create payment request for Solana transaction
      const paymentResponse = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: data.fees.totalToCharge,
          topupAmount: fundAmount,
          cardFee: 0, // No card issuance fee for topup
          serviceFee: data.fees.serviceFee,
          nameOnCard: card.nameOnCard,
          cardType: "fund", // Mark as fund, not issue
          cardId: card.id, // Include card ID for fund operation
        }),
      })

      const paymentData = await paymentResponse.json()

      if (!paymentData.success || !paymentData.payment?.id) {
        setError("Failed to create payment request")
        setLoading(false)
        return
      }

      // Step 3: Show payment screen
      setPayment(paymentData.payment)
      setStep("payment")
    } catch (error) {
      console.error("[Fund Error]:", error)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === "input" ? onClose : undefined} />
      
      <Card className="relative z-10 w-full max-w-lg bg-card border-border/50 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <h3 className="text-2xl font-bold">Fund Card</h3>
          <p className="text-muted-foreground mt-1">
            Current balance: <span className="text-primary font-semibold">${card.balance.toFixed(2)}</span>
          </p>
        </div>

        {/* Error */}
        {(error || verifyError) && (
          <div className="mx-6 mt-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">{error || verifyError}</p>
          </div>
        )}

        {/* Content - Input Step */}
        {step === "input" && (
          <div className="p-6 space-y-6">
            {/* Amount Input */}
            <div>
              <label className="text-sm font-medium block mb-3">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50"
                  className="w-full pl-8 pr-16 py-3 rounded-lg bg-input border border-primary/30 focus:border-primary outline-none text-lg font-semibold"
                />
                <button 
                  onClick={() => setAmount("50")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  MAX
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Minimum $10 required for top-up</p>
            </div>

            {/* Fee Breakdown - Styled like the demo */}
            <div className="space-y-3">
              {/* Top-up Amount */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/30">
                <p className="text-xs text-muted-foreground font-semibold mb-2">TOP-UP AMOUNT</p>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-primary">${topupAmount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Funds added to card</p>
                </div>
              </div>

              {/* Fixed Fee */}
              <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/30">
                <p className="text-xs text-muted-foreground font-semibold mb-2">SERVICE FEE (3% + $1)</p>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-secondary">${serviceFee.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Variable</p>
                </div>
              </div>

              {/* Total Amount */}
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                <p className="text-xs text-muted-foreground font-semibold mb-2">TOTAL AMOUNT TO PAY</p>
                <p className="text-4xl font-bold text-accent">${totalToCharge.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-2">Topup + Fees</p>
              </div>

              {/* New Balance Info */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">After top-up, your card balance will be:</p>
                <p className="text-xl font-bold text-primary">${finalBalance.toFixed(2)}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleFund} 
                disabled={loading || topupAmount < 1}
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Continue to Payment - ${totalToCharge.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Content - Payment Step */}
        {(step === "payment" || step === "verifying") && payment && (
          <div className="p-6 space-y-6">
            {/* Payment Details */}
            <div className="space-y-4">
              {/* Amount to Pay */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30">
                <p className="text-xs text-muted-foreground font-semibold mb-2">AMOUNT TO PAY</p>
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-4xl font-bold text-primary">${payment.amountUsd.toFixed(2)}</p>
                  <p className="text-sm font-semibold text-secondary">{payment.amountSol.toFixed(4)} SOL</p>
                </div>
                <p className="text-xs text-muted-foreground">SOL Price: ${payment.solPrice.toFixed(2)}</p>
              </div>

              {/* Expiry Timer */}
              {step === "payment" && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Payment expires in:
                  </span>
                  <span className="font-mono font-bold text-primary">{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>

            {/* Wallet Address */}
            {step === "payment" && (
              <>
                <div>
                  <p className="text-sm font-medium block mb-3">Send SOL to this address:</p>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <code className="flex items-center gap-2 text-sm break-all font-mono">
                      <span className="flex-1">{payment.paymentWallet}</span>
                      <button
                        onClick={() => copyToClipboard(payment.paymentWallet, "wallet")}
                        className="p-2 rounded hover:bg-muted flex-shrink-0"
                      >
                        {copied === "wallet" ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </code>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm text-blue-600">
                  <p>Once you send the payment to the wallet address above, click the button below. We'll automatically check the Solana blockchain and verify your payment.</p>
                </div>
              </>
            )}

            {/* Verifying State */}
            {step === "verifying" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-center text-muted-foreground">Verifying payment on the blockchain...</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              {step === "payment" && (
                <>
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleAutoVerifyPayment}
                    disabled={autoVerifying}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary"
                  >
                    {autoVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      "I've Sent the Payment"
                    )}
                  </Button>
                </>
              )}
              {step === "verifying" && (
                <Button disabled className="w-full" variant="outline">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verifying...
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Content - Success Step */}
        {step === "success" && (
          <div className="p-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-500 mb-2">Success!</h3>
              <p className="text-muted-foreground">{successMessage}</p>
            </div>
            <p className="text-xs text-muted-foreground">Closing modal...</p>
          </div>
        )}
      </Card>
    </div>
  )
}

// Transaction History Modal
interface CardTransaction {
  transaction_id: string
  card_id: string
  type: string
  amount: number
  merchant?: string
  description: string
  date: string
  status: string
  currency?: string
}

function TransactionHistoryModal({ 
  card, 
  onClose
}: { 
  card: CardData
  onClose: () => void
}) {
  const [transactions, setTransactions] = useState<CardTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"card" | "funding">("card")
  const [apiMessage, setApiMessage] = useState("")

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError("")
        setApiMessage("")
        // Fetch actual card transactions from KripiCard
        const response = await fetch(`/api/cards/${card.id}/card-transactions`)
        const data = await response.json()

        console.log("[Dashboard] Card transactions response:", JSON.stringify(data, null, 2))

        if (!data.success) {
          console.warn("Failed to load card transactions:", data.error)
          setTransactions([])
          setApiMessage(data.error || "Failed to load transactions")
        } else {
          setTransactions(data.transactions || [])
          if (data.message) {
            setApiMessage(data.message)
          }
        }
      } catch (err) {
        console.error("Failed to fetch card transactions:", err)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    if (activeTab === "card") {
      fetchTransactions()
    }
  }, [card.id, activeTab])

  const getTransactionIcon = (type: CardTransaction["type"]) => {
    switch (type) {
      case "FUND":
        return "💚"
      case "SPEND":
        return "❌"
      case "FREEZE":
        return "❄️"
      case "UNFREEZE":
        return "▶️"
      case "REFUND":
        return "↩️"
      case "BALANCE_SYNC":
        return "🔄"
      default:
        return "•"
    }
  }

  const getTransactionColor = (type: CardTransaction["type"]) => {
    switch (type) {
      case "FUND":
        return "text-green-500"
      case "SPEND":
        return "text-red-500"
      case "FREEZE":
        return "text-blue-500"
      case "UNFREEZE":
        return "text-blue-400"
      case "REFUND":
        return "text-yellow-500"
      case "BALANCE_SYNC":
        return "text-purple-500"
      default:
        return "text-muted-foreground"
    }
  }

  const formatRelativeTime = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diff = now.getTime() - then.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    
    return then.toLocaleDateString()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <Card className="relative z-10 w-full max-w-2xl bg-card border-border/50 overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Transaction History</h3>
            <p className="text-muted-foreground mt-1">
              Card ending in <span className="text-primary font-semibold">{card.cardNumber.slice(-4)}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-6 border-b border-border/50">
          <button
            onClick={() => setActiveTab("card")}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "card"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Card Transactions
          </button>
          <button
            onClick={() => setActiveTab("funding")}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "funding"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Funding History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "card" ? (
            // Card Transactions Tab
            <>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <p className="text-lg text-muted-foreground mb-2">💳 No card transactions yet</p>
                    <p className="text-sm text-muted-foreground">Purchases and refunds will appear here</p>
                    {apiMessage && (
                      <p className="text-xs text-muted-foreground mt-4 px-4 py-2 bg-muted/30 rounded-lg">{apiMessage}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {transactions.map((tx) => (
                    <div key={tx.transaction_id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Icon & Description */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-2xl flex-shrink-0">
                            {tx.type === "purchase" || tx.type === "charge" ? "🛒" : 
                             tx.type === "refund" ? "↩️" :
                             tx.type === "cashback" ? "💰" : "💳"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium break-words">
                              {tx.merchant || tx.description || tx.type}
                            </p>
                            {tx.merchant && tx.description && tx.description !== tx.merchant && (
                              <p className="text-sm text-muted-foreground mt-1">{tx.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(tx.date).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Right: Amount & Status */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          <p className={`text-lg font-bold ${
                            tx.type === "refund" || tx.type === "cashback" ? "text-green-500" : "text-red-500"
                          }`}>
                            {tx.type === "refund" || tx.type === "cashback" ? "+" : "-"}${tx.amount.toFixed(2)}
                          </p>
                          <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full capitalize ${
                            tx.status === "completed" || tx.status === "settled" 
                              ? "bg-green-500/20 text-green-400" 
                              : tx.status === "pending" 
                                ? "bg-yellow-500/20 text-yellow-400" 
                                : tx.status === "declined" || tx.status === "failed"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-muted/50 text-muted-foreground"
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Funding History Tab (Future - will show funding transactions)
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-lg text-muted-foreground mb-2">💚 Funding History</p>
                <p className="text-sm text-muted-foreground">Fund transactions will appear here</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/50 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}
