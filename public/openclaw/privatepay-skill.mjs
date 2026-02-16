// PrivatePay Skill for OpenClaw
// This skill lets you check your PrivatePay cards, balances, payments, and referrals
// from your personal AI agent. Your data stays on YOUR machine.
//
// Setup:
//   1. Go to https://privatepay.site → Dashboard → OpenClaw Integration
//   2. Generate a Personal Access Token
//   3. Set PRIVATEPAY_TOKEN in your OpenClaw environment
//   4. Copy this skill file to your OpenClaw skills directory

const PRIVATEPAY_API = process.env.PRIVATEPAY_API_URL || "https://privatepay.site";
const PRIVATEPAY_TOKEN = process.env.PRIVATEPAY_TOKEN;

if (!PRIVATEPAY_TOKEN) {
  console.warn(
    "⚠️  PRIVATEPAY_TOKEN not set. Get one from https://privatepay.site → Dashboard → OpenClaw Integration"
  );
}

// Helper: make authenticated request to PrivatePay
async function ppayFetch(endpoint, params = {}) {
  const url = new URL(`${PRIVATEPAY_API}/api/openclaw${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${PRIVATEPAY_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `PrivatePay API error: ${response.status}`
    );
  }

  return response.json();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SKILL: Get Account Overview
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function getOverview() {
  const data = await ppayFetch("/me/overview");
  const o = data.overview;

  let summary = `📊 **PrivatePay Account Overview**\n`;
  summary += `👤 ${o.user.name} (${o.user.email})\n\n`;
  summary += `💳 **Cards:** ${o.cards.active} active of ${o.cards.total} total\n`;
  summary += `💰 **Total Balance:** $${o.cards.total_balance_usd.toFixed(2)}\n\n`;

  if (o.cards.list.length > 0) {
    summary += `**Your Cards:**\n`;
    o.cards.list.forEach((card) => {
      const statusEmoji =
        card.status === "ACTIVE" ? "🟢" : card.status === "FROZEN" ? "🔵" : "🔴";
      summary += `  ${statusEmoji} •••• ${card.last_four} — $${card.balance.toFixed(2)} (${card.name})\n`;
    });
    summary += `\n`;
  }

  summary += `📄 **Recent Payments:** ${o.payments.completed} completed, ${o.payments.pending} pending\n`;

  if (o.referrals) {
    summary += `🎁 **Referrals:** ${o.referrals.total_referred} referred | $${o.referrals.total_earnings_usd.toFixed(2)} earned | ${o.referrals.total_points} pts\n`;
    if (o.referrals.code) {
      summary += `📎 Share link: https://privatepay.site?ref=${o.referrals.code}\n`;
    }
  }

  return summary;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SKILL: Get Card Balances
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function getCards({ sync = false, showFull = false } = {}) {
  const data = await ppayFetch("/me/cards", {
    sync: sync ? "true" : undefined,
    full: showFull ? "true" : undefined,
  });

  let summary = `💳 **Your PrivatePay Cards**\n`;
  summary += `Total: ${data.summary.total_cards} | Active: ${data.summary.active_cards} | Balance: $${data.summary.total_balance.toFixed(2)}\n\n`;

  data.cards.forEach((card) => {
    const statusEmoji =
      card.status === "ACTIVE" ? "🟢" : card.status === "FROZEN" ? "🔵" : "🔴";
    summary += `${statusEmoji} **${card.name_on_card}**\n`;
    summary += `   Number: ${card.card_number}\n`;
    summary += `   Expires: ${card.expiry_date}\n`;
    summary += `   CVV: ${card.cvv}\n`;
    summary += `   Balance: $${card.balance.toFixed(2)}\n`;
    summary += `   Status: ${card.status}\n\n`;
  });

  return summary;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SKILL: Get Card Transactions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function getCardTransactions(cardId, { limit = 20 } = {}) {
  if (!cardId) {
    return "❌ Please provide a card ID. Use `getCards()` to see your card IDs.";
  }

  const data = await ppayFetch(`/me/cards/${cardId}/transactions`, { limit });

  let summary = `📜 **Transactions for ${data.card_name}** (${data.card_status})\n\n`;

  if (data.transactions.length === 0) {
    summary += "No transactions found.\n";
    return summary;
  }

  data.transactions.forEach((tx) => {
    const typeEmoji = {
      FUND: "💰",
      SPEND: "🛒",
      FREEZE: "🧊",
      UNFREEZE: "☀️",
      REFUND: "↩️",
      BALANCE_SYNC: "🔄",
    }[tx.type] || "📝";

    const sign = tx.type === "SPEND" ? "-" : "+";
    const date = new Date(tx.created_at).toLocaleDateString();
    summary += `${typeEmoji} ${date} | ${sign}$${Math.abs(tx.amount).toFixed(2)} | ${tx.description || tx.type} (${tx.status})\n`;
  });

  return summary;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SKILL: Get Payment History
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function getPayments({ limit = 10, status = null } = {}) {
  const data = await ppayFetch("/me/payments", { limit, status });

  let summary = `💸 **Payment History**\n`;
  summary += `Total spent: $${data.summary.total_spent_usd.toFixed(2)} | Pending: $${data.summary.total_pending_usd.toFixed(2)}\n`;
  summary += `Completed: ${data.summary.completed} | Pending: ${data.summary.pending}\n\n`;

  if (data.payments.length === 0) {
    summary += "No payments found.\n";
    return summary;
  }

  data.payments.forEach((p) => {
    const statusEmoji = {
      PENDING: "⏳",
      CONFIRMING: "🔄",
      VERIFIED: "✅",
      COMPLETED: "✅",
      EXPIRED: "⏰",
      FAILED: "❌",
    }[p.status] || "📝";

    const date = new Date(p.created_at).toLocaleDateString();
    summary += `${statusEmoji} ${date} | $${p.amount_usd.toFixed(2)} (${p.amount_sol.toFixed(4)} SOL) | ${p.type} | ${p.status}\n`;
  });

  return summary;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SKILL: Get Referral Info
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function getReferrals() {
  const data = await ppayFetch("/me/referrals");

  let summary = `🎁 **Referral Dashboard**\n\n`;
  summary += `📎 Your Code: ${data.referral.code || "Not generated yet"}\n`;
  if (data.referral.share_link) {
    summary += `🔗 Share Link: ${data.referral.share_link}\n`;
  }
  summary += `\n`;
  summary += `💰 Earnings: $${data.referral.total_earnings_usd.toFixed(2)}\n`;
  summary += `⭐ Points: ${data.referral.total_points}\n`;
  summary += `👥 Cards Referred: ${data.referral.total_referred_cards}\n\n`;

  if (data.recent_referrals.length > 0) {
    summary += `**Recent Referrals:**\n`;
    data.recent_referrals.forEach((r) => {
      const date = new Date(r.created_at).toLocaleDateString();
      summary += `  ${date} | ${r.referred_email} | +$${r.reward_usd.toFixed(2)} | +${r.points} pts\n`;
    });
  }

  return summary;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SKILL: Quick Balance Check
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function checkBalance() {
  const data = await ppayFetch("/me/cards", { sync: "true" });

  if (data.cards.length === 0) {
    return "💳 You have no cards yet. Visit https://privatepay.site to create one!";
  }

  let summary = `💰 **Quick Balance Check**\n`;
  summary += `Total: $${data.summary.total_balance.toFixed(2)} across ${data.summary.active_cards} active card(s)\n\n`;

  data.cards
    .filter((c) => c.status === "ACTIVE")
    .forEach((card) => {
      summary += `  •••• ${card.card_number.slice(-4)} — $${card.balance.toFixed(2)}\n`;
    });

  return summary;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Skill metadata for OpenClaw
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const metadata = {
  name: "privatepay",
  description:
    "Check your PrivatePay card balances, transactions, payments, and referral stats. Privacy-first, non-KYC virtual cards powered by Solana.",
  version: "1.0.0",
  author: "PrivatePay",
  website: "https://privatepay.site",
  requiredEnv: ["PRIVATEPAY_TOKEN"],
  commands: {
    getOverview: {
      description: "Get a full overview of your PrivatePay account",
      examples: [
        "What's my PrivatePay overview?",
        "Show me my PrivatePay account",
        "PrivatePay summary",
      ],
    },
    getCards: {
      description: "List all your virtual cards with balances",
      parameters: {
        sync: "Sync live balances from KripiCard (default: false)",
        showFull: "Show full card numbers (default: false)",
      },
      examples: [
        "Show my PrivatePay cards",
        "What are my card balances?",
        "Show my full card details",
      ],
    },
    getCardTransactions: {
      description: "Get transaction history for a specific card",
      parameters: {
        cardId: "The card ID (required)",
        limit: "Number of transactions to show (default: 20)",
      },
      examples: [
        "Show transactions for my first card",
        "What did I spend on my PrivatePay card?",
      ],
    },
    getPayments: {
      description: "Get your Solana payment history",
      parameters: {
        limit: "Number of payments to show (default: 10)",
        status: "Filter by status: PENDING, COMPLETED, FAILED",
      },
      examples: [
        "Show my PrivatePay payments",
        "Any pending payments?",
      ],
    },
    getReferrals: {
      description: "Get your referral stats and share link",
      examples: [
        "What's my referral code?",
        "How much have I earned from referrals?",
      ],
    },
    checkBalance: {
      description: "Quick check of all card balances (syncs live)",
      examples: [
        "What's my PrivatePay balance?",
        "How much money do I have on my cards?",
        "Check my balance",
      ],
    },
  },
};
