import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers",
  description: "Manage customer records for your store in TX RetailOS.",
  robots: { index: false, follow: false },
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
