"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  Snowflake,
  Play,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/app/context/auth-context"
import { TopupModal } from "@/app/components/topup-modal"

interface CardDetails {
  id: string
  cardNumber: string
  expiryDate: string
  cvv: string
  nameOnCard: string
  balance: number
  status: "ACTIVE" | "FROZEN" | "CANCELLED"
}

interface CardDetailsPageProps {
  card: CardDetails
  onBack: () => void
  onIssueAnother: () => void
}

export function CardDetailsPage({
  card,
  onBack,
  onIssueAnother,
}: CardDetailsPageProps) {
  const { logout } = useAuth()
  const [showCVV, setShowCVV] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [cardStatus, setCardStatus] = useState<"ACTIVE" | "FROZEN">(
    card.status === "CANCELLED" ? "ACTIVE" : card.status
  )
  const [showTopupModal, setShowTopupModal] = useState(false)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, "")
    return cleaned.match(/.{1,4}/g)?.join(" ") || number
  }

  const handleFreezeUnfreeze = async () => {
    setLoading(true)
    setError("")

    try {
      const newStatus = cardStatus === "ACTIVE" ? "freeze" : "unfreeze"
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update card status")
      }

      setCardStatus(newStatus === "freeze" ? "FROZEN" : "ACTIVE")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update card")
    } finally {
      setLoading(false)
    }
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
              <h1 className="text-xl font-bold">Card Details</h1>
              <p className="text-sm text-muted-foreground">
                {card.nameOnCard}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* 1-Hour Activation Notice - shown on newly created cards */}
        <div className="mb-6 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
          <span className="text-yellow-400 text-lg">⏳</span>
          <p className="text-sm text-yellow-400">
            Please wait 1 hour after activation before usage.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card Visual - Large and Beautiful */}
          <div className="md:col-span-2">
            <div className="sticky top-24">
              <Card className="overflow-hidden shadow-2xl">
                <div className="relative p-12 bg-gradient-to-br from-primary via-secondary to-primary/50 aspect-video flex flex-col justify-between rounded-2xl">
                  {/* Top Section */}
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-white/60 tracking-widest">
                        CARDHOLDER NAME
                      </p>
                      <p className="text-2xl font-bold text-white mt-2">
                        {card.nameOnCard}
                      </p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <path d="M2 10h20M10 14h4" stroke="currentColor" strokeWidth="1" fill="none" />
                      </svg>
                    </div>
                  </div>

                  {/* Middle Section - Card Number */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-white/60 tracking-widest mb-2">
                        CARD NUMBER
                      </p>
                      <p className="font-mono text-2xl tracking-widest text-white font-bold">
                        {formatCardNumber(card.cardNumber)}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-semibold text-white/60 tracking-widest">
                        VALID THRU
                      </p>
                      <p className="font-mono text-lg text-white font-bold mt-1">
                        {card.expiryDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-white/60 tracking-widest">
                        BALANCE
                      </p>
                      <p className="font-bold text-2xl text-white mt-1">
                        ${card.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Hologram effect overlay */}
                  <div className="absolute inset-0 opacity-10 bg-gradient-to-tr from-transparent via-white to-transparent pointer-events-none rounded-2xl"></div>
                </div>
              </Card>

              {/* Card Status Badge */}
              <div className="mt-4 flex items-center justify-center gap-2 p-3 rounded-lg bg-card border border-border">
                <div
                  className={`w-2 h-2 rounded-full ${
                    cardStatus === "ACTIVE"
                      ? "bg-green-500"
                      : "bg-amber-500"
                  }`}
                ></div>
                <span className="text-sm font-medium">
                  {cardStatus === "ACTIVE" ? "Card is Active" : "Card is Frozen"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Details & Actions */}
          <div className="space-y-6">
            {/* Card Details */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Card Details</h2>

              {/* Full Card Number */}
              <div className="space-y-2 mb-4 pb-4 border-b border-border">
                <label className="text-xs font-semibold text-muted-foreground tracking-widest">
                  FULL CARD NUMBER
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono p-2 rounded bg-muted/50 break-all">
                    {card.cardNumber}
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(card.cardNumber, "fullnumber")
                    }
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
                  >
                    {copied === "fullnumber" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expiry Date */}
              <div className="space-y-2 mb-4 pb-4 border-b border-border">
                <label className="text-xs font-semibold text-muted-foreground tracking-widest">
                  EXPIRY DATE
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-sm font-mono p-2 rounded bg-muted/50">
                    {card.expiryDate}
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(card.expiryDate, "expiry")
                    }
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
                  >
                    {copied === "expiry" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* CVV */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground tracking-widest">
                  CVV
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showCVV ? "text" : "password"}
                    readOnly
                    value={card.cvv}
                    className="flex-1 text-sm font-mono p-2 rounded bg-muted/50"
                  />
                  <button
                    onClick={() => setShowCVV(!showCVV)}
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
                  >
                    {showCVV ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(card.cvv, "cvv")}
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
                  >
                    {copied === "cvv" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Topup Button */}
              <Button
                onClick={() => setShowTopupModal(true)}
                className="w-full py-6 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Balance
              </Button>

              {/* Freeze/Unfreeze Button */}
              <Button
                onClick={handleFreezeUnfreeze}
                disabled={loading}
                variant={cardStatus === "ACTIVE" ? "outline" : "default"}
                className="w-full py-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : cardStatus === "ACTIVE" ? (
                  <>
                    <Snowflake className="w-5 h-5 mr-2" />
                    Freeze Card
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Unfreeze Card
                  </>
                )}
              </Button>

              {/* Issue Another Card Button */}
              <Button
                onClick={onIssueAnother}
                variant="outline"
                className="w-full py-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Issue Another Card
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Topup Modal */}
      <TopupModal
        cardId={card.id}
        isOpen={showTopupModal}
        onClose={() => setShowTopupModal(false)}
        onSuccess={(paymentId) => {
          setShowTopupModal(false)
          // Show success message or reload balance
          console.log("Top-up successful:", paymentId)
        }}
      />
    </div>
  )
}
