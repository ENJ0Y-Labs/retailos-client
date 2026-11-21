import type { Metadata } from "next";
import PublicHeader from "@/components/landing/PublicHeader";
import LandingPricingSection from "@/components/landing/PricingSection";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | TX RetailOS",
  description:
    "Compare TX RetailOS Free and Pro plans, current Nigerian pricing, billing intervals, usage limits, trial terms, and feature availability.",
  alternates: {
    canonical: "/pricing",
  },
  robots: "index, follow",
  openGraph: {
    title: "Pricing | TX RetailOS",
    description:
      "Compare TX RetailOS plans, prices, usage limits, trial terms, and current feature availability.",
    url: "https://retailos-client-sigma.vercel.app/pricing",
    locale: "en_NG",
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <PublicHeader />
      <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-10">
        <p className="text-sm text-white/55">
          Transparent pricing for provision shops and growing retailers.
        </p>
      </div>
      <LandingPricingSection />
      <footer className="mx-auto max-w-7xl px-6 py-8 text-sm text-white/45 sm:px-10">
        <Link href="/" className="transition hover:text-white">TX RetailOS home</Link>
      </footer>
    </main>
  );
}
