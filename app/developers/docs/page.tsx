"use client";

import { useState } from "react";
import {
  ChevronRight,
  CreditCard,
  DollarSign,
  Key,
  Shield,
  Zap,
  Copy,
  ExternalLink,
} from "lucide-react";

const BASE_URL = "https://privatepay.site";

interface Endpoint {
  method: string;
  path: string;
  title: string;
  description: string;
  auth: boolean;
  params?: Array<{ name: string; type: string; required: boolean; description: string }>;
  body?: Array<{ name: string; type: string; required: boolean; description: string }>;
  response: string;
  example_curl?: string;
}

const endpoints: Record<string, Endpoint[]> = {
  cards: [
    {
      method: "POST",
      path: "/api/v1/cards",
      title: "Issue a Card",
      description: "Create a new virtual Visa/Mastercard card with an initial balance. Cards are issued instantly and ready to use for online purchases worldwide.",
      auth: true,
      body: [
        { name: "amount", type: "number", required: true, description: "Initial card balance in USD ($10-$10,000)" },
        { name: "name_on_card", type: "string", required: true, description: "Cardholder name (2+ characters, auto-uppercased)" },
        { name: "email", type: "string", required: true, description: "Cardholder email address" },
        { name: "external_id", type: "string", required: false, description: "Your internal reference ID" },
        { name: "metadata", type: "object", required: false, description: "Custom JSON metadata" },
      ],
      response: `{
  "id": "clx1234567890",
  "card_id": "card_7x1k9m2p",
  "card_number": "4938751800012345",
  "expiry_date": "03/28",
  "cvv": "421",
  "name_on_card": "JOHN DOE",
  "balance": 100.00,
  "status": "active",
  "external_id": null,
  "fee": 8.00,
  "test": false,
  "created_at": "2026-02-12T10:30:00.000Z"
}`,
      example_curl: `curl -X POST ${BASE_URL}/api/v1/cards \\
  -H "Authorization: Bearer ppay_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100,
    "name_on_card": "JOHN DOE",
    "email": "john@example.com"
  }'`,
    },
    {
      method: "GET",
      path: "/api/v1/cards",
      title: "List Cards",
      description: "Retrieve a paginated list of all cards created with your API key.",
      auth: true,
      params: [
        { name: "limit", type: "number", required: false, description: "Results per page (1-100, default: 20)" },
        { name: "offset", type: "number", required: false, description: "Pagination offset (default: 0)" },
        { name: "status", type: "string", required: false, description: "Filter by status: active, frozen, cancelled" },
      ],
      response: `{
  "data": [
    {
      "id": "clx1234567890",
      "card_id": "card_7x1k9m2p",
      "card_number": "4938751800012345",
      "expiry_date": "03/28",
      "cvv": "421",
      "name_on_card": "JOHN DOE",
      "balance": 85.50,
      "status": "active",
      "external_id": null,
      "metadata": null,
      "created_at": "2026-02-12T10:30:00.000Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0,
  "has_more": true
}`,
      example_curl: `curl ${BASE_URL}/api/v1/cards?limit=10 \\
  -H "Authorization: Bearer ppay_live_xxx"`,
    },
    {
      method: "GET",
      path: "/api/v1/cards/:id",
      title: "Get Card",
      description: "Retrieve a single card's details with live balance from the card network.",
      auth: true,
      response: `{
  "id": "clx1234567890",
  "card_id": "card_7x1k9m2p",
  "card_number": "4938751800012345",
  "expiry_date": "03/28",
  "cvv": "421",
  "name_on_card": "JOHN DOE",
  "balance": 85.50,
  "status": "active",
  "external_id": null,
  "metadata": null,
  "created_at": "2026-02-12T10:30:00.000Z",
  "updated_at": "2026-02-12T12:00:00.000Z"
}`,
      example_curl: `curl ${BASE_URL}/api/v1/cards/clx1234567890 \\
  -H "Authorization: Bearer ppay_live_xxx"`,
    },
    {
      method: "PATCH",
      path: "/api/v1/cards/:id",
      title: "Update Card",
      description: "Freeze, unfreeze, or update metadata on a card.",
      auth: true,
      body: [
        { name: "action", type: "string", required: false, description: '"freeze" or "unfreeze"' },
        { name: "external_id", type: "string", required: false, description: "Update external reference" },
        { name: "metadata", type: "object", required: false, description: "Update custom metadata" },
      ],
      response: `{
  "id": "clx1234567890",
  "card_id": "card_7x1k9m2p",
  "status": "frozen",
  "message": "Card frozen successfully."
}`,
      example_curl: `curl -X PATCH ${BASE_URL}/api/v1/cards/clx1234567890 \\
  -H "Authorization: Bearer ppay_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "freeze"}'`,
    },
  ],
  funding: [
    {
      method: "POST",
      path: "/api/v1/cards/:id/fund",
      title: "Fund Card",
      description: "Add funds to an existing active card.",
      auth: true,
      body: [
        { name: "amount", type: "number", required: true, description: "Amount to add in USD ($1-$10,000)" },
      ],
      response: `{
  "id": "clx1234567890",
  "card_id": "card_7x1k9m2p",
  "amount_funded": 50.00,
  "fee": 2.00,
  "previous_balance": 35.50,
  "new_balance": 85.50,
  "test": false
}`,
      example_curl: `curl -X POST ${BASE_URL}/api/v1/cards/clx1234567890/fund \\
  -H "Authorization: Bearer ppay_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 50}'`,
    },
  ],
  transactions: [
    {
      method: "GET",
      path: "/api/v1/cards/:id/transactions",
      title: "Card Transactions",
      description: "Retrieve transaction history for a card including purchases, refunds, and funding.",
      auth: true,
      response: `{
  "data": [
    {
      "id": "txn_001",
      "type": "purchase",
      "amount": 14.99,
      "description": "SPOTIFY PREMIUM",
      "merchant": "Spotify",
      "status": "completed",
      "currency": "USD",
      "date": "2026-02-12T15:30:00.000Z"
    }
  ],
  "total": 5
}`,
      example_curl: `curl ${BASE_URL}/api/v1/cards/clx1234567890/transactions \\
  -H "Authorization: Bearer ppay_live_xxx"`,
    },
  ],
};

