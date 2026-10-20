import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to TX RetailOS to manage your store's products, stock, and sales.",
  openGraph: {
    title: "Sign in | TX RetailOS",
    description: "Sign in to your TX RetailOS account to continue managing your store.",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
