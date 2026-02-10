import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PrivateShop — Premium Outerwear | Pay with SOL",
  description:
    "Decentralized fashion marketplace. Premium jackets, puffers, and outerwear. No accounts, no KYC. Pay with Solana.",
}

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
