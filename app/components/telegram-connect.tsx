"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MessageCircle, Loader2, Check, X, ExternalLink } from "lucide-react"

export function TelegramConnect() {
  const [linked, setLinked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/telegram/auth")
      const data = await res.json()
      setLinked(data.linked || false)
    } catch {
      setLinked(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your Telegram account?")) return
    setDisconnecting(true)
    try {
      const res = await fetch("/api/telegram/auth", { method: "DELETE" })
      if (res.ok) {
        setLinked(false)
      }
    } catch {
      // ignore
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-4 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          <span className="text-zinc-500 text-sm">Checking Telegram connection...</span>
        </div>
      </Card>
    )
  }

  if (linked) {
    return (
      <Card className="p-4 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/10 p-2 rounded-lg">
              <MessageCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium flex items-center gap-1">
                Telegram Connected <Check className="h-3.5 w-3.5 text-green-400" />
              </p>
              <p className="text-zinc-500 text-xs">Manage cards from @PrivatePayAgentbot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://t.me/PrivatePayAgentbot" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                Open Bot
              </Button>
            </a>
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-500 hover:text-red-400 text-xs"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 bg-zinc-900/50 border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <MessageCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Telegram Bot</p>
            <p className="text-zinc-500 text-xs">Manage cards from Telegram</p>
          </div>
        </div>
        <a href="https://t.me/PrivatePayAgentbot" target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
            <MessageCircle className="h-3 w-3 mr-1" />
            Connect
          </Button>
        </a>
      </div>
    </Card>
  )
}
