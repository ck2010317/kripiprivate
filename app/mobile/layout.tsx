import type { Metadata, Viewport } from "next"
import { AuthProvider } from "@/app/context/auth-context"

export const metadata: Metadata = {
  title: "PrivatePay Mobile",
  description: "PrivatePay - Issue virtual cards with Solana",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PrivatePay",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="max-w-[430px] mx-auto min-h-dvh bg-[#0d0b18] overflow-hidden">
      <AuthProvider>
        {children}
      </AuthProvider>
    </div>
  )
}
