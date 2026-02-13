"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Gift,
  Copy,
  Check,
  Trophy,
  Users,
  DollarSign,
  Star,
  Share2,
  Loader2,
  Crown,
  Medal,
  ArrowLeft,
  ExternalLink,
} from "lucide-react"
import { useAuth } from "@/app/context/auth-context"

interface ReferralStats {
  totalPoints: number
  totalEarnings: number
  totalCardsReferred: number
}

interface ReferralLog {
  id: string
  referredEmail: string
  rewardAmount: number
  points: number
  status: string
  createdAt: string
}

interface LeaderboardEntry {
  rank: number
  displayName: string
  points: number
  earnings: number
  cardsReferred: number
}

interface ReferralDashboardProps {
  onBack: () => void
}

export function ReferralDashboard({ onBack }: ReferralDashboardProps) {
  const { user } = useAuth()
  const [referralCode, setReferralCode] = useState("")
  const [referralLink, setReferralLink] = useState("")
  const [stats, setStats] = useState<ReferralStats>({ totalPoints: 0, totalEarnings: 0, totalCardsReferred: 0 })
  const [recentReferrals, setRecentReferrals] = useState<ReferralLog[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [totalStats, setTotalStats] = useState({ totalReferrers: 0, totalCardsReferred: 0, totalEarningsDistributed: 0 })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard">("overview")

  const fetchReferralData = useCallback(async () => {
    try {
      const [refRes, lbRes] = await Promise.all([
        fetch("/api/referral"),
        fetch("/api/referral/leaderboard"),
      ])

      const refData = await refRes.json()
      const lbData = await lbRes.json()

      if (refData.success) {
        setReferralCode(refData.referralCode)
        setReferralLink(refData.referralLink)
        setStats(refData.stats)
        setRecentReferrals(refData.recentReferrals || [])
      }

      if (lbData.success) {
        setLeaderboard(lbData.leaderboard || [])
        setTotalStats(lbData.totalStats || { totalReferrers: 0, totalCardsReferred: 0, totalEarningsDistributed: 0 })
      }
    } catch (err) {
      console.error("Failed to fetch referral data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReferralData()
  }, [fetchReferralData])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const shareOnTwitter = () => {
    const text = `Get a non-KYC virtual card powered by Solana 💳⚡\n\nSign up with my referral link and create your first card:\n${referralLink}\n\n@Privatepay_`
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank")
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>
  }

  // Find current user's rank
  const myRank = leaderboard.find((e) => e.displayName.startsWith(user?.name?.split(" ")[0] || "___"))

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
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
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" />
              Referral Program
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Referral Banner */}
        <Card className="mb-8 p-6 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border-green-500/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Earn $5 Per Referral 💰</h2>
              <p className="text-muted-foreground">
                Share your link → Friend signs up → They create a card → You earn $5 + 10 points
              </p>
            </div>
            <Button onClick={shareOnTwitter} className="bg-black hover:bg-gray-900 text-white shrink-0">
              <Share2 className="w-4 h-4 mr-2" />
              Share on 𝕏
            </Button>
          </div>

          {/* Referral Link */}
          <div className="mt-6 space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Your Referral Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-background/50 border border-border font-mono text-sm break-all">
                  {referralLink}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(referralLink, "link")}
                  className="shrink-0"
                >
                  {copied === "link" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Referral Code</label>
              <div className="flex items-center gap-2">
                <div className="p-3 rounded-lg bg-background/50 border border-border font-mono text-sm">
                  {referralCode}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(referralCode, "code")}
                  className="shrink-0"
                >
                  {copied === "code" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-5 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Total Earnings</p>
          </Card>
          <Card className="p-5 text-center">
            <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-3xl font-bold">{stats.totalPoints}</p>
            <p className="text-sm text-muted-foreground">Total Points</p>
          </Card>
          <Card className="p-5 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-3xl font-bold">{stats.totalCardsReferred}</p>
            <p className="text-sm text-muted-foreground">Cards Referred</p>
          </Card>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("overview")}
          >
            <Gift className="w-4 h-4 mr-2" />
            My Referrals
          </Button>
          <Button
            variant={activeTab === "leaderboard" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("leaderboard")}
          >
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </Button>
        </div>

        {/* My Referrals Tab */}
        {activeTab === "overview" && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" />
              Recent Referrals
            </h3>

            {recentReferrals.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-2">No referrals yet</p>
                <p className="text-sm text-muted-foreground">
                  Share your referral link to start earning $5 per card!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReferrals.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{ref.referredEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ref.createdAt).toLocaleDateString()} • {ref.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-500">+${ref.rewardAmount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">+{ref.points} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Referrers
              </h3>
              <div className="text-sm text-muted-foreground">
                {totalStats.totalReferrers} referrers • {totalStats.totalCardsReferred} cards referred
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-2">Leaderboard is empty</p>
                <p className="text-sm text-muted-foreground">
                  Be the first to refer someone and top the leaderboard!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Name</div>
                  <div className="col-span-2 text-center">Points</div>
                  <div className="col-span-3 text-center">Earnings</div>
                  <div className="col-span-2 text-center">Cards</div>
                </div>

                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`grid grid-cols-12 gap-2 items-center p-3 rounded-lg border transition-colors ${
                      entry.rank <= 3
                        ? "bg-gradient-to-r from-yellow-500/5 to-transparent border-yellow-500/20"
                        : "bg-muted/20 border-border/50"
                    }`}
                  >
                    <div className="col-span-1 flex items-center">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="col-span-4">
                      <p className="font-medium truncate">{entry.displayName}</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-sm font-semibold">
                        <Star className="w-3 h-3" />
                        {entry.points}
                      </span>
                    </div>
                    <div className="col-span-3 text-center">
                      <span className="font-semibold text-green-500">${entry.earnings.toFixed(2)}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-muted-foreground">{entry.cardsReferred}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* How It Works */}
        <Card className="mt-8 p-6 bg-muted/20">
          <h3 className="text-lg font-semibold mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
              <p className="text-sm font-medium">Share Link</p>
              <p className="text-xs text-muted-foreground">Send your referral link to friends</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
              <p className="text-sm font-medium">They Sign Up</p>
              <p className="text-xs text-muted-foreground">Friend creates an account</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
              <p className="text-sm font-medium">They Create a Card</p>
              <p className="text-xs text-muted-foreground">Friend successfully issues their first card</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold">$5</div>
              <p className="text-sm font-medium">You Earn!</p>
              <p className="text-xs text-muted-foreground">$5 + 10 points credited instantly</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
