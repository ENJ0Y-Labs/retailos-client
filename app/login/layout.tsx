import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to TX RetailOS to manage your store's products, stock, and sales.",
  robots: "noindex, nofollow",
  index: false,
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
