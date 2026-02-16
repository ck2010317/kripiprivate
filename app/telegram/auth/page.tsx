"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, AlertCircle, Loader2, MessageCircle } from "lucide-react"

export default function TelegramAuthPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Invalid link. No token found.")
      return
    }
    setStatus("ready")
    setMessage("")
  }, [token])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch("/api/telegram/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage(data.message || "Connected successfully!")
      } else {
        setStatus("error")
        setMessage(data.error || "Something went wrong")
      }
    } catch {
      setStatus("error")
      setMessage("Network error. Please try again.")
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-zinc-900 border-zinc-800">
        <div className="text-center space-y-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2">
            <MessageCircle className="h-8 w-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">PrivatePay</h1>
          </div>

          <p className="text-zinc-400 text-sm">Connect your Telegram to PrivatePay</p>

          {/* Status states */}
          {status === "loading" && (
            <div className="py-8">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mx-auto" />
            </div>
          )}

          {status === "ready" && (
            <div className="space-y-4">
              <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
                <p className="text-white text-sm">
                  Click the button below to connect your Telegram account to PrivatePay.
                </p>
                <p className="text-zinc-500 text-xs">
                  This will allow you to manage your cards directly from Telegram.
                </p>
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Connect Telegram
                  </>
                )}
              </Button>

              <p className="text-zinc-600 text-xs">
                You must be logged into PrivatePay for this to work.
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
                <Check className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <h2 className="text-green-400 text-lg font-semibold">Connected!</h2>
                <p className="text-green-300/70 text-sm mt-2">{message}</p>
              </div>

              <p className="text-zinc-500 text-sm">
                Go back to Telegram and start chatting with the bot! 🤖
              </p>

              <a
                href="https://t.me/PrivatePayAgentbot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Open Telegram Bot
                </Button>
              </a>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                <h2 className="text-red-400 text-lg font-semibold">Error</h2>
                <p className="text-red-300/70 text-sm mt-2">{message}</p>
              </div>

              <div className="space-y-2">
                <a href="https://t.me/PrivatePayAgentbot" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full border-zinc-700 text-zinc-300">
                    Get New Link from Bot
                  </Button>
                </a>
                <a href="/">
                  <Button variant="ghost" className="w-full text-zinc-500">
                    Go to PrivatePay
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
