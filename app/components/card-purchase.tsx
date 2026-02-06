"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Copy, Check, Loader2 } from "lucide-react"
import dynamic from "next/dynamic"

const QRCode = dynamic(() => import("qrcode.react"), { ssr: false })

interface DepositRequest {
  id: string
  deposit_address: string
  expected_amount: number
  card_value: number
  payment_verified: boolean
  card_queued?: boolean
  issued_card_id?: string
  card_number?: string
  card_expiry?: string
  card_cvv?: string
  card_holder_name?: string
  card_type?: string
}

export function CardPurchase() {
  const [cardValue, setCardValue] = useState<string>("50")
  const [solAmount, setSolAmount] = useState<string>("2")
  const [depositRequest, setDepositRequest] = useState<DepositRequest | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<string>("idle")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)
  const [error, setError] = useState<string>("")

  // Step 1: Create deposit request
  const handleCreateCard = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/payment/create-deposit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: `user_${Date.now()}`,
          cardValue: Number.parseFloat(cardValue),
          solAmount: Number.parseFloat(solAmount),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMsg = errorData.error || "Failed to create payment request"
        setError(errorMsg)
        console.error("[v0] Error response:", errorMsg)
        return
      }

      const data = await response.json()
      console.log("[v0] Deposit request created:", JSON.stringify(data))

      const depositData = Array.isArray(data) ? data[0] : data

      if (!depositData?.deposit_address) {
        setError("Invalid response: missing deposit address")
        return
      }

      setDepositRequest(depositData)
      setVerificationStatus("waiting")

      const interval = setInterval(() => {
        verifyPayment(depositData.id)
      }, 15000)

      setPollInterval(interval)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to create payment request"
      setError(errorMsg)
      console.error("[v0] Error creating deposit:", errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify payment
  const verifyPayment = async (requestId: string) => {
    try {
      const response = await fetch("/api/payment/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositRequestId: requestId }),
      })

      if (!response.ok) {
        return
      }

      const data = await response.json()

      if (data && typeof data === "object" && data.verified) {
        setVerificationStatus("success")
        setDepositRequest((prev) => (prev ? { ...prev, payment_verified: true, ...data.depositRequest } : null))
        if (pollInterval) clearInterval(pollInterval)
        setPollInterval(null)
      }
    } catch (error) {
      console.error("[v0] Verification error:", error instanceof Error ? error.message : String(error))
    }
  }

  const copyAddress = () => {
    if (depositRequest) {
      navigator.clipboard.writeText(depositRequest.deposit_address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getQRCodeUrl = (address: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`
  }

  // Before deposit created
  if (!depositRequest) {
    return (
      <Card className="p-8 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700/50">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Create a Card</h2>

          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Card Value (USD)</label>
              <input
                type="number"
                value={cardValue}
                onChange={(e) => setCardValue(e.target.value)}
                min="5"
                max="10000"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">SOL to Send</label>
              <input
                type="number"
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                step="0.1"
                min="0.1"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-300">
                You will send <span className="font-bold">{solAmount} SOL</span> to get a{" "}
                <span className="font-bold">${cardValue}</span> card
              </p>
            </div>
          </div>

          <Button onClick={handleCreateCard} disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Payment Request...
              </>
            ) : (
              "Generate Deposit Address"
            )}
          </Button>
        </div>
      </Card>
    )
  }

  if (verificationStatus === "success" && depositRequest?.card_number && !depositRequest?.card_queued) {
    return (
      <Card className="p-8 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700/50">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-green-400">Card Issued Successfully!</h2>

          {/* Card Display */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg p-8 text-white space-y-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs opacity-70">Card Holder</p>
                <p className="text-lg font-semibold">{depositRequest.card_holder_name || "User"}</p>
              </div>
              <p className="text-xl font-bold uppercase">{depositRequest.card_type || "VISA"}</p>
            </div>

            <div>
              <p className="text-xs opacity-70 mb-2">Card Number</p>
              <p className="text-2xl font-mono tracking-widest">
                {depositRequest.card_number || "•••• •••• •••• ••••"}
              </p>
            </div>

            <div className="flex justify-between">
              <div>
                <p className="text-xs opacity-70">Expires</p>
                <p className="font-mono text-lg">{depositRequest.card_expiry || "MM/YY"}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">CVV</p>
                <p className="font-mono text-lg">{depositRequest.card_cvv || "•••"}</p>
              </div>
            </div>
          </div>

          {/* Full Details for User */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400">Card Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Card Number:</span>
                <span className="font-mono">{depositRequest.card_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expiry Date:</span>
                <span className="font-mono">{depositRequest.card_expiry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CVV:</span>
                <span className="font-mono">{depositRequest.card_cvv}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Card Value:</span>
                <span className="font-mono">${depositRequest.card_value}</span>
              </div>
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <p className="text-sm text-green-400">
              Your card is ready to use! Keep these details safe and never share your CVV with anyone.
            </p>
          </div>

          <Button
            onClick={() => {
              setDepositRequest(null)
              setVerificationStatus("idle")
              setError("")
              if (pollInterval) clearInterval(pollInterval)
              setPollInterval(null)
            }}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            Create Another Card
          </Button>
        </div>
      </Card>
    )
  }

  if (verificationStatus === "success" && depositRequest?.card_queued) {
    return (
      <Card className="p-8 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700/50">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Payment Verified</h2>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 space-y-2">
            <p className="text-sm text-yellow-400 font-medium">Card Issuance Queued</p>
            <p className="text-sm text-yellow-300">
              Your payment was verified! Your card will be issued as soon as the account balance is available. You'll
              receive a notification when it's ready.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-sm text-slate-400">Deposit Address:</p>
            <code className="text-xs text-cyan-400 break-all">{depositRequest.deposit_address}</code>
          </div>

          <Button
            onClick={() => {
              setDepositRequest(null)
              setVerificationStatus("idle")
              setError("")
              if (pollInterval) clearInterval(pollInterval)
              setPollInterval(null)
            }}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            Create Another Card
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-8 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700/50">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Send Payment</h2>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg">
            <img
              src={getQRCodeUrl(depositRequest.deposit_address) || "/placeholder.svg"}
              alt="Deposit address QR code"
              width={200}
              height={200}
            />
          </div>
        </div>

        {/* Deposit Address */}
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Deposit Address:</p>
          <div className="flex gap-2">
            <code className="flex-1 bg-slate-800 p-3 rounded text-xs break-all text-cyan-400 border border-slate-700">
              {depositRequest.deposit_address}
            </code>
            <Button onClick={copyAddress} variant="outline" size="icon" className="border-slate-700 bg-transparent">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Amount to Send */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
          <p className="text-sm text-slate-400">Send exactly:</p>
          <p className="text-2xl font-bold text-cyan-400">{solAmount} SOL</p>
          <p className="text-xs text-slate-500">Verification is automatic - payment will be checked continuously</p>
        </div>

        {/* Status */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            {verificationStatus === "waiting" && (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                <span className="text-sm">Waiting for payment...</span>
              </>
            )}
          </div>
        </div>

        <Button
          onClick={() => {
            setDepositRequest(null)
            setVerificationStatus("idle")
            setError("")
            if (pollInterval) clearInterval(pollInterval)
            setPollInterval(null)
          }}
          variant="outline"
          className="w-full border-slate-700"
        >
          Create Another Card
        </Button>
      </div>
    </Card>
  )
}
