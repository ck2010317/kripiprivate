"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Loader2, 
  AlertCircle,
  CreditCard,
  Plus,
  RefreshCw,
  Check
} from "lucide-react"

interface CardData {
  id: string
  kripiCardId: string
  cardNumber: string
  expiryDate: string
  cvv: string
  nameOnCard: string
  balance: number
  status: string
  createdAt: string
}

interface CardsDashboardProps {
  onCreateNew: () => void
}

export function CardsDashboard({ onCreateNew }: CardsDashboardProps) {
  const [cards, setCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCVV, setShowCVV] = useState<{ [key: string]: boolean }>({})
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchCards()
  }, [])

  const fetchCards = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/cards")
      if (!response.ok) {
        throw new Error("Failed to fetch cards")
      }
      const data = await response.json()
      setCards(data.cards || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, "")
    if (cleaned.length < 4) return number
    return `${cleaned.slice(0, 4)} •••• •••• ${cleaned.slice(-4)}`
  }

  const toggleCVV = (cardId: string) => {
    setShowCVV(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return "text-green-500"
      case "FROZEN":
        return "text-yellow-500"
      case "CANCELLED":
        return "text-red-500"
      case "PENDING":
        return "text-orange-400"
      default:
        return "text-gray-500"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your cards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Error Loading Cards</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={fetchCards} variant="outline" className="w-full">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Cards Yet</h2>
          <p className="text-muted-foreground mb-8">
            You haven't created any virtual cards yet. Start by creating your first card!
          </p>
          <Button onClick={onCreateNew} size="lg" className="w-full gap-2">
            <Plus className="w-5 h-5" />
            Create Your First Card
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Cards</h1>
            <p className="text-muted-foreground mt-1">{cards.length} card{cards.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchCards}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button onClick={onCreateNew} className="gap-2">
              <Plus className="w-4 h-4" />
              New Card
            </Button>
          </div>
        </div>
      </header>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Card key={card.id} className="overflow-hidden bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              {/* Card Top Section */}
              <div className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold mb-1">CARD HOLDER</p>
                    <p className="text-lg font-bold">{card.nameOnCard}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(card.status)}`}>
                    {card.status}
                  </div>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-6 space-y-4">
                {card.status === "PENDING" ? (
                  /* PENDING card — show provisioning message */
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
                        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                      </div>
                      <p className="text-sm font-medium text-orange-400">Card is being set up</p>
                      <p className="text-xs text-muted-foreground mt-1">This can take up to 4 hours. Your card details will appear here once ready.</p>
                    </div>

                    {/* Balance */}
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground font-semibold mb-1">PREPAID BALANCE</p>
                      <p className="text-2xl font-bold text-primary">${card.balance.toFixed(2)}</p>
                    </div>

                    {/* Created Date */}
                    <div className="text-xs text-muted-foreground">
                      Created {formatDate(card.createdAt)}
                    </div>
                  </div>
                ) : (
                  /* Normal card — show full details */
                  <>
                    {/* Card Number */}
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold mb-2">CARD NUMBER</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-mono">{formatCardNumber(card.cardNumber)}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(card.cardNumber, `card-${card.id}`)}
                          className="h-8 w-8 p-0"
                        >
                          {copied === `card-${card.id}` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expiry & CVV */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold mb-1">EXPIRES</p>
                        <p className="text-sm font-mono">{card.expiryDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold mb-1">CVV</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono">
                            {showCVV[card.id] ? card.cvv : "•••"}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleCVV(card.id)}
                            className="h-6 w-6 p-0"
                          >
                            {showCVV[card.id] ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground font-semibold mb-1">BALANCE</p>
                      <p className="text-2xl font-bold text-primary">${card.balance.toFixed(2)}</p>
                    </div>

                    {/* Created Date */}
                    <div className="text-xs text-muted-foreground">
                      Created {formatDate(card.createdAt)}
                    </div>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
