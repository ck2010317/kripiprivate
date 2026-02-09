"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, AlertCircle, CheckCircle, Clock, CreditCard } from "lucide-react"

interface StatsInfo {
  totalCards: number
  activeCards: number
  frozenCards: number
  pendingCards: number
  totalUsers: number
  totalDepositVolumeUsd: number
  pendingPayments: number
}

interface PendingCard {
  id: string
  nameOnCard: string
  balance: number
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
  payment: {
    id: string
    amountUsd: number
    amountSol: number
    topupAmount: number | null
    txSignature: string | null
    createdAt: string
  } | null
}

export function AdminDashboard() {
  const [stats, setStats] = useState<StatsInfo | null>(null)
  const [pendingCards, setPendingCards] = useState<PendingCard[]>([])
  const [loading, setLoading] = useState(false)
  const [kripiCardInputs, setKripiCardInputs] = useState<Record<string, string>>({})
  const [assigningCardId, setAssigningCardId] = useState<string | null>(null)
  const [assignMessage, setAssignMessage] = useState<{ cardId: string; type: "success" | "error"; text: string } | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/stats")
      const data = await response.json()
      setStats({
        totalCards: data.totalCards || 0,
        activeCards: data.activeCards || 0,
        frozenCards: data.frozenCards || 0,
        pendingCards: data.pendingCards || 0,
        totalUsers: data.totalUsers || 0,
        totalDepositVolumeUsd: data.totalDepositVolumeUsd || 0,
        pendingPayments: data.pendingPayments || 0,
      })
    } catch (error) {
      console.error("[Admin] Failed to fetch stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingCards = async () => {
    try {
      const response = await fetch("/api/admin/assign-card")
      const data = await response.json()
      setPendingCards(data.cards || [])
    } catch (error) {
      console.error("[Admin] Failed to fetch pending cards:", error)
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
      const response = await fetch("/api/admin/assign-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, kripiCardId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAssignMessage({ cardId, type: "error", text: data.error || "Failed to assign card" })
        return
      }

      setAssignMessage({ cardId, type: "success", text: `✅ Card assigned! Status: ${data.card?.status}` })
      
      // Clear input and refresh
      setKripiCardInputs(prev => {
        const next = { ...prev }
        delete next[cardId]
        return next
      })
      
      // Refresh data after short delay
      setTimeout(() => {
        fetchPendingCards()
        fetchStats()
        setAssignMessage(null)
      }, 2000)
    } catch (error) {
      console.error("[Admin] Assign error:", error)
      setAssignMessage({ cardId, type: "error", text: "Network error — try again" })
    } finally {
      setAssigningCardId(null)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchPendingCards()
  }, [])

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Stats Card */}
      <Card className="p-6 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700/50">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Platform Stats</h2>
          <Button onClick={() => { fetchStats(); fetchPendingCards() }} disabled={loading} size="sm" variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-400">Total Cards</p>
              <p className="text-2xl font-bold">{stats.totalCards}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Active</p>
              <p className="text-2xl font-bold text-green-400">{stats.activeCards}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pendingCards}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Frozen</p>
              <p className="text-2xl font-bold text-blue-400">{stats.frozenCards}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Users</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Deposit Volume</p>
              <p className="text-2xl font-bold text-cyan-400">${stats.totalDepositVolumeUsd.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Pending Payments</p>
              <p className="text-2xl font-bold text-orange-400">{stats.pendingPayments}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-400">Loading stats...</p>
        )}
      </Card>

      {/* Pending Card Assignments */}
      <Card className="p-6 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700/50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Pending Card Assignments ({pendingCards.length})
            </h2>
            {pendingCards.length > 0 && (
              <p className="text-sm text-yellow-500 flex items-center gap-2 mt-2">
                <AlertCircle className="w-4 h-4" />
                These cards need a KripiCard ID assigned from the dashboard
              </p>
            )}
          </div>
          <Button
            onClick={() => window.open("https://kripicard.com", "_blank")}
            className="bg-cyan-600 hover:bg-cyan-700"
            size="sm"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            KripiCard Dashboard
          </Button>
        </div>

        {pendingCards.length > 0 ? (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {pendingCards.map((card) => (
              <div
                key={card.id}
                className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded font-medium">
                        PENDING
                      </span>
                      <span className="text-sm font-bold text-white">
                        {card.nameOnCard}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-0.5">
                      <p>User: {card.user?.email || "Unknown"}</p>
                      <p>Balance: <span className="text-cyan-400 font-medium">${card.balance.toFixed(2)}</span></p>
                      {card.payment && (
                        <>
                          <p>Paid: ${card.payment.amountUsd.toFixed(2)} ({card.payment.amountSol.toFixed(4)} SOL)</p>
                          {card.payment.txSignature && (
                            <p className="truncate">TX: <a href={`https://solscan.io/tx/${card.payment.txSignature}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{card.payment.txSignature.slice(0, 20)}...</a></p>
                          )}
                        </>
                      )}
                      <p>Created: {new Date(card.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Input
                      placeholder="Enter KripiCard ID (e.g. C260...)"
                      value={kripiCardInputs[card.id] || ""}
                      onChange={(e) => setKripiCardInputs(prev => ({ ...prev, [card.id]: e.target.value }))}
                      className="text-sm bg-slate-900/50 border-slate-600 min-w-[200px]"
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
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Assign
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {assignMessage?.cardId === card.id && (
                  <div className={`mt-2 text-sm px-3 py-2 rounded ${
                    assignMessage.type === "success" 
                      ? "bg-green-900/30 text-green-400 border border-green-800/50" 
                      : "bg-red-900/30 text-red-400 border border-red-800/50"
                  }`}>
                    {assignMessage.text}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
            <p>No pending card assignments</p>
            <p className="text-xs mt-1">All cards have been assigned</p>
          </div>
        )}
      </Card>
    </div>
  )
}