export default function ApiDocs() {
  const [activeSection, setActiveSection] = useState("overview");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
            <span className="text-gray-400 text-sm font-medium">API Reference</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/developers" className="text-sm text-gray-400 hover:text-violet-400 transition-colors">
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 border-r border-gray-800/30 min-h-screen sticky top-16 py-8 px-4">
          <nav className="space-y-1">
            <SidebarItem
              active={activeSection === "overview"}
              onClick={() => setActiveSection("overview")}
              label="Overview"
            />
            <SidebarItem
              active={activeSection === "authentication"}
              onClick={() => setActiveSection("authentication")}
              label="Authentication"
            />
            <SidebarItem
              active={activeSection === "errors"}
              onClick={() => setActiveSection("errors")}
              label="Error Handling"
            />
            <SidebarItem
              active={activeSection === "rate-limiting"}
              onClick={() => setActiveSection("rate-limiting")}
              label="Rate Limiting"
            />
            <div className="pt-4 pb-2">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Endpoints</span>
            </div>
            <SidebarItem
              active={activeSection === "cards"}
              onClick={() => setActiveSection("cards")}
              label="Cards"
              icon={<CreditCard className="w-4 h-4" />}
            />
            <SidebarItem
              active={activeSection === "funding"}
              onClick={() => setActiveSection("funding")}
              label="Funding"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <SidebarItem
              active={activeSection === "transactions"}
              onClick={() => setActiveSection("transactions")}
              label="Transactions"
              icon={<Zap className="w-4 h-4" />}
            />
            <div className="pt-4 pb-2">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Guides</span>
            </div>
            <SidebarItem
              active={activeSection === "test-mode"}
              onClick={() => setActiveSection("test-mode")}
              label="Test Mode"
            />
            <SidebarItem
              active={activeSection === "webhooks"}
              onClick={() => setActiveSection("webhooks")}
              label="Webhooks"
            />
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 py-8 px-4 sm:px-8 lg:px-12 max-w-4xl">
          {activeSection === "overview" && (
            <Section title="API Overview">
              <p className="text-gray-300 mb-4">
                The PrivatePay API lets you issue, fund, and manage virtual debit cards programmatically.
                Use it to power your fintech platform, ad-tech operations, or any application that needs
                virtual card issuing.
              </p>
              <InfoBox>
                <strong>Base URL:</strong>{" "}
                <code className="text-violet-400">{BASE_URL}/api/v1</code>
              </InfoBox>
              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Capabilities</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <span><strong>Issue Cards</strong> — Create Visa/Mastercard virtual cards instantly with $10-$10,000 balance</span>
                </li>
                <li className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <span><strong>Fund Cards</strong> — Add funds to existing cards on demand</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <span><strong>Freeze/Unfreeze</strong> — Control card access instantly</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <span><strong>Transactions</strong> — View real-time card spending data</span>
                </li>
                <li className="flex items-start gap-2">
                  <Key className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <span><strong>Test Mode</strong> — Full sandbox with test API keys</span>
                </li>
              </ul>
            </Section>
          )}

          {activeSection === "authentication" && (
            <Section title="Authentication">
              <p className="text-gray-300 mb-4">
                All API requests require a valid API key. Pass it in the <code className="text-violet-400">Authorization</code> header:
              </p>
              <CodeBlock
                code={`Authorization: Bearer ppay_live_xxxxxxxxxxxxx`}
                id="auth-header"
                onCopy={copy}
                copied={copiedId === "auth-header"}
              />
              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Key Prefixes</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-gray-800/20 rounded-lg">
                  <code className="text-violet-400 text-sm">ppay_live_</code>
                  <span className="text-sm text-gray-300">Live mode — real cards, real money</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-800/20 rounded-lg">
                  <code className="text-yellow-400 text-sm">ppay_test_</code>
                  <span className="text-sm text-gray-300">Test mode — sandbox cards, no charges</span>
                </div>
              </div>
            </Section>
          )}

          {activeSection === "errors" && (
            <Section title="Error Handling">
              <p className="text-gray-300 mb-4">
                Errors are returned with appropriate HTTP status codes and a consistent JSON structure:
              </p>
              <CodeBlock
                code={`{
  "error": {
    "code": "invalid_amount",
    "message": "amount must be at least $10."
  }
}`}
                id="error-format"
                onCopy={copy}
                copied={copiedId === "error-format"}
              />
              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Status Codes</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 text-gray-400 font-medium">Code</th>
                    <th className="text-left py-2 text-gray-400 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-800/30"><td className="py-2"><code>200</code></td><td>Success</td></tr>
                  <tr className="border-b border-gray-800/30"><td className="py-2"><code>201</code></td><td>Created</td></tr>
                  <tr className="border-b border-gray-800/30"><td className="py-2"><code>400</code></td><td>Bad Request — validation error</td></tr>
                  <tr className="border-b border-gray-800/30"><td className="py-2"><code>401</code></td><td>Unauthorized — invalid API key</td></tr>
                  <tr className="border-b border-gray-800/30"><td className="py-2"><code>403</code></td><td>Forbidden — IP blocked or limit reached</td></tr>
                  <tr className="border-b border-gray-800/30"><td className="py-2"><code>404</code></td><td>Not Found</td></tr>
                  <tr className="border-b border-gray-800/30"><td className="py-2"><code>429</code></td><td>Rate Limit Exceeded</td></tr>
                  <tr><td className="py-2"><code>502</code></td><td>Upstream Error — card provider issue</td></tr>
                </tbody>
              </table>
            </Section>
          )}

          {activeSection === "rate-limiting" && (
            <Section title="Rate Limiting">
              <p className="text-gray-300 mb-4">
                Rate limits are per API key, measured in requests per minute. Check response headers:
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-3 p-3 bg-gray-800/20 rounded-lg">
                  <code className="text-violet-400 text-xs">X-RateLimit-Limit</code>
                  <span className="text-sm text-gray-300">Max requests per minute</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-800/20 rounded-lg">
                  <code className="text-violet-400 text-xs">X-RateLimit-Remaining</code>
                  <span className="text-sm text-gray-300">Requests remaining in window</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-800/20 rounded-lg">
                  <code className="text-violet-400 text-xs">X-RateLimit-Reset</code>
                  <span className="text-sm text-gray-300">Unix timestamp when window resets</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 text-gray-400 font-medium">Plan</th>
                    <th className="text-left py-2 text-gray-400 font-medium">Requests/min</th>
                    <th className="text-left py-2 text-gray-400 font-medium">Cards/month</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-800/30"><td className="py-2">Starter</td><td>60</td><td>500</td></tr>
                  <tr className="border-b border-gray-800/30"><td className="py-2">Growth</td><td>200</td><td>2,500</td></tr>
                  <tr><td className="py-2">Enterprise</td><td>500</td><td>10,000</td></tr>
                </tbody>
              </table>
            </Section>
          )}

          {(activeSection === "cards" || activeSection === "funding" || activeSection === "transactions") && (
            <Section title={activeSection === "cards" ? "Cards" : activeSection === "funding" ? "Funding" : "Transactions"}>
              <div className="space-y-10">
                {(endpoints[activeSection] || []).map((ep, i) => (
                  <EndpointDoc
                    key={i}
                    endpoint={ep}
                    onCopy={copy}
                    copiedId={copiedId}
                  />
                ))}
              </div>
            </Section>
          )}

          {activeSection === "test-mode" && (
            <Section title="Test Mode">
              <p className="text-gray-300 mb-4">
                Use test mode API keys (<code className="text-yellow-400">ppay_test_</code>) to develop
                and test your integration without making real charges or creating real cards.
              </p>
              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Test Mode Behavior</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Cards return fake numbers (4111xxxx format) — not usable for real purchases</li>
                <li>• Balances are simulated and can be funded without real money</li>
                <li>• All endpoints work identically to live mode</li>
                <li>• Responses include <code className="text-yellow-400">&quot;test&quot;: true</code></li>
                <li>• Test cards do not count toward monthly limits</li>
              </ul>
            </Section>
          )}

          {activeSection === "webhooks" && (
            <Section title="Webhooks">
              <p className="text-gray-300 mb-2">
                Available on Growth and Enterprise plans. Receive real-time notifications when events occur.
              </p>
              <InfoBox>
                Configure your webhook URL in the <a href="/developers" className="text-violet-400 hover:underline">Developer Dashboard</a>.
              </InfoBox>
              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Events</h3>
              <div className="space-y-2">
                <div className="p-3 bg-gray-800/20 rounded-lg">
                  <code className="text-violet-400 text-sm">card.created</code>
                  <p className="text-xs text-gray-400 mt-1">Fired when a new card is successfully issued</p>
                </div>
                <div className="p-3 bg-gray-800/20 rounded-lg">
                  <code className="text-violet-400 text-sm">card.funded</code>
                  <p className="text-xs text-gray-400 mt-1">Fired when funds are added to a card</p>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mt-6 mb-3">Signature Verification</h3>
              <p className="text-sm text-gray-300 mb-3">
                Verify webhook authenticity by checking the <code className="text-violet-400">X-PrivatePay-Signature</code> header:
              </p>
              <CodeBlock
                code={`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expected;
}`}
                id="webhook-verify"
                onCopy={copy}
                copied={copiedId === "webhook-verify"}
              />
            </Section>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-violet-500/10 text-violet-400 font-medium"
          : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>
      {children}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl text-sm text-gray-300 mb-4">
      {children}
    </div>
  );
}

function CodeBlock({
  code,
  id,
  onCopy,
  copied,
}: {
  code: string;
  id: string;
  onCopy: (text: string, id: string) => void;
  copied: boolean;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => onCopy(code, id)}
        className="absolute top-3 right-3 text-xs text-gray-500 hover:text-violet-400 flex items-center gap-1"
      >
        {copied ? "Copied!" : <Copy className="w-3 h-3" />}
      </button>
      <pre className="bg-gray-800/40 border border-gray-700/20 rounded-xl p-4 text-sm text-gray-300 font-mono overflow-x-auto mb-4">
        {code}
      </pre>
    </div>
  );
}

