import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plans & subscription",
  description: "View the RetailOS subscription catalog, current plan, usage, and pending plan requests.",
  robots: "noindex, nofollow",
};

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
