import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Try the demo shop",
  description: "Explore a sample provision-store catalogue and complete a simulated sale in TX RetailOS.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