function EndpointDoc({
  endpoint,
  onCopy,
  copiedId,
}: {
  endpoint: Endpoint;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const [open, setOpen] = useState(true);
  const methodColors: Record<string, string> = {
    GET: "text-green-400 bg-green-500/10",
    POST: "text-blue-400 bg-blue-500/10",
    PATCH: "text-yellow-400 bg-yellow-500/10",
    DELETE: "text-red-400 bg-red-500/10",
  };

  return (
    <div className="border border-gray-800/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-800/20 transition-colors"
      >
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${methodColors[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="text-sm text-gray-300 font-mono">{endpoint.path}</code>
        <span className="ml-auto text-sm text-gray-400">{endpoint.title}</span>
        <ChevronRight
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-800/20 pt-4">
          <p className="text-sm text-gray-300 mb-4">{endpoint.description}</p>

          {endpoint.params && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Query Parameters</h4>
              <ParamTable params={endpoint.params} />
            </div>
          )}

          {endpoint.body && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Request Body</h4>
              <ParamTable params={endpoint.body} />
            </div>
          )}

          <div className="mb-4">
            <h4 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Response</h4>
            <CodeBlock
              code={endpoint.response}
              id={`resp-${endpoint.path}-${endpoint.method}`}
              onCopy={onCopy}
              copied={copiedId === `resp-${endpoint.path}-${endpoint.method}`}
            />
          </div>

          {endpoint.example_curl && (
            <div>
              <h4 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Example</h4>
              <CodeBlock
                code={endpoint.example_curl}
                id={`curl-${endpoint.path}-${endpoint.method}`}
                onCopy={onCopy}
                copied={copiedId === `curl-${endpoint.path}-${endpoint.method}`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParamTable({
  params,
}: {
  params: Array<{ name: string; type: string; required: boolean; description: string }>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-800/50">
          <th className="text-left py-1.5 text-gray-500 font-medium text-xs">Parameter</th>
          <th className="text-left py-1.5 text-gray-500 font-medium text-xs">Type</th>
          <th className="text-left py-1.5 text-gray-500 font-medium text-xs">Required</th>
          <th className="text-left py-1.5 text-gray-500 font-medium text-xs">Description</th>
        </tr>
      </thead>
      <tbody>
        {params.map((p) => (
          <tr key={p.name} className="border-b border-gray-800/20">
            <td className="py-2"><code className="text-violet-400 text-xs">{p.name}</code></td>
            <td className="py-2 text-xs text-gray-400">{p.type}</td>
            <td className="py-2">
              {p.required ? (
                <span className="text-xs text-red-400">required</span>
              ) : (
                <span className="text-xs text-gray-600">optional</span>
              )}
            </td>
            <td className="py-2 text-xs text-gray-300">{p.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
