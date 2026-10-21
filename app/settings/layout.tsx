import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your TX RetailOS store settings.",
  robots: "noindex, nofollow",
  index: false,
} as Metadata;

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
