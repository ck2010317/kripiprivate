"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/app/context/auth-context"
import { TopupModal } from "@/app/components/topup-modal"
import {
  CreditCard,
  Loader2,
  Check,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  Wallet,
  Clock,
  Plus,
  RefreshCw,
  Snowflake,
  Play,
  ChevronRight,
  Shield,
  ArrowLeft,
  User,
  Mail,
  Lock,
  Gift,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react"

// ==========================================
// CONSTANTS
// ==========================================
const CARD_ISSUANCE_FEE = 30
const SERVICE_FEE_PERCENT = 0.03
const SERVICE_FEE_FLAT = 1
const REQUIRED_TOKEN_AMOUNT = 5000000

// ==========================================
// TYPES
// ==========================================
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

interface PaymentRequest {
  id: string
  amountUsd: number
  amountSol: number
  solPrice: number
  paymentWallet: string
  expiresAt: string
  status: string
}

interface IssuedCard {
  id: string
  cardNumber: string
  expiryDate: string
  cvv: string
  nameOnCard: string
  balance: number
  status: string
}

// ==========================================
// MAIN MOBILE APP
// ==========================================
type AppScreen =
  | "splash"
  | "auth"
  | "dashboard"
  | "issue-form"
  | "issue-payment"
  | "issue-verifying"
  | "issue-processing"
  | "card-details"

export default function MobileApp() {
  const { user, login, signup, logout, loading: authLoading, authFetch } = useAuth()
  const [screen, setScreen] = useState<AppScreen>("splash")
  const [splashDone, setSplashDone] = useState(false)

  // Auth state
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [referralCode, setReferralCode] = useState("")

  // Dashboard state
  const [cards, setCards] = useState<CardData[]>([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [showTopup, setShowTopup] = useState(false)

  // Issue card state
  const [topupAmount, setTopupAmount] = useState("10")
  const [nameOnCard, setNameOnCard] = useState("")
  const [payment, setPayment] = useState<PaymentRequest | null>(null)
  const [issuedCard, setIssuedCard] = useState<IssuedCard | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)

  // Shared state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [showCVV, setShowCVV] = useState(false)
  const [actionLoading, setActionLoading] = useState("")

  // Splash timer
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  // Auto-navigate after splash (only for initial load)
  useEffect(() => {
    if (!splashDone || authLoading) return
    if (screen !== "splash") return
    if (user) {
      setScreen("dashboard")
      setNameOnCard(user.name || "")
    } else {
      setScreen("auth")
    }
  }, [splashDone, authLoading, user, screen])

  // Fetch cards when on dashboard
  const fetchCards = useCallback(async () => {
    try {
      setCardsLoading(true)
      const res = await authFetch("/api/cards")
      const data = await res.json()
      if (data.success) setCards(data.cards || [])
    } catch (e) {
      console.error("Failed to fetch cards:", e)
    } finally {
      setCardsLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    if (screen === "dashboard" && user) fetchCards()
  }, [screen, user, fetchCards])

  // Payment expiry timer
  useEffect(() => {
    if (!payment?.expiresAt) return
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff === 0) {
        setError("Payment expired. Please try again.")
        setScreen("issue-form")
        setPayment(null)
      }
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [payment?.expiresAt])

  // Helpers
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
  const formatCard = (n: string) => n.replace(/\s/g, "").match(/.{1,4}/g)?.join(" ") || n
  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  // ==========================================
  // AUTH HANDLERS
  // ==========================================
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      let result: { success: boolean; error?: string }
      if (authMode === "login") {
        result = await login(email, password)
      } else {
        if (!name.trim()) {
          setError("Name is required")
          setLoading(false)
          return
        }
        result = await signup(email, password, name, referralCode || undefined)
      }

      if (result.success) {
        setScreen("dashboard")
      } else {
        setError(result.error || "Authentication failed")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    setScreen("auth")
    setCards([])
    setSelectedCard(null)
    setEmail("")
    setPassword("")
    setName("")
  }

  // ==========================================
  // CARD ISSUANCE HANDLERS
  // ==========================================
  const handleCreatePayment = async () => {
    const topup = parseFloat(topupAmount)
    if (!nameOnCard.trim()) { setError("Cardholder name is required"); return }
    if (isNaN(topup) || topup < 10) { setError("Minimum topup is $10"); return }

    const serviceFee = topup * SERVICE_FEE_PERCENT + SERVICE_FEE_FLAT
    const totalAmount = topup + CARD_ISSUANCE_FEE + serviceFee

    setLoading(true)
    setError("")
    try {
      const res = await authFetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: totalAmount,
          topupAmount: topup,
          cardFee: CARD_ISSUANCE_FEE,
          serviceFee,
          nameOnCard: nameOnCard.trim(),
          cardType: "issue",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create payment")
      setPayment(data.payment)
      setScreen("issue-payment")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment")
    } finally {
      setLoading(false)
    }
  }

  const handleAutoVerify = async () => {
    if (!payment) return
    setLoading(true)
    setError("")
    setScreen("issue-verifying")
    try {
      const res = await authFetch("/api/payments/auto-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.message || "Payment not detected yet. Try again.")
        setScreen("issue-payment")
        setLoading(false)
        return
      }
      setScreen("issue-processing")
      const issueRes = await authFetch(`/api/payments/${payment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txSignature: data.txSignature }),
      })
      const issueData = await issueRes.json()
      if (!issueRes.ok || !issueData.success) throw new Error(issueData.error || "Card creation failed")

      setTimeout(() => {
        if (issueData.card) {
          setIssuedCard(issueData.card)
          setScreen("card-details")
        }
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed")
      setScreen("issue-payment")
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // CARD ACTION HANDLERS
  // ==========================================
  const syncCard = async (cardId: string) => {
    try {
      setActionLoading(cardId)
      const res = await authFetch(`/api/cards/${cardId}`)
      const data = await res.json()
      if (data.success) {
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...data.card } : c))
        if (selectedCard?.id === cardId) setSelectedCard({ ...selectedCard, ...data.card })
      }
    } catch (e) { console.error(e) }
    finally { setActionLoading("") }
  }

  const handleFreezeUnfreeze = async (card: CardData) => {
    setActionLoading(card.id)
    try {
      const action = card.status === "ACTIVE" ? "freeze" : "unfreeze"
      const res = await authFetch(`/api/cards/${card.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const newStatus = action === "freeze" ? "FROZEN" : "ACTIVE"
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: newStatus } : c))
        if (selectedCard?.id === card.id) setSelectedCard({ ...selectedCard, status: newStatus })
      }
    } catch (e) { console.error(e) }
    finally { setActionLoading("") }
  }

  // ==========================================
  // REUSABLE UI
  // ==========================================
  const GlowOrb = ({ className, color = "purple" }: { className?: string; color?: "purple" | "blue" | "white" }) => {
    const colorMap = {
      purple: "bg-purple-500/[0.12]",
      blue: "bg-blue-500/[0.10]",
      white: "bg-white/[0.05]",
    }
    return <div className={`absolute rounded-full blur-3xl pointer-events-none ${colorMap[color]} ${className}`} />
  }

  const AppHeader = ({ title, onBack, rightContent }: { title: string; onBack: () => void; rightContent?: React.ReactNode }) => (
    <div className="sticky top-0 z-20 bg-[#110f1f]/85 backdrop-blur-xl border-b border-purple-400/[0.12] px-4 pb-3.5 flex items-center justify-between" style={{ paddingTop: 'max(54px, env(safe-area-inset-top, 54px))' }}>
      <button onClick={onBack} className="p-2 -ml-2 rounded-xl active:bg-purple-500/15 transition-colors">
        <ArrowLeft className="w-5 h-5 text-purple-200/80" />
      </button>
      <h1 className="text-base font-semibold text-white tracking-tight">{title}</h1>
      {rightContent || <div className="w-9" />}
    </div>
  )

  const statusColor = (status: string) => ({
    ACTIVE: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400", icon: "text-emerald-400/80" },
    FROZEN: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", dot: "bg-blue-400", icon: "text-blue-400/80" },
    CANCELLED: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-400", icon: "text-red-400/80" },
    PENDING: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-400", icon: "text-amber-400/80" },
  }[status] || { bg: "bg-white/10", border: "border-white/10", text: "text-white/40", dot: "bg-white/40", icon: "text-white/40" })

  // ==========================================
  // SCREENS
  // ==========================================

  // ===== SPLASH =====
  if (screen === "splash") {
    return (
      <div className="mobile-container flex items-center justify-center bg-[#0d0b18] relative overflow-hidden">
        <GlowOrb className="w-96 h-96 -top-32 -right-32" color="purple" />
        <GlowOrb className="w-80 h-80 -bottom-40 -left-40" color="blue" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.08)_0%,_transparent_70%)]" />
        <div className="text-center relative z-10 animate-fadeIn">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 bg-purple-500/25 rounded-3xl blur-2xl animate-pulse" />
            <div className="absolute inset-[-4px] rounded-3xl bg-gradient-to-br from-purple-500/30 to-blue-500/20 animate-pulse" style={{ animationDuration: "3s" }} />
            <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-purple-600/30 via-[#0f0d1a] to-blue-600/20 border border-purple-500/30 flex items-center justify-center backdrop-blur-xl shadow-2xl shadow-purple-500/20">
              <Eye className="w-14 h-14 text-purple-300" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">PrivatePay</h1>
          <p className="text-sm text-purple-300/65 tracking-wide">Payment Infrastructure</p>
          <div className="mt-10 flex items-center justify-center gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-purple-400/60 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ===== AUTH =====
  if (screen === "auth") {
    return (
      <div className="mobile-container bg-[#0d0b18] relative overflow-hidden">
        <GlowOrb className="w-80 h-80 -top-24 right-[-60px]" color="purple" />
        <GlowOrb className="w-72 h-72 bottom-10 -left-24" color="blue" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.06)_0%,_transparent_60%)]" />

        <div className="relative z-10">
          {/* Header */}
          <div className="pt-16 pb-10 text-center px-6">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 bg-purple-500/25 rounded-2xl blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 via-[#0f0d1a] to-blue-600/20 border border-purple-500/30 flex items-center justify-center backdrop-blur-xl shadow-lg shadow-purple-500/20">
                <Eye className="w-8 h-8 text-purple-300" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {authMode === "login" ? "Welcome back" : "Get Started"}
            </h1>
            <p className="text-sm text-purple-300/60 mt-2">
              {authMode === "login" ? "Sign in to manage your cards" : "Create your PrivatePay account"}
            </p>
          </div>

          {/* Form */}
          <div className="px-6 pb-10">
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-3.5">
              {authMode === "signup" && (
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-purple-400/45 group-focus-within:text-purple-400/70 transition-colors z-10" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full Name"
                    className="mobile-input pl-12"
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-purple-400/45 group-focus-within:text-purple-400/70 transition-colors z-10" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="mobile-input pl-12"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-purple-400/45 group-focus-within:text-purple-400/70 transition-colors z-10" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  className="mobile-input pl-12 pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 z-10">
                  {showPassword
                    ? <EyeOff className="w-[18px] h-[18px] text-purple-400/45" />
                    : <Eye className="w-[18px] h-[18px] text-purple-400/45" />}
                </button>
              </div>

              {authMode === "signup" && (
                <div className="relative group">
                  <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-purple-400/45 group-focus-within:text-purple-400/70 transition-colors z-10" />
                  <input
                    type="text"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value)}
                    placeholder="Referral code (optional)"
                    className="mobile-input pl-12"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="mobile-btn-primary w-full"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {authMode === "login" ? "Sign In" : "Create Account"}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* Toggle */}
            <div className="mt-8 text-center">
              <button
                onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setError("") }}
                className="text-sm text-purple-300/60 active:text-purple-300/80 transition-colors"
              >
                {authMode === "login" ? (
                  <>Don&apos;t have an account? <span className="text-purple-400 font-medium">Sign Up</span></>
                ) : (
                  <>Already have an account? <span className="text-purple-400 font-medium">Sign In</span></>
                )}
              </button>
            </div>

            {/* Feature pills */}
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: "Zero KYC" },
                { icon: Zap, label: "Instant" },
                { icon: CreditCard, label: "Crypto Cards" },
              ].map((f, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-purple-500/[0.07] border border-purple-400/[0.14]">
                  <f.icon className="w-4 h-4 text-purple-400/50" />
                  <span className="text-[10px] text-purple-300/65 font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== VERIFYING / PROCESSING =====
  if (screen === "issue-verifying" || screen === "issue-processing") {
    return (
      <div className="mobile-container flex items-center justify-center bg-[#0d0b18] relative overflow-hidden">
        <GlowOrb className="w-72 h-72 top-1/3 left-1/2 -translate-x-1/2" color="purple" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.08)_0%,_transparent_60%)]" />
        <div className="text-center px-8 relative z-10">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-purple-500/[0.08] border border-purple-500/20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {screen === "issue-verifying" ? "Verifying Payment" : "Issuing Your Card"}
          </h2>
          <p className="text-purple-300/60 text-sm">
            {screen === "issue-verifying" ? "Checking Solana blockchain..." : "Creating your virtual card..."}
          </p>
        </div>
      </div>
    )
  }

  // ===== CARD DETAILS =====
  if (screen === "card-details" && (issuedCard || selectedCard)) {
    const card = selectedCard || (issuedCard ? {
      id: issuedCard.id,
      kripiCardId: issuedCard.id,
      cardNumber: issuedCard.cardNumber,
      expiryDate: issuedCard.expiryDate,
      cvv: issuedCard.cvv,
      nameOnCard: issuedCard.nameOnCard,
      balance: issuedCard.balance || 0,
      status: (issuedCard.status || "ACTIVE") as CardData["status"],
      createdAt: new Date().toISOString(),
    } : null)

    if (!card) return null
    const sc = statusColor(card.status)

    return (
      <div className="mobile-container bg-[#0d0b18] relative overflow-hidden">
        <GlowOrb className="w-72 h-72 -top-20 right-0" color="purple" />

        <AppHeader
          title="Card Details"
          onBack={() => { setSelectedCard(null); setIssuedCard(null); setScreen("dashboard") }}
        />

        <div className="px-4 py-5 space-y-5 relative z-10">
          {/* Premium Card Visual */}
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/10 rounded-2xl blur-xl" />
            <div className="relative rounded-2xl p-6 bg-gradient-to-br from-purple-900/40 via-[#0f0d1a] to-blue-900/30 border border-purple-400/[0.22] backdrop-blur-xl shadow-2xl shadow-purple-500/[0.08]">
              <div className="absolute top-4 right-4 w-16 h-16 bg-purple-500/10 rounded-full blur-2xl" />
              
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-400/80" />
                  <span className="text-[10px] font-bold text-purple-300/60 tracking-[0.2em] uppercase">PrivatePay</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${sc.bg} ${sc.border} border`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${sc.dot} animate-pulse`} />
                  <span className={`text-[10px] font-bold ${sc.text}`}>{card.status}</span>
                </div>
              </div>

              <p className="font-mono text-[17px] text-white/90 tracking-[0.15em] mb-6">
                {formatCard(card.cardNumber)}
              </p>

              <div className="flex items-center justify-between mb-6">
                <div className="w-11 h-8 bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 border border-yellow-400/40 rounded-md flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-0.5">
                    {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-yellow-300/50 rounded-sm" />)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-purple-300/60 uppercase tracking-wider">Balance</p>
                  <p className="text-white font-bold text-lg">${card.balance.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] text-purple-300/60 uppercase tracking-wider">Cardholder</p>
                  <p className="text-white/90 font-semibold text-sm">{card.nameOnCard}</p>
                </div>
                <div>
                  <p className="text-[9px] text-purple-300/60 uppercase tracking-wider">Expires</p>
                  <p className="text-white/90 font-mono text-sm">{card.expiryDate}</p>
                </div>
                <div>
                  <p className="text-[9px] text-purple-300/60 uppercase tracking-wider">CVV</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-white/90 font-mono text-sm">{showCVV ? card.cvv : "•••"}</p>
                    <button onClick={() => setShowCVV(!showCVV)} className="p-0.5">
                      {showCVV ? <EyeOff className="w-3 h-3 text-purple-300/65" /> : <Eye className="w-3 h-3 text-purple-300/65" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Copy buttons */}
          <div className="space-y-2">
            {[
              { label: "Card Number", value: card.cardNumber.replace(/\s/g, ""), display: formatCard(card.cardNumber), key: "num" },
              { label: "Expiry Date", value: card.expiryDate, display: card.expiryDate, key: "exp" },
              { label: "CVV", value: card.cvv, display: showCVV ? card.cvv : "•••", key: "cvv" },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => copyText(item.value, item.key)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-purple-500/[0.07] border border-purple-400/[0.14] active:bg-purple-500/[0.15] transition-all"
              >
                <div className="text-left">
                  <p className="text-[10px] text-purple-300/65 uppercase tracking-wider">{item.label}</p>
                  <p className="text-white/90 font-mono text-sm mt-0.5">{item.display}</p>
                </div>
                {copied === item.key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-purple-400/55" />}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowTopup(true)}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-purple-500/[0.08] border border-purple-400/[0.2] text-purple-300 font-medium active:bg-purple-500/[0.15] transition-all"
            >
              <Plus className="w-4 h-4" /> Top Up
            </button>
            <button
              onClick={() => handleFreezeUnfreeze(card)}
              disabled={actionLoading === card.id}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border font-medium transition-all ${
                card.status === "ACTIVE"
                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400 active:bg-blue-500/20"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 active:bg-emerald-500/20"
              }`}
            >
              {actionLoading === card.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : card.status === "ACTIVE"
                  ? <><Snowflake className="w-4 h-4" /> Freeze</>
                  : <><Play className="w-4 h-4" /> Unfreeze</>}
            </button>
          </div>

          <button
            onClick={() => syncCard(card.id)}
            disabled={actionLoading === card.id}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500/[0.07] border border-purple-400/[0.14] text-purple-300/65 font-medium active:bg-purple-500/[0.15] transition-all"
          >
            {actionLoading === card.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Balance
          </button>

          {card.status === "PENDING" && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-400">⏳ Your card is being activated. This may take up to 1 hour.</p>
            </div>
          )}
        </div>

        {showTopup && (
          <TopupModal
            cardId={card.id}
            isOpen={showTopup}
            onClose={() => setShowTopup(false)}
            onSuccess={() => { setShowTopup(false); syncCard(card.id) }}
          />
        )}
      </div>
    )
  }

  // ===== ISSUE CARD - PAYMENT =====
  if (screen === "issue-payment" && payment) {
    return (
      <div className="mobile-container bg-[#0d0b18] relative overflow-hidden">
        <AppHeader
          title="Send Payment"
          onBack={() => { setScreen("issue-form"); setPayment(null) }}
          rightContent={
            <div className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono text-xs font-bold">{formatTime(timeLeft)}</span>
            </div>
          }
        />

        <div className="px-4 py-5 space-y-4 relative z-10">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Amount */}
          <div className="text-center py-8 rounded-2xl bg-gradient-to-b from-purple-500/[0.06] to-transparent border border-purple-400/[0.18] backdrop-blur-sm relative overflow-hidden">
            <GlowOrb className="w-48 h-48 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" color="purple" />
            <div className="relative z-10">
              <p className="text-xs text-purple-300/60 mb-2 uppercase tracking-wider">Send exactly</p>
              <p className="text-4xl font-bold text-white font-mono">{payment.amountSol.toFixed(6)}</p>
              <p className="text-lg text-purple-400 font-semibold mt-1">SOL</p>
              <p className="text-xs text-purple-300/65 mt-2">≈ ${payment.amountUsd.toFixed(2)} USD</p>
            </div>
          </div>

          {/* Wallet */}
          <div className="p-4 rounded-xl bg-purple-500/[0.07] border border-purple-400/[0.14] space-y-3">
            <p className="text-xs text-purple-300/60 uppercase tracking-wider">Send to this Solana address</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-white/90 break-all bg-[#12101e] p-3 rounded-lg border border-purple-400/[0.14]">
                {payment.paymentWallet}
              </code>
              <button onClick={() => copyText(payment.paymentWallet, "wallet")} className="p-3 rounded-lg bg-[#12101e] border border-purple-400/[0.14] active:bg-purple-500/10 shrink-0 transition-colors">
                {copied === "wallet" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-purple-400/55" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center p-3.5 rounded-xl bg-purple-500/[0.07] border border-purple-400/[0.14]">
            <span className="text-sm text-purple-300/60">SOL Price</span>
            <span className="text-sm text-white font-semibold">${payment.solPrice.toFixed(2)}</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/15">
            <p className="text-xs text-amber-400/80">⚠️ Send on <strong>Solana Mainnet</strong> only. Payments on other networks will be lost.</p>
          </div>

          <button onClick={handleAutoVerify} disabled={loading} className="mobile-btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><Check className="w-5 h-5" /> I Have Sent the Payment</span>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ===== ISSUE CARD - FORM =====
  if (screen === "issue-form") {
    const topup = parseFloat(topupAmount) || 10
    const serviceFee = topup * SERVICE_FEE_PERCENT + SERVICE_FEE_FLAT
    const total = topup + CARD_ISSUANCE_FEE + serviceFee

    return (
      <div className="mobile-container bg-[#0d0b18] relative overflow-hidden">
        <GlowOrb className="w-72 h-72 -top-20 -right-20" color="purple" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.05)_0%,_transparent_50%)]" />

        <AppHeader title="Issue New Card" onBack={() => setScreen("dashboard")} />

        <div className="px-4 py-5 space-y-5 relative z-10">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Card Preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/10 rounded-2xl blur-xl" />
            <div className="relative rounded-2xl p-5 bg-gradient-to-br from-purple-900/40 via-[#0f0d1a] to-blue-900/30 border border-purple-400/[0.22] backdrop-blur-xl">
              <div className="absolute top-3 right-3 w-12 h-12 bg-purple-500/10 rounded-full blur-xl" />
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-400/60" />
                  <span className="text-[9px] font-bold text-purple-300/60 tracking-[0.2em] uppercase">PrivatePay</span>
                </div>
                <CreditCard className="w-5 h-5 text-purple-400/35" />
              </div>
              <p className="font-mono text-sm text-purple-300/65 tracking-[0.15em] mb-5">4938 •••• •••• ••••</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] text-purple-300/65 uppercase">Cardholder</p>
                  <p className="text-white/85 font-semibold text-xs">{nameOnCard || "YOUR NAME"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-purple-300/65 uppercase">Balance</p>
                  <p className="text-white font-bold text-sm">${topup.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-purple-300/65 uppercase tracking-wider">Cardholder Name</label>
              <input
                type="text"
                value={nameOnCard}
                onChange={e => setNameOnCard(e.target.value.toUpperCase())}
                placeholder="JOHN DOE"
                className="mobile-input uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-purple-300/65 uppercase tracking-wider">Initial Balance</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/55 font-semibold">$</span>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  min="10"
                  placeholder="10"
                  className="mobile-input pl-9"
                />
              </div>
              <p className="text-[11px] text-purple-300/40">Minimum $10</p>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="p-4 rounded-xl bg-purple-500/[0.07] border border-purple-400/[0.14] space-y-3">
            {[
              { label: "Initial Balance", value: `$${topup.toFixed(2)}` },
              { label: "Card Fee", value: `$${CARD_ISSUANCE_FEE}.00` },
              { label: "Service (3% + $1)", value: `$${serviceFee.toFixed(2)}` },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-purple-300/60">{row.label}</span>
                <span className="text-white/90">{row.value}</span>
              </div>
            ))}
            <div className="border-t border-purple-400/[0.18] pt-3 flex justify-between items-center">
              <span className="text-white font-semibold">Total</span>
              <span className="text-purple-400 font-bold text-xl">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="p-4 rounded-xl bg-purple-500/[0.07] border border-purple-400/[0.14]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 border border-purple-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-400/70" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">Pay with Solana (SOL)</p>
                <p className="text-xs text-purple-300/65 mt-0.5">You&apos;ll be shown a wallet address after clicking continue</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-500/[0.07] border border-purple-400/[0.14] flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-purple-400/45 shrink-0" />
            <p className="text-[11px] text-purple-300/60">
              Wallet must hold <span className="text-purple-400/70 font-semibold">{REQUIRED_TOKEN_AMOUNT.toLocaleString()}</span> $PRIVATE tokens
            </p>
          </div>

          <button onClick={handleCreatePayment} disabled={loading} className="mobile-btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Creating...</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Continue to Payment — ${total.toFixed(2)}
              </span>
            )}
          </button>

          <p className="text-center text-[11px] text-purple-300/35">
            ⏳ Please allow up to 1 hour for your card to become active after issuance.
          </p>
        </div>
      </div>
    )
  }

  // ===== DASHBOARD =====
  return (
    <div className="mobile-container bg-[#0d0b18] relative overflow-hidden">
      <GlowOrb className="w-96 h-96 -top-32 -right-32" color="purple" />
      <GlowOrb className="w-72 h-72 bottom-40 -left-24" color="blue" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.06)_0%,_transparent_50%)]" />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#110f1f]/85 backdrop-blur-xl border-b border-purple-400/[0.14] px-4 pb-3.5" style={{ paddingTop: 'max(54px, env(safe-area-inset-top, 54px))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/20 border border-purple-500/25 flex items-center justify-center shadow-lg shadow-purple-500/10">
              <Eye className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">PrivatePay</h1>
              <p className="text-[11px] text-purple-300/65 truncate max-w-[180px]">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2.5 rounded-xl bg-purple-500/[0.07] border border-purple-400/[0.14] active:bg-purple-500/10 transition-colors">
            <LogOut className="w-4 h-4 text-purple-400/55" />
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 relative z-10">
        {/* Welcome Card */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.08] to-blue-500/[0.04]" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
          <div className="relative p-5 border border-purple-400/[0.18] rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300/60 text-xs uppercase tracking-wider">Welcome back</p>
                <p className="text-white text-xl font-bold mt-1">{user?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-purple-300/60 text-xs uppercase tracking-wider">Cards</p>
                <p className="text-purple-400 text-2xl font-bold mt-1">{cards.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Issue Card Button */}
        <button
          onClick={() => { setError(""); setScreen("issue-form") }}
          className="mobile-btn-primary w-full"
        >
          <span className="flex items-center justify-center gap-2.5">
            <Plus className="w-5 h-5" />
            Issue New Card
            <ArrowRight className="w-4 h-4 opacity-60" />
          </span>
        </button>

        {/* Cards List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-purple-300/65 uppercase tracking-wider">Your Cards</h2>
            <button onClick={fetchCards} disabled={cardsLoading} className="p-2 rounded-lg active:bg-purple-500/10 transition-colors">
              <RefreshCw className={`w-4 h-4 text-purple-400/45 ${cardsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {cardsLoading && cards.length === 0 ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-purple-400/35 animate-spin mb-3" />
              <p className="text-sm text-purple-300/65">Loading cards...</p>
            </div>
          ) : cards.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-purple-500/[0.15] border border-purple-400/[0.12] border-dashed">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-500/[0.15] border border-purple-400/[0.14] flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-purple-400/35" />
              </div>
              <p className="text-purple-300/60 font-medium">No cards yet</p>
              <p className="text-xs text-purple-300/35 mt-1">Issue your first virtual card to get started</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cards.map(card => {
                const sc = statusColor(card.status)
                return (
                  <button
                    key={card.id}
                    onClick={() => { setSelectedCard(card); setShowCVV(false); setScreen("card-details") }}
                    className="w-full p-4 rounded-xl bg-purple-500/[0.07] border border-purple-400/[0.14] active:bg-purple-500/[0.15] transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${sc.bg} flex items-center justify-center`}>
                          <CreditCard className={`w-5 h-5 ${sc.icon}`} />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{card.nameOnCard}</p>
                          <p className="text-purple-300/40 font-mono text-xs mt-0.5">•••• {card.cardNumber.slice(-4)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-white font-bold text-sm">${card.balance.toFixed(2)}</p>
                          <div className="flex items-center gap-1 mt-0.5 justify-end">
                            <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            <p className={`text-[10px] font-semibold ${sc.text}`}>{card.status}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-purple-400/10 group-active:text-purple-400/45 transition-colors" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  )
}
