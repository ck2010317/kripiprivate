// Chain and token configuration for PrivateBridge (Squid Router v2)
// Squid uses 0xEeee...EEeE for all native tokens (EVM + Solana)

// Native token address for Squid Router (EVM + Solana)
export const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
// Solana native token address (same as NATIVE_TOKEN_ADDRESS for Squid)
export const SOLANA_NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const SOLANA_CHAIN_ID = "solana-mainnet-beta";

export interface ChainInfo {
  chainId: string;
  name: string;
  icon: string;
  nativeCurrency: string;
  rpcUrl?: string;
  explorerUrl: string;
  color: string;
  chainType: "evm" | "solana";
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
    chainType: "evm",
  },
  {
    chainId: "56",
    name: "BNB Chain",
    icon: "🔶",
    nativeCurrency: "BNB",
    explorerUrl: "https://bscscan.com",
    color: "#F0B90B",
    chainType: "evm",
  },
  {
    chainId: "137",
    name: "Polygon",
    icon: "🟣",
    nativeCurrency: "MATIC",
    explorerUrl: "https://polygonscan.com",
    color: "#8247E5",
    chainType: "evm",
  },
  {
    chainId: "42161",
    name: "Arbitrum",
    icon: "🔵",
    nativeCurrency: "ETH",
    explorerUrl: "https://arbiscan.io",
    color: "#28A0F0",
    chainType: "evm",
  },
  {
    chainId: "10",
    name: "Optimism",
    icon: "🔴",
    nativeCurrency: "ETH",
    explorerUrl: "https://optimistic.etherscan.io",
    color: "#FF0420",
    chainType: "evm",
  },
  {
    chainId: "8453",
    name: "Base",
    icon: "🔷",
    nativeCurrency: "ETH",
    explorerUrl: "https://basescan.org",
    color: "#0052FF",
    chainType: "evm",
  },
  {
    chainId: "43114",
    name: "Avalanche",
    icon: "🔺",
    nativeCurrency: "AVAX",
    explorerUrl: "https://snowtrace.io",
    color: "#E84142",
    chainType: "evm",
  },
  {
    chainId: SOLANA_CHAIN_ID,
    name: "Solana",
    icon: "◎",
    nativeCurrency: "SOL",
    explorerUrl: "https://solscan.io",
    color: "#9945FF",
    chainType: "solana",
  },
];

// Tokens available per chain (Squid Router-compatible addresses)
const CHAIN_TOKENS: Record<string, TokenInfo[]> = {
  "1": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ethereum", decimals: 18, icon: "⟠", chainId: "1" },
    { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "1" },
    { address: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: "1" },
    { address: "0x6b175474e89094c44da98b954eedeac495271d0f", symbol: "DAI", name: "Dai", decimals: 18, icon: "🟡", chainId: "1" },
    { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, icon: "₿", chainId: "1" },
  ],
  "56": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "BNB", name: "BNB", decimals: 18, icon: "🔶", chainId: "56" },
    { address: "0x55d398326f99059ff775485246999027b3197955", symbol: "USDT", name: "Tether", decimals: 18, icon: "💵", chainId: "56" },
    { address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, icon: "💲", chainId: "56" },
  ],
  "137": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "MATIC", name: "Polygon", decimals: 18, icon: "🟣", chainId: "137" },
    { address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "137" },
    { address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: "137" },
    { address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", symbol: "WETH", name: "Wrapped ETH", decimals: 18, icon: "⟠", chainId: "137" },
  ],
  "42161": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ethereum", decimals: 18, icon: "🔵", chainId: "42161" },
    { address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "42161" },
    { address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: "42161" },
    { address: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, icon: "₿", chainId: "42161" },
  ],
  "10": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ethereum", decimals: 18, icon: "🔴", chainId: "10" },
    { address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "10" },
    { address: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: "10" },
  ],
  "8453": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ethereum", decimals: 18, icon: "🔷", chainId: "8453" },
    { address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "8453" },
  ],
  "43114": [
    { address: NATIVE_TOKEN_ADDRESS, symbol: "AVAX", name: "Avalanche", decimals: 18, icon: "🔺", chainId: "43114" },
    { address: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: "43114" },
    { address: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: "43114" },
  ],
  [SOLANA_CHAIN_ID]: [
    { address: SOLANA_NATIVE_ADDRESS, symbol: "SOL", name: "Solana", decimals: 9, icon: "◎", chainId: SOLANA_CHAIN_ID },
    { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", name: "USD Coin", decimals: 6, icon: "💲", chainId: SOLANA_CHAIN_ID },
    { address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", symbol: "USDT", name: "Tether", decimals: 6, icon: "💵", chainId: SOLANA_CHAIN_ID },
  ],
};

export function getTokensForChain(chainId: string): TokenInfo[] {
  return CHAIN_TOKENS[chainId] || [];
}

export function getChainById(chainId: string): ChainInfo | undefined {
  return SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
}

export function isEvmChain(chainId: string): boolean {
  const chain = getChainById(chainId);
  return chain?.chainType === "evm";
}

export function isSolanaChain(chainId: string): boolean {
  return chainId === SOLANA_CHAIN_ID;
}
