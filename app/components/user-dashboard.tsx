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
  ArrowLeft
} from "lucide-react"
import { useAuth } from "@/app/context/auth-context"

interface CardData {
  id: string
  kripiCardId: string
  cardNumber: string
  expiryDate: string
  cvv: string
  nameOnCard: string
  balance: number
  status: "ACTIVE" | "FROZEN" | "CANCELLED"
  createdAt: string
}

interface UserDashboardProps {
  onBack: () => void
  onCreateCard: () => void
}

export function UserDashboard({ onBack, onCreateCard }: UserDashboardProps) {
  const { user, logout } = useAuth()
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [showCVV, setShowCVV] = useState<Record<string, boolean>>({})
  const [showFullNumber, setShowFullNumber] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

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
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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
                {/* Card Visual */}
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
                <div className="p-4 border-t border-border/50 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCardAction(card.id, card.status === "FROZEN" ? "unfreeze" : "freeze")}
                    disabled={actionLoading === card.id}
                  >
                    {actionLoading === card.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : card.status === "FROZEN" ? (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Unfreeze
                      </>
                    ) : (
                      <>
                        <Snowflake className="w-4 h-4 mr-1" />
                        Freeze
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedCard(card)}
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Fund
                  </Button>
                </div>
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

  const FIXED_FEE = 1.0
  const SERVICE_FEE_PERCENT = 0.02

  const topupAmount = parseFloat(amount) || 0
  const serviceFee = topupAmount > 0 ? topupAmount * SERVICE_FEE_PERCENT + FIXED_FEE : 0
  const totalAmount = topupAmount + serviceFee

  const handleFund = async () => {
    const fundAmount = parseFloat(amount)
    if (isNaN(fundAmount) || fundAmount < 1) {
      setError("Amount must be at least $1")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/cards/${card.id}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: fundAmount }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
      } else {
        setError(data.error || "Failed to fund card")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <Card className="relative z-10 w-full max-w-md bg-card border-border/50 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <h3 className="text-2xl font-bold">Fund Card</h3>
          <p className="text-muted-foreground mt-1">
            Current balance: <span className="text-primary font-semibold">${card.balance.toFixed(2)}</span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Content */}
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
          </div>

          {/* Fee Breakdown */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/30 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Top-up Amount</span>
              <span className="font-semibold">${topupAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Fixed Fee</span>
              <span className="font-semibold">${FIXED_FEE.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Service Fee (2.00%)</span>
              <span className="font-semibold">${(topupAmount * SERVICE_FEE_PERCENT).toFixed(2)}</span>
            </div>
            <div className="border-t border-border/30 pt-2 flex justify-between items-center">
              <span className="font-bold text-foreground">Total Deducted</span>
              <span className="font-bold text-primary text-lg">${totalAmount.toFixed(2)}</span>
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
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Add Funds"
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
