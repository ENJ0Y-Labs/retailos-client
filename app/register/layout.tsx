import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a TX RetailOS account to organize your shop's products, stock, and sales.",
  robots: "noindex, nofollow",
  index: false,
};

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
