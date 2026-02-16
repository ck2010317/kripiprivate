"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Eye,
  Zap,
  Shield,
  ArrowRight,
  CreditCard,
  Wallet,
  ChevronRight,
  AlertCircle,
  Check,
  Clock,
  Loader2,
  Copy,
  User,
  LogOut,
  DollarSign,
  RefreshCw,
} from "lucide-react"
import { AuthProvider, useAuth } from "@/app/context/auth-context"
import { AuthModal } from "@/app/components/auth-modal"
import { UserDashboard } from "@/app/components/user-dashboard"
import { IssueCardFlow } from "@/app/components/issue-card-flow"
import { CardPurchase } from "@/app/components/card-purchase"
import { ChatWidget } from "@/app/components/chat-widget"
import { ReferralDashboard } from "@/app/components/referral-dashboard"

// Scroll Animation Hook
function useScrollAnimation() {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement
          const animationType = element.getAttribute("data-scroll-animation")
          element.classList.add(animationType || "scroll-animate")
          observer.unobserve(entry.target)
        }
      })
    }, observerOptions)

    const elements = document.querySelectorAll("[data-scroll-animation]")
    elements.forEach((element) => observer.observe(element))

    return () => {
      elements.forEach((element) => observer.unobserve(element))
    }
  }, [])
}

