"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Check, AlertCircle, RefreshCw } from "lucide-react"

interface PendingPayment {
  id: string
  userId: string
  userEmail: string
  userName: string
  amountUsd: number
  amountSol: number
  status: string
  cardType: string
  nameOnCard: string | null
  txSignature: string | null
  createdAt: string
  expiresAt: string
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [manualTxSig, setManualTxSig] = useState("")

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch("/api/admin/payments/verify")
      const data = await res.json()
      if (data.payments) {
        setPayments(data.payments)
      }
    } catch {
      setError("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (paymentId: string, txSig?: string) => {
    try {
      setVerifying(paymentId)
      setError("")
      setSuccess("")

      const res = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          txSignature: txSig || manualTxSig || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to verify")
      }

      setSuccess(`✅ ${data.message}`)
      // Remove from list
      setPayments((prev) => prev.filter((p) => p.id !== paymentId))
      setTimeout(() => setSuccess(""), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify")
    } finally {
      setVerifying(null)
    }
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin — Payment Verification</h1>
            <p className="text-muted-foreground mt-1">
              Manually verify payments and issue cards
            </p>
          </div>
          <Button variant="outline" onClick={loadPayments} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-start gap-3">
            <Check className="w-5 h-5 text-green-500 mt-0.5" />
            <p className="text-green-500 font-medium">{success}</p>
          </div>
        )}

        {/* Quick Manual Verify by Payment ID */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Verify</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Input
              id="qPaymentId"
              placeholder="Payment ID"
              className="font-mono text-sm"
            />
            <Input
              value={manualTxSig}
              onChange={(e) => setManualTxSig(e.target.value)}
              placeholder="Solana TX Signature (optional)"
              className="font-mono text-sm"
            />
            <Button
              onClick={() => {
                const pid = (document.getElementById("qPaymentId") as HTMLInputElement)?.value
                if (!pid) { setError("Enter a Payment ID"); return }
                handleVerify(pid)
              }}
              disabled={verifying !== null}
              className="bg-green-600 hover:bg-green-700"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Verify & Issue Card
            </Button>
          </div>
        </Card>

        {/* Pending Payments List */}
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Pending Payments ({payments.length})
          </h2>

          {loading ? (
            <Card className="p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">Loading payments...</p>
            </Card>
          ) : payments.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No pending payments 🎉</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{p.userName || p.userEmail}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
                          {p.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>
                          <span className="font-medium text-foreground">${p.amountUsd.toFixed(2)}</span>
                          {" · "}{p.amountSol.toFixed(4)} SOL
                          {" · "}{p.cardType === "issue" ? "New Card" : "Topup"}
                          {p.nameOnCard && ` · ${p.nameOnCard}`}
                        </p>
                        <p className="font-mono text-xs truncate">
                          ID: {p.id}
                        </p>
                        {p.txSignature && (
                          <p className="font-mono text-xs truncate">
                            TX: {p.txSignature}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleVerify(p.id, p.txSignature || undefined)}
                      disabled={verifying === p.id}
                      className="bg-green-600 hover:bg-green-700 shrink-0"
                    >
                      {verifying === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Verify
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
