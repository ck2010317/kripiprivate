import { AuthProvider } from "@/app/context/auth-context";

export const metadata = {
  title: "PrivatePay — Developer Portal",
  description: "Issue virtual cards via API. Create, fund, and manage Visa/Mastercard cards programmatically.",
};

export default function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
