// Chain and token configuration for PrivateBridge

export const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export interface ChainInfo {
  chainId: string;
  name: string;
  icon: string; // emoji or URL
  nativeCurrency: string;
  rpcUrl?: string;
  explorerUrl: string;
  color: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  chainId: string;
}

export const SUPPORTED_CHAINS: ChainInfo[] = [
  {
    chainId: "1",
    name: "Ethereum",
    icon: "⟠",
    nativeCurrency: "ETH",
    explorerUrl: "https://etherscan.io",
    color: "#627EEA",
  },
  {
    chainId: "56",
    name: "BNB Chain",
    icon: "🔶",
    nativeCurrency: "BNB",
    explorerUrl: "https://bscscan.com",
    color: "#F0B90B",
  },
  {
    chainId: "137",
    name: "Polygon",
    icon: "🟣",
    nativeCurrency: "MATIC",
    explorerUrl: "https://polygonscan.com",
    color: "#8247E5",
  },
  {
    chainId: "42161",
    name: "Arbitrum",
    icon: "🔵",
    nativeCurrency: "ETH",
    explorerUrl: "https://arbiscan.io",
    color: "#28A0F0",
  },
  {
    chainId: "10",
    name: "Optimism",
    icon: "🔴",
    nativeCurrency: "ETH",
    explorerUrl: "https://optimistic.etherscan.io",
    color: "#FF0420",
  },
  {
    chainId: "8453",
    name: "Base",
    icon: "🔷",
    nativeCurrency: "ETH",
    explorerUrl: "https://basescan.org",
    color: "#0052FF",
  },
  {
    chainId: "43114",
    name: "Avalanche",
    icon: "🔺",
    nativeCurrency: "AVAX",
    explorerUrl: "https://snowtrace.io",
    color: "#E84142",
  },
];

// Tokens available per chain
const CHAIN_TOKENS: Record<string, TokenInfo[]> = {
  "1": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ethereum", decimals: 18, icon: "⟠", chainId: "1" },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "1" },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: "1" },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai", decimals: 18, icon: "🟡", chainId: "1" },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, icon: "₿", chainId: "1" },
  ],
  "56": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "BNB", name: "BNB", decimals: 18, icon: "🔶", chainId: "56" },
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether", decimals: 18, icon: "💵", chainId: "56" },
    { address: "0x8AC76a51cc950d9822D68b83FE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, icon: "💲", chainId: "56" },
    { address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", symbol: "BUSD", name: "Binance USD", decimals: 18, icon: "🟡", chainId: "56" },
  ],
  "137": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "MATIC", name: "Polygon", decimals: 18, icon: "🟣", chainId: "137" },
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "137" },
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: "137" },
    { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped ETH", decimals: 18, icon: "⟠", chainId: "137" },
  ],
  "42161": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ethereum", decimals: 18, icon: "🔵", chainId: "42161" },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "42161" },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: "42161" },
    { address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, icon: "₿", chainId: "42161" },
  ],
  "10": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ethereum", decimals: 18, icon: "🔴", chainId: "10" },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "10" },
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: "10" },
  ],
  "8453": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ethereum", decimals: 18, icon: "🔷", chainId: "8453" },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "8453" },
  ],
  "43114": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "AVAX", name: "Avalanche", decimals: 18, icon: "🔺", chainId: "43114" },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "43114" },
    { address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: "43114" },
  ],
};

export function getTokensForChain(chainId: string): TokenInfo[] {
  return CHAIN_TOKENS[chainId] || [];
}

export function getChainById(chainId: string): ChainInfo | undefined {
  return SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
}
