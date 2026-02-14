// Squid Router v2 API integration
// Docs: https://docs.squidrouter.com/api-and-sdk-integration
// Coral Intent Swaps + Solana/BTC via Chainflip

const SQUID_API_URL = "https://v2.api.squidrouter.com/v2";
const SQUID_INTEGRATOR_ID = "privatebridge-c0f6657e-1f07-4dfe-a743-7f0721e7cf57";

// Native token address for Squid (EVM + Solana)
export const SQUID_NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Squid headers
function getHeaders() {
  return {
    "x-integrator-id": SQUID_INTEGRATOR_ID,
    "Content-Type": "application/json",
  };
}

// --- Types ---

export interface SquidRouteParams {
  fromChain: string;
  fromToken: string;
  fromAmount: string;
  fromAddress: string;
  toChain: string;
  toToken: string;
  toAddress: string;
  slippage?: number;
  slippageConfig?: { autoMode: number };
  quoteOnly?: boolean;
}

export interface SquidEstimate {
  fromAmount: string;
  fromAmountUSD: string;
  toAmount: string;
  toAmountUSD: string;
  toAmountMin: string;
  toAmountMinUSD: string;
  exchangeRate: string;
  estimatedRouteDuration: number; // seconds
  aggregatePriceImpact: string;
  feeCosts: Array<{
    name: string;
    description: string;
    amount: string;
    amountUSD: string;
    token: {
      symbol: string;
      decimals: number;
      address: string;
      chainId: string;
    };
  }>;
  gasCosts: Array<{
    type: string;
    amount: string;
    amountUSD: string;
    token: {
      symbol: string;
      decimals: number;
      address: string;
      chainId: string;
    };
  }>;
  fromToken: {
    symbol: string;
    name: string;
    decimals: number;
    address: string;
    chainId: string;
    logoURI?: string;
  };
  toToken: {
    symbol: string;
    name: string;
    decimals: number;
    address: string;
    chainId: string;
    logoURI?: string;
  };
}

export interface SquidTransactionRequest {
  target: string;
  data: string;
  value: string;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SquidRawTransactionRequest = Record<string, any>;

export interface SquidRoute {
  estimate: SquidEstimate;
  transactionRequest?: SquidRawTransactionRequest;
  params: SquidRouteParams;
  quoteId?: string;
}

export interface SquidRouteResponse {
  route: SquidRoute;
  requestId: string;
}

export interface SquidDepositAddressResponse {
  depositAddress: string;
  amount: string;
  chainflipStatusTrackingId: string;
}

export interface SquidStatusResponse {
  squidTransactionStatus: string;
  statusCode?: number;
  isGMPTransaction?: boolean;
  axelarTransactionUrl?: string;
  fromChain?: {
    transactionId: string;
    chainId: string;
  };
  toChain?: {
    transactionId: string;
    chainId: string;
  };
  error?: {
    message: string;
  };
}

// --- API Functions ---

/**
 * Get a route/quote from Squid Router v2
 * For EVM→EVM and EVM→Solana: returns transactionRequest for execution
 * For Solana→EVM: use getDepositAddress after getting the route
 */
export async function getRoute(
  params: SquidRouteParams
): Promise<SquidRouteResponse> {
  const response = await fetch(`${SQUID_API_URL}/route`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        errorData.message ||
        `Squid API Error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  // x-request-id header may be blocked by CORS in browser, fallback to body
  const requestId = response.headers.get("x-request-id") 
    || data.requestId 
    || data.route?.transactionRequest?.requestId 
    || "";

  return {
    route: data.route,
    requestId,
  };
}

/**
 * Get deposit address for Solana/BTC → EVM swaps
 * Uses the transactionRequest from the route response
 */
export async function getDepositAddress(
  transactionRequest: SquidRawTransactionRequest
): Promise<SquidDepositAddressResponse> {
  console.log("Deposit address request body:", JSON.stringify(transactionRequest, null, 2));
  
  const response = await fetch(`${SQUID_API_URL}/deposit-address`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(transactionRequest),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Deposit address error response:", JSON.stringify(errorData, null, 2));
    throw new Error(
      errorData.error?.message ||
        errorData.message ||
        `Deposit Address Error: ${response.status}`
    );
  }

  const data = await response.json();
  console.log("Deposit address response:", JSON.stringify(data, null, 2));
  return data;
}

/**
 * Check transaction status
 * For EVM swaps: use txHash as transactionId
 * For Solana/BTC: use chainflipStatusTrackingId + bridgeType
 */
export async function getStatus(params: {
  transactionId: string;
  requestId?: string;
  fromChainId: string;
  toChainId: string;
  quoteId?: string;
  bridgeType?: string; // "chainflip" for SOL/BTC → Arbitrum, "chainflipmultihop" for other EVM
}): Promise<SquidStatusResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("transactionId", params.transactionId);
  searchParams.set("fromChainId", params.fromChainId);
  searchParams.set("toChainId", params.toChainId);
  if (params.requestId) searchParams.set("requestId", params.requestId);
  if (params.quoteId) searchParams.set("quoteId", params.quoteId);
  if (params.bridgeType) searchParams.set("bridgeType", params.bridgeType);

  const response = await fetch(
    `${SQUID_API_URL}/status?${searchParams.toString()}`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(`Status API Error: ${response.status}`);
  }

  return response.json();
}

// Completed status values
export const SQUID_COMPLETED_STATES = [
  "success",
  "partial_success",
  "needs_gas",
];

export const SQUID_FAILED_STATES = [
  "not_found", // after max retries
];

// Determine bridge type for Chainflip (SOL/BTC sources)
export function getChainflipBridgeType(toChainId: string): string {
  return toChainId === "42161" ? "chainflip" : "chainflipmultihop";
}

// Check if a chain uses Chainflip (Solana or Bitcoin)
export function isChainflipChain(chainId: string): boolean {
  return chainId === "solana-mainnet-beta" || chainId === "bitcoin";
}

// ERC20 ABI for approvals
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
];
