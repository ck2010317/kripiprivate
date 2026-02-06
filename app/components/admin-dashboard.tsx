"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"

interface BalanceInfo {
  balance: number
  totalCardsIssued: number
  totalVolume: number
}

interface QueuedCard {
  id: string
  user_id: string
  card_value: number
  created_at: string
  card_issue_status: string
}

export function AdminDashboard() {
  const [balance, setBalance] = useState<BalanceInfo | null>(null)
  const [queuedCards, setQueuedCards] = useState<QueuedCard[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  const fetchBalance = async () => {
    setLoading(true)
    try {
      // Balance fetch logic to be integrated with your card service
      setBalance({
        balance: 0,
        totalCardsIssued: 0,
        totalVolume: 0,
      })
    } catch (error) {
      console.error("[v0] Failed to fetch balance:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchQueuedCards = async () => {
    try {
      const response = await fetch("/api/admin/get-queued-cards")
      const data = await response.json()
      setQueuedCards(data.queuedCards || [])
    } catch (error) {
      console.error("[v0] Failed to fetch queued cards:", error)
    }
  }

  const processQueuedCards = async () => {
    setProcessing(true)
    try {
      await fetch("/api/admin/process-queued-cards", { method: "POST" })
      fetchBalance()
      fetchQueuedCards()
    } catch (error) {
      console.error("[v0] Failed to process queued cards:", error)
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    fetchBalance()
    fetchQueuedCards()
  }, [])

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Balance Card */}
      <Card className="p-6 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700/50">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Account Balance</h2>
          <Button onClick={fetchBalance} disabled={loading} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {balance ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-400">Balance</p>
              <p className="text-2xl font-bold text-cyan-400">${balance.balance.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Issued</p>
              <p className="text-2xl font-bold">{balance.totalCardsIssued}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Volume</p>
              <p className="text-2xl font-bold text-green-400">${balance.totalVolume.toFixed(2)}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-400">Loading balance...</p>
        )}
      </Card>

      {/* Queued Cards */}
      <Card className="p-6 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700/50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">Queued Cards ({queuedCards.length})</h2>
            {queuedCards.length > 0 && (
              <p className="text-sm text-yellow-500 flex items-center gap-2 mt-2">
                <AlertCircle className="w-4 h-4" />
                Cards waiting for sufficient balance
              </p>
            )}
          </div>
          <Button
            onClick={processQueuedCards}
            disabled={processing || queuedCards.length === 0}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {processing ? "Processing..." : "Process Now"}
          </Button>
        </div>

        {queuedCards.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {queuedCards.map((card) => (
              <div
                key={card.id}
                className="flex justify-between items-center p-3 bg-slate-800/50 border border-slate-700 rounded"
              >
                <div>
                  <p className="text-sm font-medium">${card.card_value}</p>
                  <p className="text-xs text-slate-400">{card.user_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">
                    {card.card_issue_status}
                  </span>
                  <Button
                    onClick={() => window.open("https://www.privatetransfer.site", "_blank")}
                    variant="outline"
                    size="sm"
                    className="text-xs border-slate-600 hover:bg-slate-700"
                  >
                    Private Transfer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">No queued cards</p>
        )}
      </Card>
    </div>
  )
}
