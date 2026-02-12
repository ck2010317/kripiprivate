"use client";

import { http, createConfig } from "wagmi";
import {
  mainnet,
  bsc,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
} from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [mainnet, bsc, polygon, arbitrum, optimism, base, avalanche],
  connectors: [
    injected(), // MetaMask, Phantom, Coinbase — any browser extension wallet
  ],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [avalanche.id]: http(),
  },
  ssr: true,
});
