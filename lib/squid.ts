// Squid Router API integration
// Docs: https://docs.squidrouter.com/old-v2-documentation-deprecated/api

const SQUID_API_URL = "https://apiplus.squidrouter.com/v2";
const INTEGRATOR_ID = "privatebridge-c0f6657e-1f07-4dfe-a743-7f0721e7cf57";

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
];

export interface RouteRequest {
  fromAddress: string;
  fromChain: string;
  fromToken: string;
  fromAmount: string;
  toChain: string;
  toToken: string;
  toAddress: string;
  slippage: number;
  slippageConfig?: {
    autoMode: number;
  };
  enableBoost?: boolean;
}

export interface RouteResponse {
  route: {
    estimate: {
      fromAmount: string;
      toAmount: string;
      toAmountMin: string;
      fromAmountUSD: string;
      toAmountUSD: string;
      exchangeRate: string;
      aggregatePriceImpact: string;
      estimatedRouteDuration: number;
      gasCosts: Array<{
        type: string;
        token: { symbol: string };
        amount: string;
        amountUSD: string;
      }>;
      feeCosts: Array<{
        name: string;
        amount: string;
        amountUSD: string;
      }>;
    };
    transactionRequest: {
      target: string;
      data: string;
      value: string;
      gasLimit: string;
      gasPrice?: string;
    };
    params: {
      fromChain: string;
      toChain: string;
    };
  };
}

export async function getRoute(
  params: RouteRequest
): Promise<{ data: RouteResponse; requestId: string }> {
  const response = await fetch(`${SQUID_API_URL}/route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-integrator-id": INTEGRATOR_ID,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        errorData.error ||
        `API Error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const requestId = response.headers.get("x-request-id") || "";
  return { data, requestId };
}

export async function getStatus(params: {
  transactionId: string;
  requestId: string;
  fromChainId: string;
  toChainId: string;
}): Promise<{
  squidTransactionStatus: string;
  toChain?: { transactionId?: string };
}> {
  const url = new URL(`${SQUID_API_URL}/status`);
  url.searchParams.set("transactionId", params.transactionId);
  url.searchParams.set("requestId", params.requestId);
  url.searchParams.set("fromChainId", params.fromChainId);
  url.searchParams.set("toChainId", params.toChainId);

  const response = await fetch(url.toString(), {
    headers: {
      "x-integrator-id": INTEGRATOR_ID,
    },
  });

  if (!response.ok) {
    throw new Error(`Status API Error: ${response.status}`);
  }

  return response.json();
}
