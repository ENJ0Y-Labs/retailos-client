import Link from "next/link";
import LandingPricingSection from "@/components/landing/PricingSection";

const features = [
  {
    number: "01",
    title: "Know your stock",
    description: "Keep product quantities and stock adjustments in one place, so you can make decisions using records instead of guesswork.",
  },
  {
    number: "02",
    title: "Record every sale",
    description: "Use a focused point-of-sale workflow to record transactions and keep your sales history organized.",
  },
  {
    number: "03",
    title: "See the business clearly",
    description: "Review your dashboard, customers, and low-stock alerts without juggling notebooks and scattered spreadsheets.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0b0b] text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="text-xl font-bold tracking-tight" aria-label="TX RetailOS home">
          TX <span className="text-orange-500">RetailOS</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-3">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition hover:text-white">
            Sign in
          </Link>
          <Link href="/register" className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400">
            Create account
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-20 pt-16 sm:px-10 md:grid-cols-[1.15fr_0.85fr] md:pb-28 md:pt-24">
        <div>
          <p className="mb-6 inline-flex rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
            Retail operations, made clearer
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Run your shop with <span className="text-orange-500">less guesswork.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
            TX RetailOS helps provision shops and growing retailers organize products, track stock, record sales, and keep an eye on daily operations from one workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-orange-400">
              Get started <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link href="/demo" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5">
              Try the demo
            </Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-white/45">
            Try the demo shop without creating an account, or register to set up your real store.
          </p>
        </div>

        <div aria-label="RetailOS operations preview" className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-8 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="relative rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs text-white/45">YOUR STORE</p>
                <p className="mt-1 text-sm font-semibold">Operations overview</p>
              </div>
              <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300">RetailOS</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-white/50">Inventory</p>
                <p className="mt-2 text-lg font-semibold">In one place</p>
                <p className="mt-1 text-xs text-white/40">Products and stock</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-white/50">Sales</p>
                <p className="mt-2 text-lg font-semibold">Recorded</p>
                <p className="mt-1 text-xs text-white/40">Transactions and history</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Daily essentials</p>
                <span className="text-xs text-white/40">Store tools</span>
              </div>
              <div className="mt-4 space-y-3">
                {["Product management", "Point of sale", "Customer records", "Low-stock alerts"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-white/70">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500/15 text-xs text-orange-300" aria-hidden="true">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-white/35">Illustrative product preview. Available features depend on the current release.</p>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 md:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Built for everyday retail</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The essentials, without the clutter.</h2>
            <p className="mt-4 leading-7 text-white/60">Keep core shop operations easier to follow, from the products on your shelves to the sales you make.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.number} className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                <p className="text-sm font-semibold text-orange-400">{feature.number}</p>
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LandingPricingSection />

      <footer className="border-t border-white/10 px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TX RetailOS · Built for African businesses.</p>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-white/70">Sign in</Link>
            <Link href="/register" className="hover:text-white/70">Create account</Link>
            <Link href="/privacy" className="hover:text-white/70">Privacy policy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
