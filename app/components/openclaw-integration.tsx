"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Shield,
  ExternalLink,
  Eye,
  EyeOff,
  AlertTriangle,
  Bot,
} from "lucide-react";
import { useAuth } from "@/app/context/auth-context";

interface TokenData {
  id: string;
  name: string;
  scopes: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface OpenClawIntegrationProps {
  onBack: () => void;
}

export function OpenClawIntegration({ onBack }: OpenClawIntegrationProps) {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokenName, setTokenName] = useState("OpenClaw Agent");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/openclaw/tokens");
      const data = await res.json();
      if (data.success) {
        setTokens(data.tokens);
      }
    } catch {
      console.error("Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const createToken = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/openclaw/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tokenName,
          scopes:
            "read:profile,read:cards,read:transactions,read:payments,read:referrals",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewToken(data.token);
        setShowCreateForm(false);
        fetchTokens();
      } else {
        alert(data.error || "Failed to create token");
      }
    } catch {
      alert("Failed to create token");
    } finally {
      setCreating(false);
    }
  };

  const revokeToken = async (tokenId: string) => {
    setRevoking(tokenId);
    try {
      const res = await fetch("/api/openclaw/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTokens();
      }
    } catch {
      alert("Failed to revoke token");
    } finally {
      setRevoking(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTokens = tokens.filter((t) => t.isActive);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-zinc-400 hover:text-white"
          >
            ← Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">OpenClaw Integration</h1>
              <p className="text-sm text-zinc-400">
                Connect your AI agent to your PrivatePay account
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-2xl mb-2">1️⃣</div>
              <h3 className="font-medium mb-1">Generate Token</h3>
              <p className="text-sm text-zinc-400">
                Create a personal access token below. It can only access{" "}
                <strong>your</strong> data.
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-2xl mb-2">2️⃣</div>
              <h3 className="font-medium mb-1">Install Skill</h3>
              <p className="text-sm text-zinc-400">
                Download the PrivatePay skill file and add it to your OpenClaw
                skills directory.
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-2xl mb-2">3️⃣</div>
              <h3 className="font-medium mb-1">Chat with Your Agent</h3>
              <p className="text-sm text-zinc-400">
                Ask your agent about balances, transactions, and cards from
                WhatsApp, Telegram, etc.
              </p>
            </div>
          </div>
        </Card>

        {/* Security notice */}
        <Card className="bg-emerald-950/30 border-emerald-800/50 p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="text-emerald-300 font-medium">
                Privacy-first design
              </p>
              <p className="text-emerald-400/70 mt-1">
                Personal tokens can only access <strong>your own</strong> data.
                Your AI agent runs on <strong>your machine</strong> — we never
                see your conversations. You can revoke tokens instantly at any
                time.
              </p>
            </div>
          </div>
        </Card>

        {/* New token just created */}
        {newToken && (
          <Card className="bg-amber-950/40 border-amber-700/50 p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-amber-300 font-semibold mb-2">
                  ⚠️ Save your token now! You won&apos;t see it again.
                </p>
                <div className="bg-black/50 rounded-lg p-3 font-mono text-sm break-all flex items-center justify-between gap-2">
                  <span className="text-amber-200">{newToken}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(newToken)}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="mt-3 text-sm text-zinc-400">
                  <p className="mb-1">Add this to your OpenClaw environment:</p>
                  <div className="bg-black/50 rounded-lg p-3 font-mono text-xs">
                    <span className="text-zinc-500">
                      # In your OpenClaw .env or config
                    </span>
                    <br />
                    PRIVATEPAY_TOKEN={newToken}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3 text-zinc-400"
                  onClick={() => setNewToken(null)}
                >
                  I&apos;ve saved it, dismiss
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Active Tokens */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Your Tokens{" "}
            <span className="text-sm font-normal text-zinc-500">
              ({activeTokens.length}/5)
            </span>
          </h2>
          {!showCreateForm && (
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              disabled={activeTokens.length >= 5}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Token
            </Button>
          )}
        </div>

        {/* Create form */}
        {showCreateForm && (
          <Card className="bg-zinc-900/50 border-zinc-800 p-5 mb-4">
            <h3 className="font-medium mb-3">Create Personal Access Token</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-zinc-400 block mb-1">
                  Token Name
                </label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g. OpenClaw Agent"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-1">
                  Permissions (read-only)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Profile",
                    "Cards",
                    "Transactions",
                    "Payments",
                    "Referrals",
                  ].map((scope) => (
                    <span
                      key={scope}
                      className="bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 text-xs px-2 py-1 rounded-full"
                    >
                      ✓ read:{scope.toLowerCase()}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Tokens are read-only. They cannot create cards, make
                  payments, or modify your account.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={createToken}
                  disabled={creating || !tokenName.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-1" />
                  )}
                  Generate Token
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                  className="text-zinc-400"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Token list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : activeTokens.length === 0 && !showCreateForm ? (
          <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center">
            <Bot className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
            <p className="text-zinc-400 mb-2">
              No tokens yet
            </p>
            <p className="text-sm text-zinc-500 mb-4">
              Create a personal access token to connect your OpenClaw agent
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Your First Token
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeTokens.map((token) => (
              <Card
                key={token.id}
                className="bg-zinc-900/50 border-zinc-800 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-900/30 flex items-center justify-center">
                      <Key className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{token.name}</p>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>
                          Created{" "}
                          {new Date(token.createdAt).toLocaleDateString()}
                        </span>
                        {token.lastUsedAt && (
                          <span>
                            Last used{" "}
                            {new Date(token.lastUsedAt).toLocaleDateString()}
                          </span>
                        )}
                        {token.expiresAt && (
                          <span>
                            Expires{" "}
                            {new Date(token.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revokeToken(token.id)}
                    disabled={revoking === token.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  >
                    {revoking === token.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {token.scopes.split(",").map((scope) => (
                    <span
                      key={scope}
                      className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded"
                    >
                      {scope.trim()}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Setup Guide */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6 mt-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-orange-400" />
            Quick Setup Guide
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium text-zinc-200 mb-2">
                1. Install OpenClaw
              </h3>
              <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-zinc-300">
                curl -fsSL https://openclaw.ai/install.sh | bash
              </div>
            </div>

            <div>
              <h3 className="font-medium text-zinc-200 mb-2">
                2. Download the PrivatePay skill
              </h3>
              <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-zinc-300">
                <span className="text-zinc-500"># In your OpenClaw directory</span>
                <br />
                curl -o skills/privatepay-skill.mjs https://privatepay.site/openclaw/privatepay-skill.mjs
              </div>
            </div>

            <div>
              <h3 className="font-medium text-zinc-200 mb-2">
                3. Set your token
              </h3>
              <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-zinc-300">
                <span className="text-zinc-500">
                  # Add to your OpenClaw .env file
                </span>
                <br />
                PRIVATEPAY_TOKEN=pat_your_token_here
              </div>
            </div>

            <div>
              <h3 className="font-medium text-zinc-200 mb-2">
                4. Ask your agent!
              </h3>
              <div className="bg-black/50 rounded-lg p-3 text-xs space-y-1">
                <p className="text-zinc-400">
                  &quot;What&apos;s my PrivatePay balance?&quot;
                </p>
                <p className="text-zinc-400">
                  &quot;Show me my card transactions&quot;
                </p>
                <p className="text-zinc-400">
                  &quot;What&apos;s my referral code?&quot;
                </p>
                <p className="text-zinc-400">
                  &quot;Give me a full PrivatePay overview&quot;
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-4">
            <a
              href="https://docs.openclaw.ai/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-1"
            >
              OpenClaw Docs <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/openclaw/privatepay-skill.mjs"
              download
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Download Skill File ↓
            </a>
          </div>
        </Card>

        {/* API Reference */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">
            API Reference{" "}
            <span className="text-xs font-normal text-zinc-500">
              (for advanced users)
            </span>
          </h2>
          <div className="space-y-3 text-sm font-mono">
            {[
              {
                method: "GET",
                path: "/api/openclaw/me",
                desc: "Your profile",
              },
              {
                method: "GET",
                path: "/api/openclaw/me/overview",
                desc: "Full account overview",
              },
              {
                method: "GET",
                path: "/api/openclaw/me/cards",
                desc: "Your cards (?sync=true&full=true)",
              },
              {
                method: "GET",
                path: "/api/openclaw/me/cards/:id/transactions",
                desc: "Card transactions",
              },
              {
                method: "GET",
                path: "/api/openclaw/me/payments",
                desc: "Payment history (?status=COMPLETED)",
              },
              {
                method: "GET",
                path: "/api/openclaw/me/referrals",
                desc: "Referral stats",
              },
            ].map((endpoint) => (
              <div
                key={endpoint.path}
                className="flex items-start gap-3 bg-zinc-800/30 rounded-lg p-3"
              >
                <span className="text-xs font-bold bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded shrink-0">
                  {endpoint.method}
                </span>
                <div>
                  <span className="text-zinc-300">{endpoint.path}</span>
                  <p className="text-xs text-zinc-500 font-sans mt-0.5">
                    {endpoint.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-3 font-sans">
            All endpoints require:{" "}
            <code className="text-zinc-400">
              Authorization: Bearer pat_xxxxx
            </code>
          </p>
        </Card>
      </div>
    </div>
  );
}
