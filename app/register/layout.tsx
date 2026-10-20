import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a TX RetailOS account to organize your shop's products, stock, and sales.",
  openGraph: {
    title: "Create an account | TX RetailOS",
    description: "Get started with TX RetailOS for everyday retail and stock management.",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
