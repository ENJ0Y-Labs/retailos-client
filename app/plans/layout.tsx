import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plans & subscription",
  description: "View the RetailOS subscription catalog, current plan, usage, and pending plan requests.",
  robots: { index: false, follow: false },
};

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
