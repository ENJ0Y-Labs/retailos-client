import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales",
  description: "Record and review sales transactions in TX RetailOS.",
  robots: { index: false, follow: false },
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
