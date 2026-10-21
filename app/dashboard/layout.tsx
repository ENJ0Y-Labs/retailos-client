import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your TX RetailOS store dashboard and daily retail activity.",
  robots: "noindex, nofollow",
  index: false,
} as Metadata;

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
