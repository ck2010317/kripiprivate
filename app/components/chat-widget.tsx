"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { 
  MessageCircle, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Copy, 
  Check,
  Loader2,
  CreditCard,
  Snowflake,
  Play,
  Volume2,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  action?: string | null
  actionData?: any
  timestamp: Date
}

interface ChatWidgetProps {
  userName?: string
}

export function ChatWidget({ userName }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<any>(null)
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Check speech support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setSpeechSupported(!!SpeechRecognition)
    }
  }, [])

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `Hey ${userName || "there"}! 👋\n\nI'm your PrivatePay AI assistant. I can help you:\n\n💳 Create cards\n💰 Top up cards\n📊 Check balances\n❄️ Freeze/unfreeze cards\n\nJust type or tap 🎤 to speak!`,
        timestamp: new Date(),
      }])
    }
  }, [userName, messages.length])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setUnreadCount(0)
    }
  }, [isOpen])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      })

      const data = await res.json()

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        action: data.action,
        actionData: data.actionData,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMsg])

      // Track payment if created
      if (data.action === "payment_created" && data.actionData) {
        setPendingPayment(data.actionData)
      }

      if (!isOpen) {
        setUnreadCount(prev => prev + 1)
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Something went wrong. Please try again.",
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }, [loading, isOpen])

  // Voice input
  const toggleVoice = () => {
    if (!speechSupported) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
      // Auto-send after voice
      setTimeout(() => sendMessage(transcript), 300)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognition.start()
  }

  // Verify payment
  const handleVerifyPayment = async (paymentId: string) => {
    setVerifyingPayment(true)

    try {
      // Auto-verify
      const res = await fetch("/api/payments/auto-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      })
      const data = await res.json()

      if (!data.success) {
        setMessages(prev => [...prev, {
          id: `verify-fail-${Date.now()}`,
          role: "assistant",
          content: `⏳ Payment not detected yet. Make sure you've sent the exact SOL amount to the wallet address. I'll keep checking — try again in a moment.`,
          timestamp: new Date(),
        }])
        setVerifyingPayment(false)
        return
      }

      // Payment found! Process it
      setMessages(prev => [...prev, {
        id: `verify-found-${Date.now()}`,
        role: "assistant",
        content: `✅ Payment detected! Processing your ${pendingPayment?.isTopup ? "top-up" : "card"}...`,
        timestamp: new Date(),
      }])

      const processRes = await fetch(`/api/payments/${paymentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txSignature: data.txSignature }),
      })
      const processData = await processRes.json()

      if (processData.success) {
        if (pendingPayment?.isTopup) {
          setMessages(prev => [...prev, {
            id: `success-${Date.now()}`,
            role: "assistant",
            content: `🎉 **Top-up successful!**\n\n` +
              `💳 Card •••• ${pendingPayment.cardLast4}\n` +
              `💰 New balance: $${processData.newBalance?.toFixed(2) || "updated"}\n\n` +
              `Your card is ready to use!`,
            timestamp: new Date(),
          }])
        } else {
          const card = processData.card
          setMessages(prev => [...prev, {
            id: `success-${Date.now()}`,
            role: "assistant",
            content: `🎉 **Card created successfully!**\n\n` +
              `💳 **Number**: ${card?.cardNumber?.match(/.{1,4}/g)?.join(" ") || "Loading..."}\n` +
              `📅 **Expiry**: ${card?.expiryDate || "Loading..."}\n` +
              `🔒 **CVV**: ${card?.cvv || "***"}\n` +
              `👤 **Name**: ${card?.nameOnCard || pendingPayment?.cardName}\n` +
              `💰 **Balance**: $${card?.balance?.toFixed(2) || pendingPayment?.cardAmount?.toFixed(2)}\n\n` +
              `⚠️ Card activates in ~1 hour. After that, you're good to go!`,
            action: "card_created",
            actionData: card,
            timestamp: new Date(),
          }])
        }
        setPendingPayment(null)
      } else {
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `❌ ${processData.error || "Failed to process. Please contact support."}`,
          timestamp: new Date(),
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `❌ Something went wrong during verification. Please try again.`,
        timestamp: new Date(),
      }])
    } finally {
      setVerifyingPayment(false)
    }
  }

  // Freeze/unfreeze action
  const handleCardAction = async (cardId: string, action: "freeze" | "unfreeze") => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()

      if (data.success) {
        setMessages(prev => [...prev, {
          id: `action-${Date.now()}`,
          role: "assistant",
          content: action === "freeze" 
            ? `❄️ Card has been **frozen**. No transactions will go through until you unfreeze it.`
            : `✅ Card has been **unfrozen** and is now active!`,
          timestamp: new Date(),
        }])
      } else {
        setMessages(prev => [...prev, {
          id: `action-error-${Date.now()}`,
          role: "assistant",
          content: `❌ Failed to ${action} card: ${data.error || "Unknown error"}`,
          timestamp: new Date(),
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `action-error-${Date.now()}`,
        role: "assistant",
        content: `❌ Failed to ${action} card. Please try again.`,
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  // Render markdown-like formatting
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Bold
      let formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Code/mono
      formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono break-all">$1</code>')
      // Spoiler (for CVV)
      formatted = formatted.replace(/\|\|(.+?)\|\|/g, '<span class="bg-gray-600 hover:bg-transparent cursor-pointer rounded px-1 transition-colors">$1</span>')

      return (
        <span key={i} className="block" dangerouslySetInnerHTML={{ __html: formatted || "&nbsp;" }} />
      )
    })
  }

  // Render action buttons
  const renderActions = (msg: Message) => {
    if (!msg.action || !msg.actionData) return null

    switch (msg.action) {
      case "payment_created":
        return (
          <div className="mt-3 space-y-2">
            <button
              onClick={() => copyToClipboard(msg.actionData.paymentWallet, `wallet-${msg.id}`)}
              className="flex items-center gap-2 w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
            >
              {copied === `wallet-${msg.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied === `wallet-${msg.id}` ? "Copied!" : "Copy Wallet Address"}
            </button>
            <button
              onClick={() => copyToClipboard(msg.actionData.amountSol.toFixed(6), `sol-${msg.id}`)}
              className="flex items-center gap-2 w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
            >
              {copied === `sol-${msg.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied === `sol-${msg.id}` ? "Copied!" : `Copy SOL Amount (${msg.actionData.amountSol.toFixed(6)})`}
            </button>
            <button
              onClick={() => handleVerifyPayment(msg.actionData.paymentId)}
              disabled={verifyingPayment}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              {verifyingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  I&apos;ve Paid — Verify Now
                </>
              )}
            </button>
          </div>
        )

      case "confirm_freeze":
        return (
          <div className="mt-3">
            <button
              onClick={() => handleCardAction(msg.actionData.cardId, "freeze")}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Snowflake className="w-4 h-4" />
              Yes, Freeze Card •••• {msg.actionData.last4}
            </button>
          </div>
        )

      case "confirm_unfreeze":
        return (
          <div className="mt-3">
            <button
              onClick={() => handleCardAction(msg.actionData.cardId, "unfreeze")}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Yes, Unfreeze Card •••• {msg.actionData.last4}
            </button>
          </div>
        )

      case "card_details":
        return (
          <div className="mt-3 space-y-2">
            <button
              onClick={() => copyToClipboard(msg.actionData.cardNumber, `cn-${msg.id}`)}
              className="flex items-center gap-2 w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
            >
              {copied === `cn-${msg.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied === `cn-${msg.id}` ? "Copied!" : "Copy Card Number"}
            </button>
            <button
              onClick={() => copyToClipboard(msg.actionData.cvv, `cvv-${msg.id}`)}
              className="flex items-center gap-2 w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
            >
              {copied === `cvv-${msg.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied === `cvv-${msg.id}` ? "Copied!" : "Copy CVV"}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      {/* Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center transition-all hover:scale-110 group"
        >
          <MessageCircle className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-purple-500 opacity-0 group-hover:opacity-20 animate-ping" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] bg-gray-950 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-900/80 to-gray-900/80 border-b border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">PrivatePay AI</h3>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs text-green-400">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-md"
                      : "bg-gray-800/80 text-gray-100 rounded-bl-md border border-gray-700/50"
                  }`}
                >
                  <div className="space-y-0.5">{renderContent(msg.content)}</div>
                  {msg.role === "assistant" && renderActions(msg)}
                  <div className={`text-[10px] mt-2 ${msg.role === "user" ? "text-purple-200" : "text-gray-500"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800/80 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-700/50">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (when no pending payment) */}
          {!pendingPayment && messages.length <= 1 && (
            <div className="px-4 pb-2 flex gap-2 flex-wrap">
              {[
                { label: "💳 Create Card", msg: "Create a card" },
                { label: "💰 Balance", msg: "What's my balance?" },
                { label: "💲 Fees", msg: "What are the fees?" },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => sendMessage(q.msg)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full text-xs text-gray-300 transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-800">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage(input)
              }}
              className="flex items-center gap-2"
            >
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "🎤 Listening..." : "Type a message..."}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-gray-800/80 border border-gray-700 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all disabled:opacity-50"
                />
              </div>

              {/* Voice Button */}
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-gray-800 hover:bg-gray-700 border border-gray-700"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 text-white" />
                  ) : (
                    <Mic className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              )}

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 flex items-center justify-center transition-all"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
