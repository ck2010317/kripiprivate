"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/auth-context";
import { AuthModal } from "@/app/components/auth-modal";
import {
  Copy,
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  CreditCard,
  Activity,
  DollarSign,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";

interface ApiKeyData {
  id: string;
  name: string;
  key_prefix: string;
  is_test: boolean;
  is_active: boolean;
  plan: string;
  rate_limit: number;
  monthly_limit: number;
  total_requests: number;
  total_cards: number;
  total_volume: number;
  last_used_at: string | null;
  created_at: string;
}

interface UsageData {
  total_requests: number;
  recent_requests_30d: number;
  total_cards: number;
  total_volume: number;
  total_card_balance: number;
}

interface PlanData {
  name: string;
  display_name: string;
  price_monthly: number;
  cards_per_month: number;
  requests_per_minute: number;
  card_issue_fee: number;
  card_fund_fee: number;
  markup_percent: number;
  features: Record<string, boolean>;
}

export default function DeveloperPortal() {
  const { user, loading: authLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyMode, setKeyMode] = useState<"live" | "test">("test");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch("/api/v1/keys");
    if (res.ok) {
      const data = await res.json();
      setKeys(data.data || []);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    const res = await fetch("/api/v1/usage");
    if (res.ok) {
      const data = await res.json();
      setUsage(data);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.data || []);
      } else {
        console.error("Failed to fetch plans:", res.status);
      }
    } catch (err) {
      console.error("Plans fetch error:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchKeys();
      fetchUsage();
    }
    fetchPlans();
  }, [user, fetchKeys, fetchUsage, fetchPlans]);

  const createKey = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: keyName || "My API Key",
          plan_name: "starter",
          is_test: keyMode === "test",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data.key);
        setShowCreateForm(false);
        setKeyName("");
        fetchKeys();
      } else {
        alert("Error creating API key: " + (data.error?.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Create key error:", err);
      alert("Failed to create API key. Check console for details.");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/v1/keys/${keyId}`, { method: "DELETE" });
    fetchKeys();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/30 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/30">
      {/* Navbar */}
      <nav className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-white font-bold text-lg">
                Private<span className="text-violet-400">Pay</span>
              </span>
            </a>
            <span className="text-gray-600 px-2">|</span>
            <span className="text-gray-400 text-sm font-medium">Developer Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/developers/docs" className="text-sm text-gray-400 hover:text-violet-400 transition-colors">
              API Docs
            </a>
            {user ? (
              <span className="text-sm text-gray-400">{user.email}</span>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user ? (
          /* Unauthenticated: Show pricing & CTA */
          <div>
            {/* Hero */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 px-4 py-1.5 rounded-full text-sm mb-6">
                <Zap className="w-4 h-4" />
                Virtual Card Issuing API
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Issue Virtual Cards<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                  via API in Seconds
                </span>
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
                Create, fund, and manage virtual Visa/Mastercard cards programmatically.
                Power your fintech, ad-tech, or commerce platform with PrivatePay&apos;s card issuing API.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25"
                >
                  Get API Keys <ArrowRight className="inline w-4 h-4 ml-1" />
                </button>
                <a
                  href="/developers/docs"
                  className="px-6 py-3 border border-gray-700 text-gray-300 rounded-xl font-semibold hover:border-violet-500/50 hover:text-violet-400 transition-colors"
                >
                  Read Docs
                </a>
              </div>
            </div>

            {/* Code Example */}
            <div className="max-w-2xl mx-auto mb-16">
              <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-700/30">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-gray-400 ml-2">Issue a card in 3 lines</span>
                </div>
                <pre className="p-5 text-sm font-mono overflow-x-auto">
                  <code className="text-gray-300">
{`curl -X POST https://privatepay.site/api/v1/cards \\
  -H "Authorization: Bearer ppay_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100,
    "name_on_card": "JOHN DOE",
    "email": "john@example.com"
  }'`}
                  </code>
                </pre>
                <div className="px-5 pb-5">
                  <pre className="text-xs text-gray-500 bg-gray-800/30 rounded-lg p-3 overflow-x-auto">
{`{
  "card_id": "card_7x1k9m2p",
  "card_number": "4938751800012345",
  "expiry_date": "03/28",
  "cvv": "421",
  "balance": 100.00,
  "status": "active"
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <h2 className="text-3xl font-bold text-white text-center mb-10">Simple, Transparent Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {(plans.length > 0 ? plans : defaultPlans).map((plan, i) => (
                <div
                  key={plan.name}
                  className={`bg-gray-900/80 border rounded-2xl p-6 ${
                    i === 1
                      ? "border-violet-500/50 ring-1 ring-violet-500/20"
                      : "border-gray-800/50"
                  }`}
                >
                  {i === 1 && (
                    <div className="text-xs font-semibold text-violet-400 bg-violet-500/10 rounded-full px-3 py-1 inline-block mb-3">
                      MOST POPULAR
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white mb-1">{plan.display_name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold text-white">${plan.price_monthly.toLocaleString()}</span>
                    <span className="text-gray-500">one-time</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    <li className="text-sm text-gray-300 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-violet-400" />
                      {plan.cards_per_month.toLocaleString()} cards/month
                    </li>
                    <li className="text-sm text-gray-300 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-violet-400" />
                      {plan.requests_per_minute} req/min
                    </li>
                    <li className="text-sm text-gray-300 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-violet-400" />
                      ${plan.card_issue_fee} per card + {plan.markup_percent}% markup
                    </li>
                    <li className="text-sm text-gray-300 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-violet-400" />
                      ${plan.card_fund_fee} per funding
                    </li>
                    {plan.features.webhooks && (
                      <li className="text-sm text-gray-300 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-violet-400" />
                        Webhooks
                      </li>
                    )}
                    {plan.features.ip_whitelist && (
                      <li className="text-sm text-gray-300 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-violet-400" />
                        IP Whitelisting
                      </li>
                    )}
                    {plan.features.priority_support && (
                      <li className="text-sm text-gray-300 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-violet-400" />
                        Priority Support
                      </li>
                    )}
                    {plan.features.dedicated_bin && (
                      <li className="text-sm text-gray-300 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-violet-400" />
                        Dedicated BIN
                      </li>
                    )}
                    {plan.features.custom_branding && (
                      <li className="text-sm text-gray-300 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-violet-400" />
                        Custom Branding
                      </li>
                    )}
                  </ul>
                  <button
                    onClick={() => setShowAuth(true)}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                      i === 1
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                        : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-violet-500/50"
                    }`}
                  >
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Authenticated: Developer Dashboard */
          <div>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Activity className="w-5 h-5 text-violet-400" />}
                label="Total Requests"
                value={usage?.total_requests.toLocaleString() || "0"}
              />
              <StatCard
                icon={<CreditCard className="w-5 h-5 text-violet-400" />}
                label="Cards Issued"
                value={usage?.total_cards.toLocaleString() || "0"}
              />
              <StatCard
                icon={<DollarSign className="w-5 h-5 text-violet-400" />}
                label="Total Volume"
                value={`$${(usage?.total_volume || 0).toLocaleString()}`}
              />
              <StatCard
                icon={<DollarSign className="w-5 h-5 text-violet-400" />}
                label="Card Balances"
                value={`$${(usage?.total_card_balance || 0).toLocaleString()}`}
              />
            </div>

            {/* New Key Alert */}
            {newKey && (
              <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-5 h-5 text-violet-400" />
                  <h3 className="font-semibold text-white">Your New API Key</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Copy this key now. It will not be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-800/60 text-violet-400 px-3 py-2 rounded-lg text-sm font-mono break-all">
                    {newKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey)}
                    className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-gray-300" />
                  </button>
                </div>
                <button
                  onClick={() => setNewKey(null)}
                  className="mt-3 text-xs text-gray-500 hover:text-gray-300"
                >
                  I&apos;ve saved it — dismiss
                </button>
              </div>
            )}

            {/* API Keys */}
            <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-violet-400" />
                  API Keys
                </h2>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  New Key
                </button>
              </div>

              {showCreateForm && (
                <div className="mb-5 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                  <div className="flex gap-3 mb-3">
                    <input
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="Key name (e.g. Production)"
                      className="flex-1 px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                    />
                    <div className="flex rounded-lg overflow-hidden border border-gray-700/50">
                      <button
                        onClick={() => setKeyMode("test")}
                        className={`px-3 py-2 text-xs font-medium ${
                          keyMode === "test"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-gray-800/60 text-gray-400"
                        }`}
                      >
                        Test
                      </button>
                      <button
                        onClick={() => setKeyMode("live")}
                        className={`px-3 py-2 text-xs font-medium ${
                          keyMode === "live"
                            ? "bg-violet-500/20 text-violet-400"
                            : "bg-gray-800/60 text-gray-400"
                        }`}
                      >
                        Live
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={createKey}
                      disabled={creating}
                      className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors disabled:opacity-50"
                    >
                      {creating ? "Creating..." : "Create Key"}
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {keys.length === 0 ? (
                <div className="text-center py-10">
                  <Key className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No API keys yet</p>
                  <p className="text-xs text-gray-600">Create one to start issuing cards via API</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {keys.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between p-4 bg-gray-800/20 rounded-xl border border-gray-700/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white text-sm">{k.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              k.is_test
                                ? "bg-yellow-500/10 text-yellow-400"
                                : "bg-violet-500/10 text-violet-400"
                            }`}
                          >
                            {k.is_test ? "TEST" : "LIVE"}
                          </span>
                          {!k.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
                              REVOKED
                            </span>
                          )}
                        </div>
                        <code className="text-xs text-gray-500 font-mono">{k.key_prefix}</code>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                          <span>{k.total_requests} requests</span>
                          <span>{k.total_cards} cards</span>
                          <span>${k.total_volume.toLocaleString()} volume</span>
                          <span>{k.plan}</span>
                        </div>
                      </div>
                      {k.is_active && (
                        <button
                          onClick={() => revokeKey(k.id)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          title="Revoke key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Start */}
            <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-400" />
                Quick Start
              </h2>
              <div className="space-y-4">
                <CodeBlock
                  title="1. Issue a Card"
                  code={`curl -X POST https://privatepay.site/api/v1/cards \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 50, "name_on_card": "JOHN DOE", "email": "john@example.com"}'`}
                />
                <CodeBlock
                  title="2. Fund a Card"
                  code={`curl -X POST https://privatepay.site/api/v1/cards/CARD_ID/fund \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 25}'`}
                />
                <CodeBlock
                  title="3. Get Card Details"
                  code={`curl https://privatepay.site/api/v1/cards/CARD_ID \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                />
              </div>
              <div className="mt-4">
                <a
                  href="/developers/docs"
                  className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  Full API Documentation <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-medium">{title}</span>
        <button onClick={copy} className="text-xs text-gray-500 hover:text-violet-400 flex items-center gap-1">
          {copied ? "Copied!" : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <pre className="bg-gray-800/40 border border-gray-700/20 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto">
        {code}
      </pre>
    </div>
  );
}

const defaultPlans: PlanData[] = [
  {
    name: "starter",
    display_name: "Starter",
    price_monthly: 2999,
    cards_per_month: 500,
    requests_per_minute: 60,
    card_issue_fee: 20,
    card_fund_fee: 1,
    markup_percent: 3,
    features: { live_cards: true, test_mode: true },
  },
  {
    name: "growth",
    display_name: "Growth",
    price_monthly: 7999,
    cards_per_month: 2500,
    requests_per_minute: 200,
    card_issue_fee: 9,
    card_fund_fee: 1,
    markup_percent: 2,
    features: { live_cards: true, test_mode: true, webhooks: true, ip_whitelist: true, priority_support: true },
  },
];
