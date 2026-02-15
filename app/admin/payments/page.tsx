"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Check, Copy, AlertCircle } from "lucide-react"

interface Payment {
  id: string
  userId: string
  amountUsd: number
  amountSol: number
  status: string
  cardholderName?: string
  createdAt: string
  txSignature?: string
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("PENDING")
  const [copied, setCopied] = useState<string | null>(null)

  // Load pending payments
  useEffect(() => {
    loadPayments()
  }, [])

  // Filter payments
  useEffect(() => {
    let filtered = payments
    if (filterStatus) {
      filtered = filtered.filter((p) => p.status === filterStatus)
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.id.includes(searchQuery) ||
          p.userId.includes(searchQuery) ||
          p.cardholderName?.includes(searchQuery)
      )
    }
    setFilteredPayments(filtered)
  }, [payments, filterStatus, searchQuery])

  const loadPayments = async () => {
    try {
      setLoading(true)
      // This would need a new endpoint to get all payments
      // For now, we'll show the verification UI
      setLoading(false)
    } catch (err) {
      setError("Failed to load payments")
      setLoading(false)
    }
  }

  const handleVerifyPayment = async (paymentId: string, txSignature?: string) => {
    try {
      setVerifying(paymentId)
      setError("")
      setSuccess("")

      const response = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          txSignature: txSignature || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify payment")
      }

      setSuccess(
        `✓ Payment verified! Card issued for ${data.card?.nameOnCard || "user"}`
      )

      // Update the payment in the list
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? { ...p, status: "COMPLETED" }
            : p
        )
      )

      // Clear after 3 seconds
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify payment")
    } finally {
      setVerifying(null)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Payment Verification</h1>
          <p className="text-muted-foreground mt-2">
            Manually verify payments and issue cards
          </p>
        </div>

        {/* Search & Filter */}
        <Card className="p-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Payment ID, User ID, or Cardholder Name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-input border border-border/50 focus:border-primary outline-none"
              >
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="COMPLETED">Completed</option>
                <option value="">All</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Messages */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-start gap-3">
            <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Manual Verification Form */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Verify a Payment</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Payment ID</label>
              <Input
                id="paymentId"
                placeholder="Enter payment ID to verify"
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Solana Transaction Signature (Optional)
              </label>
              <Input
                id="txSignature"
                placeholder="Optional: Paste Solana tx signature if you have it"
                className="font-mono"
              />
            </div>
            <Button
              onClick={() => {
                const paymentId = (
                  document.getElementById("paymentId") as HTMLInputElement
                )?.value
                const txSignature = (
                  document.getElementById("txSignature") as HTMLInputElement
                )?.value

                if (!paymentId) {
                  setError("Please enter a Payment ID")
                  return
                }

                handleVerifyPayment(paymentId, txSignature)
              }}
              disabled={verifying !== null}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Verify & Issue Card
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-blue-500/5 border border-blue-500/30">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            How to use this:
          </h3>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Get the Payment ID from the user (visible in their payment request)</li>
            <li>Optionally, get the Solana transaction signature from them or explorer</li>
            <li>Click "Verify & Issue Card"</li>
            <li>The card will be immediately issued and ready to use</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
