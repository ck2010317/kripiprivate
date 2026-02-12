"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  mainnet,
  bsc,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
} from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "PrivateBridge",
  projectId: "b3a20cbbe8c8e29bfa5f5f6c7e3b8a90", // WalletConnect project ID
  chains: [mainnet, bsc, polygon, arbitrum, optimism, base, avalanche],
  ssr: true,
});
