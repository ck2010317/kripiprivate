// deBridge DLN API integration
// Docs: https://docs.debridge.com/dln-details/integration-guidelines

const DEBRIDGE_API_URL = "https://dln.debridge.finance/v1.0";
const DEBRIDGE_STATS_URL = "https://stats-api.dln.trade";

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
];

export interface DeBridgeEstimation {
  srcChainTokenIn: {
    address: string;
    chainId: number;
    decimals: number;
    name: string;
    symbol: string;
    amount: string;
    approximateUsdValue: number;
    mutatedWithOperatingExpense: boolean;
  };
  srcChainTokenOut?: {
    address: string;
    chainId: number;
    decimals: number;
    name: string;
    symbol: string;
    amount: string;
    maxRefundAmount: string;
    approximateUsdValue: number;
  };
  dstChainTokenOut: {
    address: string;
    chainId: number;
    decimals: number;
    name: string;
    symbol: string;
    amount: string;
    recommendedAmount: string;
    approximateUsdValue: number;
    recommendedApproximateUsdValue: number;
  };
  costsDetails?: Array<{
    chain: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    type: string;
  }>;
}

export interface DeBridgeTx {
  data: string;
  to?: string;
  value?: string;
}

export interface DeBridgeOrder {
  approximateFulfillmentDelay: number;
  salt?: string;
  metadata?: string;
}

export interface DeBridgeResponse {
  estimation: DeBridgeEstimation;
  tx: DeBridgeTx;
  order: DeBridgeOrder;
  orderId: string;
  fixFee: string;
  userPoints: number;
  integratorPoints: number;
  prependedOperatingExpenseCost?: string;
}

export interface DeBridgeQuoteParams {
  srcChainId: string;
  srcChainTokenIn: string;
  srcChainTokenInAmount: string;
  dstChainId: string;
  dstChainTokenOut: string;
  // Optional — omit for estimation-only (no wallet connected)
  srcChainOrderAuthorityAddress?: string;
  dstChainOrderAuthorityAddress?: string;
  dstChainTokenOutRecipient?: string;
  prependOperatingExpenses?: boolean;
}

export async function getQuote(
  params: DeBridgeQuoteParams
): Promise<DeBridgeResponse> {
  const url = new URL(`${DEBRIDGE_API_URL}/dln/order/create-tx`);

  url.searchParams.set("srcChainId", params.srcChainId);
  url.searchParams.set("srcChainTokenIn", params.srcChainTokenIn);
  url.searchParams.set("srcChainTokenInAmount", params.srcChainTokenInAmount);
  url.searchParams.set("dstChainId", params.dstChainId);
  url.searchParams.set("dstChainTokenOut", params.dstChainTokenOut);
  url.searchParams.set("dstChainTokenOutAmount", "auto");
  url.searchParams.set(
    "prependOperatingExpenses",
    String(params.prependOperatingExpenses ?? true)
  );

  if (params.srcChainOrderAuthorityAddress) {
    url.searchParams.set(
      "srcChainOrderAuthorityAddress",
      params.srcChainOrderAuthorityAddress
    );
  }
  if (params.dstChainOrderAuthorityAddress) {
    url.searchParams.set(
      "dstChainOrderAuthorityAddress",
      params.dstChainOrderAuthorityAddress
    );
  }
  if (params.dstChainTokenOutRecipient) {
    url.searchParams.set(
      "dstChainTokenOutRecipient",
      params.dstChainTokenOutRecipient
    );
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.errorMessage ||
        errorData.message ||
        `API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// Track order status via deBridge Stats API
export async function getOrderStatus(
  orderId: string
): Promise<{ status: string }> {
  const response = await fetch(
    `${DEBRIDGE_STATS_URL}/api/Orders/${orderId}`
  );

  if (!response.ok) {
    throw new Error(`Status API Error: ${response.status}`);
  }

  return response.json();
}

// Get order ID from transaction hash
export async function getOrderIdByTxHash(
  txHash: string
): Promise<{ orderIds: string[] }> {
  const response = await fetch(
    `${DEBRIDGE_STATS_URL}/api/Transaction/${txHash}/orderIds`
  );

  if (!response.ok) {
    throw new Error(`Order lookup error: ${response.status}`);
  }

  return response.json();
}

// Completion states from the deBridge docs
export const DEBRIDGE_COMPLETED_STATES = [
  "Fulfilled",
  "SentUnlock",
  "ClaimedUnlock",
];

export const DEBRIDGE_FAILED_STATES = ["OrderCancelled", "SentOrderCancel"];
