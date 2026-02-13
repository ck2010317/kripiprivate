"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/auth-context";
import { AuthModal } from "@/app/components/auth-modal";
import {
  Copy,
  Key,
  Plus,
  Trash2,
  ExternalLink,
  CreditCard,
  Activity,
  DollarSign,
  Shield,
  Zap,
  ArrowRight,
  Wallet,
  Clock,
  Check,
  X,
  Loader2,
  ArrowDownToLine,
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
  wallet_balance: number;
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

interface WalletData {
  balance: number;
  total_deposited: number;
  total_charged: number;
}

interface WalletTx {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  reference: string | null;
  created_at: string;
}

interface PaymentRequest {
  id: string;
  amountUsd: number;
  amountSol: number;
  solPrice: number;
  paymentWallet: string;
  expiresAt: string;
  status: string;
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
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Package purchase state
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<"confirm" | "payment" | "verifying">("confirm");
  const [purchasePayment, setPurchasePayment] = useState<PaymentRequest | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseTimeLeft, setPurchaseTimeLeft] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  // Wallet deposit state
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("100");
  const [depositStep, setDepositStep] = useState<"form" | "payment" | "verifying">("form");
  const [depositPayment, setDepositPayment] = useState<PaymentRequest | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [depositTimeLeft, setDepositTimeLeft] = useState(0);

  // ---- Data fetching ----
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
      }
    } catch (err) {
      console.error("Plans fetch error:", err);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/wallet");
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet);
        setWalletTxs(data.transactions || []);
      }
    } catch (err) {
      console.error("Wallet fetch error:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchKeys();
      fetchUsage();
      fetchWallet();
    }
    fetchPlans();
  }, [user, fetchKeys, fetchUsage, fetchPlans, fetchWallet]);

  // ---- Purchase countdown timer ----
  useEffect(() => {
    if (!purchasePayment?.expiresAt) return;
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor((new Date(purchasePayment.expiresAt).getTime() - Date.now()) / 1000));
      setPurchaseTimeLeft(secs);
      if (secs === 0) {
        setPurchaseError("Payment expired. Please try again.");
        setPurchasePayment(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [purchasePayment?.expiresAt]);

  // ---- Deposit countdown timer ----
  useEffect(() => {
    if (!depositPayment?.expiresAt) return;
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor((new Date(depositPayment.expiresAt).getTime() - Date.now()) / 1000));
      setDepositTimeLeft(secs);
      if (secs === 0) {
        setDepositError("Payment expired. Please try again.");
        setDepositPayment(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [depositPayment?.expiresAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  // ---- Check if user has a live (paid) key ----
  const hasLiveKey = keys.some((k) => !k.is_test && k.is_active);

  // ---- Package Purchase Flow ----
  const startPurchase = (plan: PlanData) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setSelectedPlan(plan);
    setShowPurchase(true);
    setPurchaseStep("confirm");
    setPurchaseError("");
    setPurchasePayment(null);
  };

  const createPurchasePayment = async () => {
    if (!selectedPlan) return;
    setPurchaseLoading(true);
    setPurchaseError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: selectedPlan.price_monthly,
          cardType: "api_package",
          nameOnCard: selectedPlan.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create payment");
      setPurchasePayment(data.payment);
      setPurchaseStep("payment");
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : "Payment creation failed");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const verifyPurchasePayment = async () => {
    if (!purchasePayment || !selectedPlan) return;
    setPurchaseLoading(true);
    setPurchaseError("");
    setPurchaseStep("verifying");
    try {
      const verifyRes = await fetch("/api/payments/auto-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: purchasePayment.id }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        setPurchaseError(verifyData.message || verifyData.error || "Payment not detected yet. Please wait and try again.");
        setPurchaseStep("payment");
        setPurchaseLoading(false);
        return;
      }
      // Payment verified — create the API key
      const keyRes = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${selectedPlan.display_name} Key`,
          plan_name: selectedPlan.name,
          is_test: false,
          payment_id: purchasePayment.id,
        }),
      });
      const keyData = await keyRes.json();
      if (keyRes.ok) {
        setNewKey(keyData.key);
        setShowPurchase(false);
        setPurchasePayment(null);
        setSelectedPlan(null);
        fetchKeys();
        fetchWallet();
      } else {
        setPurchaseError(keyData.error?.message || "Failed to create API key");
        setPurchaseStep("payment");
      }
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : "Verification failed");
      setPurchaseStep("payment");
    } finally {
      setPurchaseLoading(false);
    }
  };

  // ---- Wallet Deposit Flow ----
  const createDepositPayment = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt < 10) { setDepositError("Minimum deposit is $10"); return; }
    if (amt > 50000) { setDepositError("Maximum deposit is $50,000"); return; }
    setDepositLoading(true);
    setDepositError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: amt,
          cardType: "api_deposit",
          nameOnCard: "wallet_deposit",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create payment");
      setDepositPayment(data.payment);
      setDepositStep("payment");
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : "Payment creation failed");
    } finally {
      setDepositLoading(false);
    }
  };

  const verifyDepositPayment = async () => {
    if (!depositPayment) return;
    setDepositLoading(true);
    setDepositError("");
    setDepositStep("verifying");
    try {
      const verifyRes = await fetch("/api/payments/auto-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: depositPayment.id }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        setDepositError(verifyData.message || verifyData.error || "Payment not detected yet. Wait and try again.");
        setDepositStep("payment");
        setDepositLoading(false);
        return;
      }
      // Payment verified — credit wallet
      const creditRes = await fetch("/api/v1/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: depositPayment.id, amount: depositPayment.amountUsd }),
      });
      const creditData = await creditRes.json();
      if (creditRes.ok) {
        setShowDeposit(false);
        setDepositPayment(null);
        setDepositStep("form");
        setDepositAmount("100");
        fetchWallet();
        fetchKeys();
      } else {
        setDepositError(creditData.error?.message || creditData.error || "Failed to credit wallet");
        setDepositStep("payment");
      }
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : "Verification failed");
      setDepositStep("payment");
    } finally {
      setDepositLoading(false);
    }
  };

  // ---- Create test key (free) ----
  const createTestKey = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName || "Test Key", plan_name: "starter", is_test: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data.key);
        setShowCreateForm(false);
        setKeyName("");
        fetchKeys();
      } else {
        alert("Error: " + (data.error?.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Create key error:", err);
      alert("Failed to create test key.");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/v1/keys/${keyId}`, { method: "DELETE" });
    fetchKeys();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/30 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // amount for deposit (used in verify callback)
  const amt = parseFloat(depositAmount) || 0;

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
              <span className="text-white font-bold text-lg">Private<span className="text-violet-400">Pay</span></span>
            </a>
            <span className="text-gray-600 px-2">|</span>
            <span className="text-gray-400 text-sm font-medium">Developer Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/developers/docs" className="text-sm text-gray-400 hover:text-violet-400 transition-colors">API Docs</a>
            {user ? (
              <span className="text-sm text-gray-400">{user.email}</span>
            ) : (
              <button onClick={() => setShowAuth(true)} className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors">
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user ? (
          /* ===================== UNAUTHENTICATED ===================== */
          <div>
            {/* Hero */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 px-4 py-1.5 rounded-full text-sm mb-6">
                <Zap className="w-4 h-4" /> Virtual Card Issuing API
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Issue Virtual Cards<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">via API in Seconds</span>
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
                Create, fund, and manage virtual Visa/Mastercard cards programmatically.
                Power your fintech, ad-tech, or commerce platform with PrivatePay&apos;s card issuing API.
              </p>
              <div className="flex justify-center gap-4">
                <button onClick={() => setShowAuth(true)} className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25">
                  Get API Keys <ArrowRight className="inline w-4 h-4 ml-1" />
                </button>
                <a href="/developers/docs" className="px-6 py-3 border border-gray-700 text-gray-300 rounded-xl font-semibold hover:border-violet-500/50 hover:text-violet-400 transition-colors">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
              {(plans.length > 0 ? plans : defaultPlans).map((plan, i) => (
                <PricingCard key={plan.name} plan={plan} featured={i === 1} onBuy={() => startPurchase(plan)} />
              ))}
            </div>
          </div>
        ) : (
          /* ===================== AUTHENTICATED: Dashboard ===================== */
          <div>
            {/* Wallet Balance Banner */}
            <div className="bg-gradient-to-r from-violet-900/40 to-purple-900/40 border border-violet-500/20 rounded-2xl p-6 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-5 h-5 text-violet-400" />
                    <span className="text-sm text-gray-400 uppercase tracking-wider">Wallet Balance</span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    ${(wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>Deposited: ${(wallet?.total_deposited || 0).toLocaleString()}</span>
                    <span>Used: ${(wallet?.total_charged || 0).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setShowDeposit(true); setDepositStep("form"); setDepositError(""); }}
                  className="px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all flex items-center gap-2"
                >
                  <ArrowDownToLine className="w-4 h-4" /> Deposit Funds
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <StatCard icon={<Activity className="w-5 h-5 text-violet-400" />} label="Total Requests" value={usage?.total_requests.toLocaleString() || "0"} />
              <StatCard icon={<CreditCard className="w-5 h-5 text-violet-400" />} label="Cards Issued" value={usage?.total_cards.toLocaleString() || "0"} />
              <StatCard icon={<DollarSign className="w-5 h-5 text-violet-400" />} label="Total Volume" value={`$${(usage?.total_volume || 0).toLocaleString()}`} />
              <StatCard icon={<DollarSign className="w-5 h-5 text-violet-400" />} label="Card Balances" value={`$${(usage?.total_card_balance || 0).toLocaleString()}`} />
            </div>

            {/* New Key Alert */}
            {newKey && (
              <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-5 h-5 text-violet-400" />
                  <h3 className="font-semibold text-white">Your New API Key</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">Copy this key now. It will not be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-800/60 text-violet-400 px-3 py-2 rounded-lg text-sm font-mono break-all">{newKey}</code>
                  <button onClick={() => copyText(newKey, "newkey")} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                    {copied === "newkey" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-300" />}
                  </button>
                </div>
                <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-gray-500 hover:text-gray-300">I&apos;ve saved it — dismiss</button>
              </div>
            )}

            {/* API Keys */}
            <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-violet-400" /> API Keys
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => { setShowCreateForm(true); }} className="px-3 py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg text-xs font-medium hover:bg-yellow-500/20 transition-colors flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Test Key (Free)
                  </button>
                  {!hasLiveKey ? (
                    <button onClick={() => startPurchase(plans[0] || defaultPlans[0])} className="px-3 py-2 bg-violet-500 text-white rounded-lg text-xs font-medium hover:bg-violet-600 transition-colors flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Buy Package for Live Key
                    </button>
                  ) : (
                    <span className="px-3 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Live Key Active
                    </span>
                  )}
                </div>
              </div>

              {showCreateForm && (
                <div className="mb-5 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                  <div className="flex gap-3 mb-3">
                    <input type="text" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Key name (e.g. My Test App)" className="flex-1 px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500/50" />
                    <span className="px-3 py-2 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400">TEST</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Test keys generate fake cards — no charges, no wallet deduction.</p>
                  <div className="flex gap-2">
                    <button onClick={createTestKey} disabled={creating} className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors disabled:opacity-50">
                      {creating ? "Creating..." : "Create Test Key"}
                    </button>
                    <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              {keys.length === 0 ? (
                <div className="text-center py-10">
                  <Key className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No API keys yet</p>
                  <p className="text-xs text-gray-600">Buy a package to get your live API key, or create a free test key</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {keys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between p-4 bg-gray-800/20 rounded-xl border border-gray-700/20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white text-sm">{k.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${k.is_test ? "bg-yellow-500/10 text-yellow-400" : "bg-violet-500/10 text-violet-400"}`}>
                            {k.is_test ? "TEST" : "LIVE"}
                          </span>
                          {!k.is_active && <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">REVOKED</span>}
                        </div>
                        <code className="text-xs text-gray-500 font-mono">{k.key_prefix}</code>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                          <span>{k.total_requests} requests</span>
                          <span>{k.total_cards} cards</span>
                          <span>${k.total_volume.toLocaleString()} vol</span>
                          <span>{k.plan}</span>
                        </div>
                      </div>
                      {k.is_active && (
                        <button onClick={() => revokeKey(k.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors" title="Revoke key">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wallet Transactions */}
            {walletTxs.length > 0 && (
              <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6 mb-8">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-violet-400" /> Wallet Transactions
                </h2>
                <div className="space-y-2">
                  {walletTxs.slice(0, 10).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-3 px-4 bg-gray-800/20 rounded-lg border border-gray-700/10">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          tx.type === "deposit" ? "bg-green-500/10 text-green-400" : tx.type === "refund" ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"
                        }`}>{tx.type.replace("_", " ").toUpperCase()}</span>
                        <span className="text-sm text-gray-300">{tx.description}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${tx.type === "deposit" || tx.type === "refund" ? "text-green-400" : "text-red-400"}`}>
                          {tx.type === "deposit" || tx.type === "refund" ? "+" : "-"}${tx.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-600">Bal: ${tx.balance_after.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Start */}
            <div className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-400" /> Quick Start
              </h2>
              <div className="space-y-4">
                <CodeBlock title="1. Issue a Card" code={`curl -X POST https://privatepay.site/api/v1/cards \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount": 50, "name_on_card": "JOHN DOE", "email": "john@example.com"}'`} />
                <CodeBlock title="2. Fund a Card" code={`curl -X POST https://privatepay.site/api/v1/cards/CARD_ID/fund \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount": 25}'`} />
                <CodeBlock title="3. Get Card Details" code={`curl https://privatepay.site/api/v1/cards/CARD_ID \\\n  -H "Authorization: Bearer YOUR_API_KEY"`} />
              </div>
              <div className="mt-4">
                <a href="/developers/docs" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  Full API Documentation <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================== PURCHASE MODAL ===================== */}
      {showPurchase && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">Buy {selectedPlan.display_name} Package</h2>
              <button onClick={() => { setShowPurchase(false); setPurchasePayment(null); }} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              {purchaseError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{purchaseError}</div>}

              {purchaseStep === "confirm" && (
                <div>
                  <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                    <div className="text-2xl font-bold text-white mb-1">${selectedPlan.price_monthly.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">One-time package fee</div>
                    <div className="mt-3 space-y-1 text-sm text-gray-300">
                      <div>• {selectedPlan.cards_per_month.toLocaleString()} cards/month</div>
                      <div>• ${selectedPlan.card_issue_fee} card fee + {selectedPlan.markup_percent}% + ${selectedPlan.card_fund_fee} per top-up</div>
                      <div>• {selectedPlan.requests_per_minute} req/min rate limit</div>
                      <div>• Customizable fees for your users</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Pay with SOL (Solana). After verification you&apos;ll get your live API key instantly.</p>
                  <button onClick={createPurchasePayment} disabled={purchaseLoading} className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {purchaseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    {purchaseLoading ? "Creating payment..." : "Pay with SOL"}
                  </button>
                </div>
              )}

              {purchaseStep === "payment" && purchasePayment && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">Time remaining</span>
                    <span className={`text-sm font-mono font-bold ${purchaseTimeLeft < 120 ? "text-red-400" : "text-green-400"}`}>
                      <Clock className="w-3 h-3 inline mr-1" />{formatTime(purchaseTimeLeft)}
                    </span>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 space-y-3 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Send exactly</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-white">{purchasePayment.amountSol.toFixed(6)} SOL</span>
                        <button onClick={() => copyText(purchasePayment.amountSol.toFixed(6), "sol")} className="p-1.5 bg-gray-700 rounded-lg hover:bg-gray-600">
                          {copied === "sol" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">≈ ${purchasePayment.amountUsd.toFixed(2)} USD at ${purchasePayment.solPrice.toFixed(2)}/SOL</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">To this wallet address</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs text-violet-400 font-mono bg-gray-900/50 px-2 py-1.5 rounded break-all">{purchasePayment.paymentWallet}</code>
                        <button onClick={() => copyText(purchasePayment.paymentWallet, "addr")} className="p-1.5 bg-gray-700 rounded-lg hover:bg-gray-600">
                          {copied === "addr" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button onClick={verifyPurchasePayment} disabled={purchaseLoading} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {purchaseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {purchaseLoading ? "Checking..." : "I've Sent the Payment — Verify"}
                  </button>
                </div>
              )}

              {purchaseStep === "verifying" && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
                  <p className="text-gray-300">Verifying payment on Solana...</p>
                  <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== DEPOSIT MODAL ===================== */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">Deposit Funds to Wallet</h2>
              <button onClick={() => { setShowDeposit(false); setDepositPayment(null); setDepositStep("form"); }} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              {depositError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{depositError}</div>}

              {depositStep === "form" && (
                <div>
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 mb-2 block">Deposit Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} min="10" placeholder="100" className="w-full pl-8 pr-4 py-3 bg-gray-800/60 border border-gray-700/50 rounded-xl text-white text-lg focus:outline-none focus:border-violet-500/50" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Min $10. This funds your wallet for card issuance & top-ups.</p>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {[100, 500, 1000, 5000].map((a) => (
                      <button key={a} onClick={() => setDepositAmount(a.toString())} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${depositAmount === a.toString() ? "bg-violet-500/20 border-violet-500/50 text-violet-400" : "bg-gray-800/40 border-gray-700/30 text-gray-400 hover:border-violet-500/30"}`}>
                        ${a.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <button onClick={createDepositPayment} disabled={depositLoading} className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {depositLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    {depositLoading ? "Creating..." : `Deposit $${(parseFloat(depositAmount) || 0).toLocaleString()} via SOL`}
                  </button>
                </div>
              )}

              {depositStep === "payment" && depositPayment && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">Time remaining</span>
                    <span className={`text-sm font-mono font-bold ${depositTimeLeft < 120 ? "text-red-400" : "text-green-400"}`}>
                      <Clock className="w-3 h-3 inline mr-1" />{formatTime(depositTimeLeft)}
                    </span>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 space-y-3 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Send exactly</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-white">{depositPayment.amountSol.toFixed(6)} SOL</span>
                        <button onClick={() => copyText(depositPayment.amountSol.toFixed(6), "dsol")} className="p-1.5 bg-gray-700 rounded-lg hover:bg-gray-600">
                          {copied === "dsol" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">≈ ${depositPayment.amountUsd.toFixed(2)} USD</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">To this wallet address</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs text-violet-400 font-mono bg-gray-900/50 px-2 py-1.5 rounded break-all">{depositPayment.paymentWallet}</code>
                        <button onClick={() => copyText(depositPayment.paymentWallet, "daddr")} className="p-1.5 bg-gray-700 rounded-lg hover:bg-gray-600">
                          {copied === "daddr" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button onClick={verifyDepositPayment} disabled={depositLoading} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {depositLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {depositLoading ? "Checking..." : "I've Sent the Payment — Verify"}
                  </button>
                </div>
              )}

              {depositStep === "verifying" && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
                  <p className="text-gray-300">Verifying deposit on Solana...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}

// ---- Helper Components ----

function PricingCard({ plan, featured, onBuy }: { plan: PlanData; featured: boolean; onBuy: () => void }) {
  return (
    <div className={`bg-gray-900/80 border rounded-2xl p-6 ${featured ? "border-violet-500/50 ring-1 ring-violet-500/20" : "border-gray-800/50"}`}>
      {featured && <div className="text-xs font-semibold text-violet-400 bg-violet-500/10 rounded-full px-3 py-1 inline-block mb-3">MOST POPULAR</div>}
      <h3 className="text-xl font-bold text-white mb-1">{plan.display_name}</h3>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-3xl font-bold text-white">${plan.price_monthly.toLocaleString()}</span>
        <span className="text-gray-500">one-time</span>
      </div>
      <ul className="space-y-2 mb-6">
        <li className="text-sm text-gray-300 flex items-center gap-2"><CreditCard className="w-4 h-4 text-violet-400" />{plan.cards_per_month.toLocaleString()} cards/month</li>
        <li className="text-sm text-gray-300 flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" />{plan.requests_per_minute} req/min</li>
        <li className="text-sm text-gray-300 flex items-center gap-2"><DollarSign className="w-4 h-4 text-violet-400" />${plan.card_issue_fee} card issuance fee</li>
        <li className="text-sm text-gray-300 flex items-center gap-2"><DollarSign className="w-4 h-4 text-violet-400" />{plan.markup_percent}% + ${plan.card_fund_fee} per top-up</li>
        <li className="text-sm text-gray-400 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-600" />Min top-up: $10</li>
        <li className="text-sm text-violet-300 flex items-center gap-2"><Zap className="w-4 h-4 text-violet-400" />Customizable fees</li>
        {plan.features.webhooks && <li className="text-sm text-gray-300 flex items-center gap-2"><Zap className="w-4 h-4 text-violet-400" />Webhooks</li>}
        {plan.features.ip_whitelist && <li className="text-sm text-gray-300 flex items-center gap-2"><Shield className="w-4 h-4 text-violet-400" />IP Whitelisting</li>}
        {plan.features.priority_support && <li className="text-sm text-gray-300 flex items-center gap-2"><Shield className="w-4 h-4 text-violet-400" />Priority Support</li>}
      </ul>
      <button onClick={onBuy} className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${featured ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700" : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-violet-500/50"}`}>
        Buy Package — ${plan.price_monthly.toLocaleString()}
      </button>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-900/80 border border-gray-800/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span></div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-medium">{title}</span>
        <button onClick={copy} className="text-xs text-gray-500 hover:text-violet-400 flex items-center gap-1">
          {isCopied ? "Copied!" : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <pre className="bg-gray-800/40 border border-gray-700/20 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto">{code}</pre>
    </div>
  );
}

const defaultPlans: PlanData[] = [
  {
    name: "starter", display_name: "Starter", price_monthly: 2999, cards_per_month: 500,
    requests_per_minute: 60, card_issue_fee: 20, card_fund_fee: 1, markup_percent: 3,
    features: { live_cards: true, test_mode: true },
  },
  {
    name: "growth", display_name: "Growth", price_monthly: 7999, cards_per_month: 2500,
    requests_per_minute: 200, card_issue_fee: 9, card_fund_fee: 1, markup_percent: 2,
    features: { live_cards: true, test_mode: true, webhooks: true, ip_whitelist: true, priority_support: true },
  },
];
