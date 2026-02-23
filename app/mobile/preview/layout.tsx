import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PrivatePay Mobile Preview",
  description: "Preview PrivatePay mobile app in different iPhone devices",
}

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
