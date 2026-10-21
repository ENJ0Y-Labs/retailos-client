import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers",
  description: "Manage customer records for your store in TX RetailOS.",
  robots: "noindex, nofollow",
  index: false,
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