// Animated Terminal Component
function AnimatedTerminal() {
  const [lines, setLines] = useState<string[]>([])
  const [currentExample, setCurrentExample] = useState(0)

  const examples = [
    {
      command: "$ privatepay card issue --amount 50 --type visa",
      cardId: "card_7x1k9m2p",
      amount: "$50.00",
    },
    {
      command: "$ privatepay card issue --amount 100 --type mastercard",
      cardId: "card_3q8r5n4x",
      amount: "$100.00",
    },
    {
      command: "$ privatepay card issue --amount 25 --type amex",
      cardId: "card_2w9b3c5t",
      amount: "$25.00",
    },
    {
      command: "$ privatepay card issue --amount 75 --type visa",
      cardId: "card_6l2h4j9s",
      amount: "$75.00",
    },
  ]

  useEffect(() => {
    const example = examples[currentExample]
    const fullLines = [
      example.command,
      "⟳ Initializing...",
      "├─ Validating credentials",
      "├─ Generating card",
      "├─ Encrypting metadata",
      "└─ Broadcasting to Solana",
      "...",
      "✓ Card issued successfully",
      `Card ID: ${example.cardId}`,
      "Status: ACTIVE",
      `Balance: ${example.amount}`,
      "> _",
    ]

    setLines([])
    let currentLine = 0

    const interval = setInterval(() => {
      if (currentLine < fullLines.length) {
        setLines((prev) => [...prev, fullLines[currentLine]])
        currentLine++
      } else {
        // Move to next example after delay
        setTimeout(() => {
          setCurrentExample((prev) => (prev + 1) % examples.length)
        }, 2000)
        clearInterval(interval)
      }
    }, 300)

    return () => clearInterval(interval)
  }, [currentExample])

  return (
    <div className="bg-black/60 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm hover:border-primary/20 transition-all duration-300 shadow-2xl shadow-primary/10">
      <div className="bg-gradient-to-r from-black/80 to-black/40 border-b border-white/5 px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
        </div>
        <span className="text-xs text-muted-foreground ml-2">privatepay-cli</span>
      </div>
      <div className="p-8 font-mono text-sm space-y-2 min-h-80 overflow-hidden">
        {lines.map((line, i) => {
          if (!line) return null
          let color = "text-white/60"
          if (line.startsWith("$")) color = "text-green-400"
          else if (line.includes("Initializing") || line.includes("⟳")) color = "text-cyan-400 animate-pulse"
          else if (line.includes("✓")) color = "text-green-400 font-semibold"
          else if (line.includes("Card ID") || line.includes("Status") || line.includes("Balance")) color = "text-yellow-300"
          else if (line === "> _") color = "text-white/40 animate-pulse"

          return (
            <div key={i} className={color}>
              {line}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HomeContent() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState(user ? "dashboard" : "landing")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")

  // If user is logged in and tries to access landing, check if they want dashboard
  const handleIssueCards = () => {
    if (user) {
      setActiveTab("issuing")
    } else {
      setAuthMode("signup")
      setShowAuthModal(true)
    }
  }

  const handleLogin = () => {
    setAuthMode("login")
    setShowAuthModal(true)
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    setActiveTab("issuing")
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {activeTab === "landing" && (
        <LandingPage 
          setActiveTab={setActiveTab} 
          onIssueCards={handleIssueCards}
          onLogin={handleLogin}
          user={user}
        />
      )}
      {activeTab === "issuing" && user && (
        <IssueCardFlow 
          onBack={() => setActiveTab("landing")}
          onSuccess={() => setActiveTab("dashboard")}
        />
      )}
      {activeTab === "dashboard" && user && (
        <UserDashboard 
          onBack={() => setActiveTab("landing")}
          onCreateCard={() => setActiveTab("issuing")}
          onAdmin={user.email === "shaann950@gmail.com" ? () => setActiveTab("admin") : undefined}
          onReferrals={() => setActiveTab("referrals")}
        />
      )}
      {activeTab === "referrals" && user && (
        <ReferralDashboard onBack={() => setActiveTab("dashboard")} />
      )}
      {activeTab === "wallet" && <WalletPage setActiveTab={setActiveTab} />}
      {activeTab === "admin" && user && (
        <AdminLiveDashboard 
          onBack={() => setActiveTab("dashboard")}
          userEmail={user.email}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        defaultMode={authMode}
      />

      {/* AI Chat Agent - only for logged-in users */}
      {user && <ChatWidget userName={user.name || user.email} />}
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  )
}

interface LandingPageProps {
  setActiveTab: (tab: string) => void
  onIssueCards: () => void
  onLogin: () => void
  user: { id: string; email: string; name: string } | null
}

function LandingPage({ setActiveTab, onIssueCards, onLogin, user }: LandingPageProps) {
  useScrollAnimation()
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-background/80">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Premium Navigation */}
      <nav className="border-b border-border/50 bg-card/40 backdrop-blur-xl sticky top-0 z-50 bg-white/5 border border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary/50 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/20">
              <Eye className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">PrivatePay</span>
              <p className="text-xs text-muted-foreground">Payment Infrastructure</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <a
              href="https://t.me/PrivatePayOfficial"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-primary/10 transition-all hover:scale-110 duration-200"
            >
              <svg className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.42 0-.328-.149-.46-.528l-1.04-3.41-2.99-.924c-.648-.204-.658-.682.14-1.019l11.65-4.495c.54-.22.895.12.74.91z" />
              </svg>
            </a>
            <a
              href="https://x.com/Privatepay_"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-primary/10 transition-all hover:scale-110 duration-200"
            >
              <svg className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308L6.883 4.03H5.09l12.06 14.72z" />
              </svg>
            </a>
            {user ? (
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                onClick={() => setActiveTab("dashboard")}
              >
                My Dashboard
              </Button>
            ) : (
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                onClick={onLogin}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl mx-auto space-y-8 text-center">
          {/* Main heading with gradient */}
          <div className="space-y-4 animate-slide-up">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">Privacy</span> meets payment
              <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">infrastructure</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
              Issue branded crypto cards, manage private wallets, and execute anonymous DeFi swaps. All powered by PrivatePay's open API on Solana.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary hover:shadow-xl hover:shadow-primary/40 text-primary-foreground group font-semibold transition-all duration-300 border border-primary/30"
              onClick={onIssueCards}
            >
              Issue Cards
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              className="bg-card/50 hover:bg-card border border-primary/30 text-foreground group font-semibold transition-all duration-300 backdrop-blur hover:shadow-lg hover:shadow-primary/20"
              onClick={() => window.open("https://www.privatetransfer.site", "_blank")}
            >
              Private Transfer
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              className="bg-card/50 hover:bg-card border border-primary/30 text-foreground group font-semibold transition-all duration-300 backdrop-blur hover:shadow-lg hover:shadow-primary/20"
              onClick={() => window.open("/shop", "_blank")}
            >
              PrivateShop
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              className="bg-card/50 hover:bg-card border border-primary/30 text-foreground group font-semibold transition-all duration-300 backdrop-blur hover:shadow-lg hover:shadow-primary/20"
              onClick={() => window.open("https://privategiftcards.vercel.app/", "_blank")}
            >
              PrivateGifts
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              className="bg-card/50 hover:bg-card border border-primary/30 text-foreground group font-semibold transition-all duration-300 backdrop-blur hover:shadow-lg hover:shadow-primary/20"
              onClick={() => window.open("https://www.privatesim.site/", "_blank")}
            >
              PrivateSim
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-xl hover:shadow-violet-500/40 text-white group font-semibold transition-all duration-300 border border-violet-500/30"
              onClick={() => window.open("/bridge", "_blank")}
            >
              PrivateBridge
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:shadow-xl hover:shadow-emerald-500/40 text-white group font-semibold transition-all duration-300 border border-emerald-500/30"
              onClick={() => window.open("/developers", "_blank")}
            >
              API for Developers
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Feature grid */}
          <div className="grid md:grid-cols-3 gap-4 pt-16 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            {[
              {
                icon: CreditCard,
                title: "Card Issuance",
                description: "Issue virtual cards under your brand with full control",
              },
              {
                icon: Wallet,
                title: "Wallet Management",
                description: "Manage private wallets and execute DeFi swaps",
              },
              {
                icon: Shield,
                title: "Privacy First",
                description: "Built on privacy-preserving technology from day one",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300 hover:bg-white/10 hover:border-white/20 group p-6 rounded-2xl cursor-pointer"
              >
                {React.createElement(feature.icon, { className: "w-8 h-8 text-primary mb-4" })}
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Card Showcase Section */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            {/* Left: Bold Headline */}
            <div className="space-y-4 animate-slide-up">
              <h2 className="text-5xl md:text-6xl font-black leading-tight">
                <span className="text-white">Instant</span>
                <br />
                <span className="text-white">cards</span>
                <br />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">funded by</span>
                <br />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Solana</span>
              </h2>
            </div>

            {/* Center: Card Visual with Hand */}
            <div className="relative h-96 flex items-center justify-center animate-float">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-3xl"></div>
              
              {/* Premium Card */}
              <div className="relative z-10 w-80 h-48 bg-gradient-to-br from-slate-800/80 via-slate-900/80 to-black/80 border border-white/15 rounded-3xl shadow-2xl shadow-primary/30 backdrop-blur-xl flex flex-col justify-between p-8 group hover:shadow-primary/50 transition-all duration-300">
                {/* Card Header with Logo and Text */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-6 h-6 text-primary" />
                    <span className="text-white font-bold tracking-widest text-sm">PRIVATEPAY</span>
                  </div>
                </div>

                {/* Card Middle - Chip */}
                <div className="flex justify-center">
                  <div className="w-14 h-10 bg-gradient-to-br from-yellow-400/40 to-yellow-600/40 border border-yellow-400/50 rounded-lg shadow-lg flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="w-2 h-2 bg-yellow-300/60 rounded-sm"></div>
                      <div className="w-2 h-2 bg-yellow-300/60 rounded-sm"></div>
                      <div className="w-2 h-2 bg-yellow-300/60 rounded-sm"></div>
                      <div className="w-2 h-2 bg-yellow-300/60 rounded-sm"></div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">Cardholder</p>
                    <p className="text-white/80 font-semibold text-sm">YOUR NAME</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/50 uppercase tracking-wider">Valid Thru</p>
                    <p className="text-white/80 font-mono text-sm">12/30</p>
                  </div>
                </div>
              </div>

              {/* Hand silhouette effect */}
              <div className="absolute -top-20 -left-10 w-48 h-48 bg-black/40 rounded-full blur-3xl -z-0"></div>
            </div>

            {/* Right: Supporting Text */}
            <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div>
                <p className="text-xl md:text-2xl font-semibold text-white/80 leading-tight">
                  fast
                  <br />
                  <span className="text-white/60">crypto</span>
                  <br />
                  <span className="text-white/40">spending</span>
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-white">Zero KYC Required</p>
                    <p className="text-sm text-muted-foreground">Complete privacy for all transactions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-white">Powered by Solana</p>
                    <p className="text-sm text-muted-foreground">Lightning-fast blockchain execution</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-white">Instant Activation</p>
                    <p className="text-sm text-muted-foreground">Start spending in seconds</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <p className="text-lg text-muted-foreground mb-4">Spend with PrivatePay Cards</p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary hover:shadow-xl hover:shadow-primary/40 text-primary-foreground group font-semibold transition-all duration-300 border border-primary/30"
              onClick={() => setActiveTab("issuing")}
            >
              Get Your Card Now
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: CreditCard,
                title: "Card Activation",
                description: "Get your card starting from $30 Platinum card",
              },
              {
                icon: Zap,
                title: "Solana Top Ups",
                description: "Top up your card using SOL in seconds. No banks. No delays. Just crypto.",
              },
              {
                icon: Wallet,
                title: "Apple Pay & Google Pay",
                description: "Add your card to Apple Pay or Google Pay and pay directly from your phone.",
              },
              {
                icon: Shield,
                title: "Minimal Fees",
                description: "Clear pricing and low fees. No hidden charges or subscriptions.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex gap-6 p-8 rounded-xl border border-border/50 bg-card/30 hover:bg-card/50 transition-colors animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 border border-primary/20">
                    {React.createElement(feature.icon, { className: "h-6 w-6 text-primary" })}
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Card Features Section */}
      <section className="py-16 sm:py-20 px-4 border-t border-border/50" data-scroll-animation="scroll-animate">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Card Features</h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground px-2">Everything you need in a premium virtual card</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* 3DS Secure */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl">🔒</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">3DS Secure</h3>
              <p className="text-sm sm:text-base text-gray-400">Full 3D Secure authentication for safe online transactions worldwide</p>
            </div>

            {/* Apple Pay */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl">🍎</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Apple Pay</h3>
              <p className="text-sm sm:text-base text-gray-400">Add your card to Apple Pay and pay contactlessly from your iPhone or Apple Watch</p>
            </div>

            {/* Google Pay */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl">📱</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Google Pay</h3>
              <p className="text-sm sm:text-base text-gray-400">Seamlessly add to Google Pay for fast and secure payments on Android devices</p>
            </div>

            {/* $1M/Year */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl">💰</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">$1M / Year</h3>
              <p className="text-sm sm:text-base text-gray-400">Up to $1,000,000 annual spending limit for high-volume business and personal use</p>
            </div>

            {/* Ads Spend */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl">📢</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Ads Spend</h3>
              <p className="text-sm sm:text-base text-gray-400">Perfect for Facebook, Google, TikTok ads and all major advertising platforms</p>
            </div>

            {/* Global Acceptance */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl">🌍</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Global Acceptance</h3>
              <p className="text-sm sm:text-base text-gray-400">Accepted at millions of merchants worldwide wherever Visa is supported</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Premium? Section */}
      <section className="py-16 sm:py-20 px-4 border-t border-border/50" data-scroll-animation="scroll-animate">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Why Premium?</h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground px-2">Built for power users who demand the best</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Valid 3 Years */}
            <div className="flex items-start gap-4 p-6 sm:p-8 rounded-xl border border-border/50 bg-card/30 hover:bg-card/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-lg">✅</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Valid 3 Years</h3>
                <p className="text-sm sm:text-base text-gray-400">No monthly fees, no renewal hassle — your card stays active for 3 full years</p>
              </div>
            </div>

            {/* High Spend Limits */}
            <div className="flex items-start gap-4 p-6 sm:p-8 rounded-xl border border-border/50 bg-card/30 hover:bg-card/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-lg">✅</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">High Spend Limits</h3>
                <p className="text-sm sm:text-base text-gray-400">Designed for ads & business — spend up to $1M/year with no arbitrary caps</p>
              </div>
            </div>

            {/* Apple Pay & Google Pay Ready */}
            <div className="flex items-start gap-4 p-6 sm:p-8 rounded-xl border border-border/50 bg-card/30 hover:bg-card/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-lg">✅</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">Apple Pay & Google Pay Ready</h3>
                <p className="text-sm sm:text-base text-gray-400">Instantly add to your mobile wallet and pay anywhere with a tap</p>
              </div>
            </div>

            {/* 3DS Secure Payments */}
            <div className="flex items-start gap-4 p-6 sm:p-8 rounded-xl border border-border/50 bg-card/30 hover:bg-card/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-lg">✅</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">3DS Secure Payments</h3>
                <p className="text-sm sm:text-base text-gray-400">Every transaction is protected with 3D Secure authentication for maximum safety</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Terminal Demo Section */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Watch It In Action</h2>
          </div>

          <AnimatedTerminal />
        </div>
      </section>

      {/* Premium Feature Showcase Card */}
      <section className="py-16 sm:py-20 px-4 border-t border-border/50" data-scroll-animation="scroll-animate">
        <div className="max-w-5xl mx-auto">
          <div className="bg-black rounded-2xl sm:rounded-3xl lg:rounded-4xl p-6 sm:p-10 md:p-16 lg:p-20 border border-purple-500/30 shadow-2xl" style={{ boxShadow: '0 0 60px rgba(168, 85, 247, 0.3), 0 0 30px rgba(168, 85, 247, 0.2)' }}>
            <div className="max-w-2xl">
              {/* Star Rating */}
              <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-12">
                <div className="flex gap-1">
                  <span className="text-2xl sm:text-3xl text-yellow-400">★</span>
                  <span className="text-2xl sm:text-3xl text-yellow-400">★</span>
                  <span className="text-2xl sm:text-3xl text-yellow-400">★</span>
                  <span className="text-2xl sm:text-3xl text-yellow-400">★</span>
                  <span className="text-2xl sm:text-3xl text-yellow-400">★</span>
                </div>
                <div>
                  <p className="text-sm sm:text-base text-gray-400">fast and seamless experience</p>
                  <p className="text-xs sm:text-sm text-gray-500">average user rating</p>
                </div>
              </div>

              {/* Stats Grid - Responsive */}
              <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-12">
                <div className="text-center">
                  <p className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-1 sm:mb-2 break-words">{'< 2'}</p>
                  <p className="text-xs sm:text-sm lg:text-base font-semibold text-white">min</p>
                  <p className="text-xs text-gray-500 mt-1">card issuance</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-1 sm:mb-2">≡</p>
                  <p className="text-xs sm:text-sm lg:text-base font-semibold text-white">SOL</p>
                  <p className="text-xs text-gray-500 mt-1">instant top ups</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-1 sm:mb-2">⊕</p>
                  <p className="text-xs sm:text-sm lg:text-base font-semibold text-white">Global</p>
                  <p className="text-xs text-gray-500 mt-1">online payments</p>
                </div>
              </div>

              {/* Main CTA Section */}
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-3 sm:mb-6">
                    A faster way to get a card
                  </h2>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-400 leading-relaxed">
                    Open a virtual card instantly and fund it with Solana. Your balance is ready for payments right after activation.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="bg-white hover:bg-gray-100 text-black font-semibold rounded-full px-6 sm:px-10 py-2 sm:py-3 text-sm sm:text-base w-fit"
                >
                  Get card
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose PrivatePay Section */}
      <section className="py-20 px-4 border-t border-border/50" data-scroll-animation="scroll-animate">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Why Choose PrivatePay?</h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground px-2">Experience the future of digital banking with instant cards and complete privacy</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Card 1: Privacy First Banking */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Privacy First Banking</h3>
              <p className="text-sm sm:text-base text-gray-400">No KYC required. Your privacy is our priority with instant non-KYC virtual cards</p>
            </div>

            {/* Card 2: Cards in 1 Minute */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl">⚡</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Cards in Less than 1 Minute</h3>
              <p className="text-sm sm:text-base text-gray-400">Create your virtual card instantly - no waiting, no paperwork, just instant access</p>
            </div>

            {/* Card 3: Accepted Worldwide */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 hover:border-primary/40 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl">🌍</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Accepted Worldwide</h3>
              <p className="text-sm sm:text-base text-gray-400">Use your PrivatePay card anywhere Visa and Mastercard are accepted globally</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Fees Section */}
      <section className="py-16 sm:py-20 px-4 border-t border-border/50" data-scroll-animation="scroll-animate">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-4 mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Transparent Pricing</h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground px-2">Clear, competitive fees with no hidden charges</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Transaction Fees */}
            <div className="bg-black/50 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 sm:space-y-6">
              <h3 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">💳</span>
                <span>Transaction Fees</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 pb-4 border-b border-gray-700">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm sm:text-base">Purchase (Online & In-Store)</p>
                    <p className="text-xs sm:text-sm text-gray-400">Displayed at checkout</p>
                  </div>
                  <p className="font-bold text-primary text-sm sm:text-base whitespace-nowrap">Price</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 pb-4 border-b border-gray-700">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm sm:text-base">Same Currency</p>
                    <p className="text-xs sm:text-sm text-gray-400">Domestic transactions</p>
                  </div>
                  <p className="font-bold text-green-400 text-sm sm:text-base whitespace-nowrap">Free</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm sm:text-base">Foreign Transaction Fee</p>
                    <p className="text-xs sm:text-sm text-gray-400">International transactions</p>
                  </div>
                  <p className="font-bold text-orange-400 text-sm sm:text-base whitespace-nowrap">0.5% + 1.5%</p>
                </div>
              </div>
            </div>

            {/* Refund & Support Fees */}
            <div className="bg-black/50 rounded-lg border border-primary/20 p-6 sm:p-8 space-y-4 sm:space-y-6">
              <h3 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">↩️</span>
                <span>Refund Fees</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 pb-4 border-b border-gray-700">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm sm:text-base">Domestic Purchase Reversal</p>
                    <p className="text-xs sm:text-sm text-gray-400">Returned or reversed</p>
                  </div>
                  <p className="font-bold text-blue-400 text-sm sm:text-base whitespace-nowrap">$0.20</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 pb-4 border-b border-gray-700">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm sm:text-base">International Purchase Reversal</p>
                    <p className="text-xs sm:text-sm text-gray-400">Returned or reversed</p>
                  </div>
                  <p className="font-bold text-blue-400 text-sm sm:text-base whitespace-nowrap">$0.75</p>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4 sm:mt-6">
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">🌍</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm sm:text-base">Global Coverage</p>
                      <p className="text-xs sm:text-sm text-gray-400">Cards supported in 180+ countries worldwide</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto text-center space-y-6 px-4" data-scroll-animation="scroll-animate-scale">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Privacy First,</h2>
          </div>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">No KYC Required</h3>
        </div>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          No KYC verification required. Your privacy is protected with end-to-end encryption, non-custodial architecture, and anonymous transactions – enjoy true financial freedom without compromising your personal data.
        </p>
        <div className="pt-4 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          {["End-to-End Encryption", "Non-Custodial", "Anonymous Transactions", "Zero KYC"].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm font-medium whitespace-nowrap"
            >
              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Referral Program & Leaderboard Section */}
      <PublicReferralSection onLogin={onLogin} user={user} />

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-secondary/50 flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-white">PrivatePay</span>
          </div>
          <p>© {new Date().getFullYear()} PrivatePay. Privacy-first digital banking.</p>
        </div>
      </footer>
    </div>
  )
}

// Public Referral Program & Leaderboard — visible on landing page without login
function PublicReferralSection({ onLogin, user }: { onLogin: () => void; user: { id: string; email: string; name: string } | null }) {
  const [leaderboard, setLeaderboard] = useState<Array<{
    rank: number
    displayName: string
    points: number
    earnings: number
    cardsReferred: number
  }>>([])
  const [stats, setStats] = useState<{ totalReferrers: number; totalEarnings: number; totalCards: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/referral/leaderboard")
      .then(res => res.json())
      .then(data => {
        if (data.leaderboard) setLeaderboard(data.leaderboard)
        if (data.totalStats) setStats({
          totalReferrers: data.totalStats.activeReferrers || 0,
          totalEarnings: data.totalStats.totalEarnings || 0,
          totalCards: data.totalStats.totalCardsReferred || 0,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const rankBadge = (rank: number) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return `#${rank}`
  }

  return (
    <section className="py-16 sm:py-24 px-4 border-t border-border/50" data-scroll-animation="scroll-animate">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-medium mb-4">
            <span>🎁</span>
            <span>Referral Rewards Program</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400">$5 Per Referral</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            Share PrivatePay with friends. When they create their first card, you earn <strong className="text-white">$5 cash reward</strong> + <strong className="text-yellow-400">10 points</strong> instantly.
          </p>
        </div>

        {/* How It Works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
          <div className="text-center space-y-3 p-6 rounded-xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center mx-auto text-2xl">
              1️⃣
            </div>
            <h3 className="text-lg font-bold text-white">Sign Up & Get Code</h3>
            <p className="text-sm text-gray-400">Create your PrivatePay account and get a unique referral code instantly</p>
          </div>
          <div className="text-center space-y-3 p-6 rounded-xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center mx-auto text-2xl">
              2️⃣
            </div>
            <h3 className="text-lg font-bold text-white">Share With Friends</h3>
            <p className="text-sm text-gray-400">Share your link on Twitter, Telegram, or directly — anyone can use it</p>
          </div>
          <div className="text-center space-y-3 p-6 rounded-xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 flex items-center justify-center mx-auto text-2xl">
              3️⃣
            </div>
            <h3 className="text-lg font-bold text-white">Earn Rewards</h3>
            <p className="text-sm text-gray-400">Get $5 + 10 points when your referral creates their first card</p>
          </div>
        </div>

        {/* Community Stats */}
        {stats && (stats.totalReferrers > 0 || stats.totalCards > 0) && (
          <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
            <div className="text-center p-4 sm:p-6 rounded-xl bg-black/50 border border-primary/20">
              <p className="text-2xl sm:text-4xl font-bold text-white">{stats.totalReferrers}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Active Referrers</p>
            </div>
            <div className="text-center p-4 sm:p-6 rounded-xl bg-black/50 border border-primary/20">
              <p className="text-2xl sm:text-4xl font-bold text-green-400">${stats.totalEarnings.toFixed(0)}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Total Earned</p>
            </div>
            <div className="text-center p-4 sm:p-6 rounded-xl bg-black/50 border border-primary/20">
              <p className="text-2xl sm:text-4xl font-bold text-yellow-400">{stats.totalCards}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Cards Referred</p>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-black/60 rounded-2xl border border-primary/20 overflow-hidden" style={{ boxShadow: '0 0 40px rgba(168, 85, 247, 0.1)' }}>
          <div className="px-6 py-5 border-b border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Top Referrers</h3>
                <p className="text-xs sm:text-sm text-gray-400">Live community leaderboard</p>
              </div>
            </div>
            {!user && (
              <Button
                onClick={onLogin}
                size="sm"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold rounded-full px-4 sm:px-6"
              >
                Join Now
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <span className="text-4xl">🚀</span>
              <p className="text-lg font-semibold text-white">Be the First!</p>
              <p className="text-sm text-gray-400">No referrals yet — start referring friends and claim the #1 spot</p>
              {!user && (
                <Button
                  onClick={onLogin}
                  className="mt-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold rounded-full px-8"
                >
                  Sign Up & Start Earning
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {leaderboard.slice(0, 10).map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/5 ${
                    entry.rank <= 3 ? "bg-gradient-to-r from-yellow-500/5 to-transparent" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      entry.rank === 1
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black"
                        : entry.rank === 2
                        ? "bg-gradient-to-br from-gray-300 to-gray-400 text-black"
                        : entry.rank === 3
                        ? "bg-gradient-to-br from-orange-400 to-orange-600 text-black"
                        : "bg-gray-800 text-gray-400"
                    }`}>
                      {entry.rank <= 3 ? rankBadge(entry.rank) : entry.rank}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm sm:text-base">{entry.displayName}</p>
                      <p className="text-xs text-gray-500">{entry.cardsReferred} card{entry.cardsReferred !== 1 ? "s" : ""} referred</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-400 text-sm sm:text-base">{entry.points} pts</p>
                    <p className="text-xs text-green-400">${entry.earnings.toFixed(2)} earned</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA at bottom */}
          {!user && leaderboard.length > 0 && (
            <div className="px-6 py-5 border-t border-primary/20 bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">Ready to start earning?</p>
                  <p className="text-sm text-gray-400">Sign up now and get your unique referral code</p>
                </div>
                <Button
                  onClick={onLogin}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold rounded-full px-8 whitespace-nowrap"
                >
                  🎁 Start Referring
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function IssuingPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setActiveTab("landing")} className="gap-2">
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Create Card</h1>
          <div />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <CardPurchase />
      </main>
    </div>
  )
}

function PaymentPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setActiveTab("landing")} className="gap-2">
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back
          </Button>
          <h1 className="text-xl font-bold">Create Card</h1>
          <div />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <CardPurchase />
      </main>
    </div>
  )
}

function WalletPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [swapLoading, setSwapLoading] = useState(false)
  const [swapResult, setSwapResult] = useState<{ hash: string; timestamp: string } | null>(null)
  const [swapError, setSwapError] = useState<string | null>(null)

  const handleZKSwap = async () => {
    setSwapLoading(true)
    setSwapError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSwapResult({
        hash: `zk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setSwapError("Failed to execute ZK swap")
    } finally {
      setSwapLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("landing")}>
              ← Back
            </Button>
            <h1 className="text-2xl font-bold">Crypto Wallet</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-12 space-y-8">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-2xl animate-glow"></div>
          <Card className="relative border-primary/20 bg-gradient-to-br from-primary/10 to-card/50 p-8 rounded-2xl">
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-muted-foreground text-sm mb-2">Account Balance</p>
                <h2 className="text-4xl font-bold text-primary">$0.00</h2>
              </div>
              <Wallet className="w-8 h-8 text-primary/60" />
            </div>
            <div className="flex gap-4">
              <Button className="bg-primary hover:bg-primary/90">Deposit</Button>
              <Button variant="outline" className="border-primary/30 bg-transparent">
                Withdraw
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-bold">Account Statistics</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/30 p-6 space-y-2">
              <p className="text-sm text-muted-foreground">Cards Issued</p>
              <h3 className="text-3xl font-bold">0</h3>
            </Card>
            <Card className="border-border/50 bg-card/30 p-6 space-y-2">
              <p className="text-sm text-muted-foreground">Total Volume</p>
              <h3 className="text-3xl font-bold">$0.00M</h3>
            </Card>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">Private ZK Swaps</h3>
          </div>
          <p className="text-muted-foreground">Exchange assets anonymously using zero-knowledge proofs</p>

          {swapError && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{swapError}</p>
            </div>
          )}

          {swapResult && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm text-primary">ZK Swap completed! Hash: {swapResult.hash.slice(0, 20)}...</p>
            </div>
          )}

          <Button onClick={handleZKSwap} disabled={swapLoading} className="w-full bg-primary hover:bg-primary/90">
            {swapLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              "Execute ZK Swap"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface AdminStats {
  totalCards: number
  activeCards: number
  frozenCards: number
  pendingCards: number
  totalUsers: number
  totalDepositVolumeUsd: number
  totalDepositVolumeSol: number
  issuanceVolumeUsd: number
  topupVolumeUsd: number
  totalCardBalance: number
  pendingPayments: number
  todayCards: number
  todayVolumeUsd: number
  totalCompletedPayments: number
  recentPayments: {
    id: string
    amountUsd: number
    amountSol: number
    cardType: string
    nameOnCard: string | null
    createdAt: string
    user: { email: string; name: string }
  }[]
}

interface PendingCardInfo {
  id: string
  nameOnCard: string
  balance: number
  createdAt: string
  user: { id: string; email: string; name: string | null }
  payment: {
    id: string
    amountUsd: number
    amountSol: number
    topupAmount: number | null
    txSignature: string | null
    createdAt: string
  } | null
}

function AdminLiveDashboard({ onBack, userEmail }: { onBack: () => void; userEmail: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [pendingCards, setPendingCards] = useState<PendingCardInfo[]>([])
  const [kripiCardInputs, setKripiCardInputs] = useState<Record<string, string>>({})
  const [assigningCardId, setAssigningCardId] = useState<string | null>(null)
  const [assignMessage, setAssignMessage] = useState<{ cardId: string; type: "success" | "error"; text: string } | null>(null)
  const [pendingPayments, setPendingPayments] = useState<Array<{
    id: string; userId: string; userEmail: string; userName: string;
    amountUsd: number; amountSol: number; topupAmount: number | null;
    status: string; cardType: string; nameOnCard: string | null;
    txSignature: string | null; createdAt: string; expiresAt: string;
  }>>([])
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null)
  const [verifyMessage, setVerifyMessage] = useState<{ id: string; type: "success" | "error"; text: string } | null>(null)

  const ADMIN_EMAILS = ["shaann950@gmail.com"]
  const isAdmin = ADMIN_EMAILS.includes(userEmail)

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats")
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error("Failed to fetch admin stats:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingCards = async () => {
    try {
      const res = await fetch("/api/admin/assign-card")
      const data = await res.json()
      setPendingCards(data.cards || [])
    } catch (err) {
      console.error("Failed to fetch pending cards:", err)
    }
  }

  const fetchPendingPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments/verify")
      const data = await res.json()
      setPendingPayments(data.payments || [])
    } catch (err) {
      console.error("Failed to fetch pending payments:", err)
    }
  }

  const verifyPayment = async (paymentId: string) => {
    setVerifyingPaymentId(paymentId)
    setVerifyMessage(null)
    try {
      const res = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setVerifyMessage({ id: paymentId, type: "error", text: data.error || "Failed to verify" })
        return
      }
      setVerifyMessage({ id: paymentId, type: "success", text: data.message || "✅ Verified!" })
      setTimeout(() => {
        setPendingPayments(prev => prev.filter(p => p.id !== paymentId))
        fetchPendingCards()
        fetchStats()
        setVerifyMessage(null)
      }, 2000)
    } catch {
      setVerifyMessage({ id: paymentId, type: "error", text: "Network error" })
    } finally {
      setVerifyingPaymentId(null)
    }
  }

  const assignCard = async (cardId: string) => {
    const kripiCardId = kripiCardInputs[cardId]?.trim()
    if (!kripiCardId) {
      setAssignMessage({ cardId, type: "error", text: "Please enter a KripiCard ID" })
      return
    }
    setAssigningCardId(cardId)
    setAssignMessage(null)
    try {
      const res = await fetch("/api/admin/assign-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, kripiCardId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAssignMessage({ cardId, type: "error", text: data.error || "Failed to assign" })
        return
      }
      setAssignMessage({ cardId, type: "success", text: `✅ Assigned! Status: ${data.card?.status}` })
      setKripiCardInputs(prev => { const n = { ...prev }; delete n[cardId]; return n })
      setTimeout(() => { fetchPendingCards(); fetchStats(); setAssignMessage(null) }, 2000)
    } catch {
      setAssignMessage({ cardId, type: "error", text: "Network error" })
    } finally {
      setAssigningCardId(null)
    }
  }

  useEffect(() => {
    if (!isAdmin) return
    fetchStats()
    fetchPendingCards()
    fetchPendingPayments()
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin || !autoRefresh) return
    const interval = setInterval(() => { fetchStats(); fetchPendingCards(); fetchPendingPayments() }, 10000)
    return () => clearInterval(interval)
  }, [isAdmin, autoRefresh])

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You don&apos;t have admin access.</p>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    )
  }

  const formatUsd = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(2)}`
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              {/* Live Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-xs font-medium text-green-400">LIVE</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} style={autoRefresh ? { animationDuration: "3s" } : {}} />
              {autoRefresh ? "Auto 10s" : "Paused"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-6">
        {loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <>
            {/* Top Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Cards */}
              <Card className="p-5 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Total Cards</p>
                  <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-purple-400">{stats.totalCards}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activeCards} active · {stats.frozenCards} frozen{stats.pendingCards > 0 ? ` · ${stats.pendingCards} pending` : ""}
                </p>
              </Card>

              {/* Total Deposit Volume */}
              <Card className="p-5 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Deposit Volume</p>
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400">{formatUsd(stats.totalDepositVolumeUsd)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalDepositVolumeSol.toFixed(4)} SOL total
                </p>
              </Card>

              {/* Total Users */}
              <Card className="p-5 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <User className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-3xl font-bold text-cyan-400">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalCompletedPayments} completed payments
                </p>
              </Card>

              {/* Total Card Balance */}
              <Card className="p-5 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Cards Balance</p>
                  <Wallet className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-yellow-400">{formatUsd(stats.totalCardBalance)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  across all cards
                </p>
              </Card>
            </div>

            {/* Today's Stats */}
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold">Today&apos;s Activity</h2>
                </div>
                <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs text-green-400">Live</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Cards Created Today</p>
                  <p className="text-2xl font-bold">{stats.todayCards}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today&apos;s Volume</p>
                  <p className="text-2xl font-bold text-green-400">{formatUsd(stats.todayVolumeUsd)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issuance Volume</p>
                  <p className="text-2xl font-bold text-purple-400">{formatUsd(stats.issuanceVolumeUsd)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Topup Volume</p>
                  <p className="text-2xl font-bold text-cyan-400">{formatUsd(stats.topupVolumeUsd)}</p>
                </div>
              </div>
              {stats.pendingPayments > 0 && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400">{stats.pendingPayments} payment(s) pending confirmation</span>
                </div>
              )}
            </Card>

            {/* Pending Payments — Admin can verify manually */}
            {pendingPayments.length > 0 && (
              <Card className="p-6 bg-gradient-to-r from-orange-500/5 to-red-500/5 border-orange-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    <h2 className="text-lg font-bold">Pending Payments ({pendingPayments.length})</h2>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Users who paid but verification failed. Click &quot;Verify &amp; Issue Card&quot; to manually approve.
                </p>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {pendingPayments.map((p) => (
                    <div key={p.id} className="p-4 rounded-lg bg-card/50 border border-border/30">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              p.status === "PENDING" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"
                            }`}>{p.status}</span>
                            <span className="text-sm font-bold">{p.userName || p.userEmail}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.cardType === "issue" ? "New Card" : "Topup"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>📧 {p.userEmail}</p>
                            <p>💰 ${p.amountUsd.toFixed(2)} ({p.amountSol.toFixed(4)} SOL)
                              {p.topupAmount && <span> · Topup: ${p.topupAmount.toFixed(2)}</span>}
                            </p>
                            {p.nameOnCard && <p>👤 {p.nameOnCard}</p>}
                            {p.txSignature && (
                              <p>🔗 TX: <a href={`https://solscan.io/tx/${p.txSignature}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{p.txSignature.slice(0, 24)}...</a></p>
                            )}
                            <p className="font-mono text-[10px] opacity-60">ID: {p.id}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => verifyPayment(p.id)}
                          disabled={verifyingPaymentId === p.id}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 whitespace-nowrap shrink-0"
                        >
                          {verifyingPaymentId === p.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>✅ Verify & Issue Card</>
                          )}
                        </Button>
                      </div>
                      {verifyMessage?.id === p.id && (
                        <div className={`mt-2 text-sm px-3 py-2 rounded ${
                          verifyMessage.type === "success"
                            ? "bg-green-500/10 text-green-400 border border-green-500/30"
                            : "bg-red-500/10 text-red-400 border border-red-500/30"
                        }`}>
                          {verifyMessage.text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Pending Card Assignments */}
            <Card className="p-6 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border-yellow-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <h2 className="text-lg font-bold">Pending Card Assignments ({pendingCards.length})</h2>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://kripicard.com", "_blank")}
                    className="text-xs"
                  >
                    Open KripiCard Dashboard →
                  </Button>
                </div>
                {pendingCards.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">These users have paid. Create their card on KripiCard dashboard, then paste the Card ID below.</p>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {pendingCards.map((card) => (
                        <div key={card.id} className="p-4 rounded-lg bg-card/50 border border-border/30">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">PENDING</span>
                                <span className="text-sm font-bold">{card.nameOnCard}</span>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>📧 {card.user?.email || "Unknown"}</p>
                                <p>💰 Balance: <span className="text-primary font-medium">${card.balance.toFixed(2)}</span></p>
                                {card.payment && (
                                  <>
                                    <p>💳 Paid: ${card.payment.amountUsd.toFixed(2)} ({card.payment.amountSol.toFixed(4)} SOL)</p>
                                    {card.payment.txSignature && (
                                      <p>🔗 TX: <a href={`https://solscan.io/tx/${card.payment.txSignature}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{card.payment.txSignature.slice(0, 24)}...</a></p>
                                    )}
                                  </>
                                )}
                                <p>🕐 {new Date(card.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                              <input
                                placeholder="KripiCard ID (e.g. C260...)"
                                value={kripiCardInputs[card.id] || ""}
                                onChange={(e) => setKripiCardInputs(prev => ({ ...prev, [card.id]: e.target.value }))}
                                className="text-sm px-3 py-2 rounded-lg bg-background border border-border/50 focus:border-primary outline-none min-w-[200px]"
                                disabled={assigningCardId === card.id}
                              />
                              <Button
                                onClick={() => assignCard(card.id)}
                                disabled={assigningCardId === card.id || !kripiCardInputs[card.id]?.trim()}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                              >
                                {assigningCardId === card.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>✅ Assign</>
                                )}
                              </Button>
                            </div>
                          </div>
                          {assignMessage?.cardId === card.id && (
                            <div className={`mt-2 text-sm px-3 py-2 rounded ${
                              assignMessage.type === "success" 
                                ? "bg-green-500/10 text-green-400 border border-green-500/30" 
                                : "bg-red-500/10 text-red-400 border border-red-500/30"
                            }`}>
                              {assignMessage.text}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-green-400 font-medium">✅ No pending card requests</p>
                    <p className="text-xs text-muted-foreground mt-1">When a user pays for a new card, it will appear here for you to assign.</p>
                  </div>
                )}
              </Card>

            {/* Volume Breakdown */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6 border-border/50">
                <h3 className="text-lg font-bold mb-4">Volume Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm">Card Issuance</span>
                    </div>
                    <span className="font-bold text-purple-400">{formatUsd(stats.issuanceVolumeUsd)}</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.totalDepositVolumeUsd > 0 ? (stats.issuanceVolumeUsd / stats.totalDepositVolumeUsd) * 100 : 0}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                      <span className="text-sm">Card Topups</span>
                    </div>
                    <span className="font-bold text-cyan-400">{formatUsd(stats.topupVolumeUsd)}</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.totalDepositVolumeUsd > 0 ? (stats.topupVolumeUsd / stats.totalDepositVolumeUsd) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </Card>

              {/* Deposit Wallet */}
              <Card className="p-6 border-border/50">
                <h3 className="text-lg font-bold mb-4">Deposit Wallet</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">SOL Deposit Address</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded break-all">F4ZYTm8goUhKVQ8W5LmsrkrpsVoLPGtyykGnYau8676t</code>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total SOL Received</p>
                    <p className="text-xl font-bold">{stats.totalDepositVolumeSol.toFixed(4)} SOL</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total USD Value</p>
                    <p className="text-xl font-bold text-green-400">{formatUsd(stats.totalDepositVolumeUsd)}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="p-6 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Recent Transactions</h3>
                <span className="text-xs text-muted-foreground">Last {stats.recentPayments.length} completed</span>
              </div>
              {stats.recentPayments.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stats.recentPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30 hover:border-border/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          p.cardType === "issue" ? "bg-purple-500/20" : "bg-cyan-500/20"
                        }`}>
                          {p.cardType === "issue" ? (
                            <CreditCard className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Zap className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {p.cardType === "issue" ? "Card Issued" : "Card Topup"}
                            {p.nameOnCard && <span className="text-muted-foreground"> · {p.nameOnCard}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{p.user.email} · {timeAgo(p.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-400">+{formatUsd(p.amountUsd)}</p>
                        <p className="text-xs text-muted-foreground">{p.amountSol.toFixed(4)} SOL</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
              )}
            </Card>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-20">Failed to load stats</p>
        )}
      </main>
    </div>
  )
}
