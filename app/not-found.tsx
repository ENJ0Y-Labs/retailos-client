"import Link from "next/link";
import BrandMark from "@/components/brand/BrandMark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] px-4 py-12 text-white">
      <title>Page not found | TX RetailOS</title>
      <section
        aria-labelledby="not-found-title"
        className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#121212] px-6 py-10 text-center shadow-2xl shadow-black/30 sm:px-10 sm:py-14"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10">
          <BrandMark size={44} />
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
          TX RetailOS
        </p>
        <p className="mt-3 text-7xl font-bold tracking-tight text-orange-500 sm:text-8xl" aria-hidden="true">
          404
        </p>
        <h1 id="not-found-title" className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          We can’t find that page
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/65 sm:text-base">
          The address may be incorrect, or the page may have moved. Your store is still here.
          Head back to the RetailOS home page and continue from there.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 sm:w-auto"
        >
          <span aria-hidden="true">←</span>
          Back to home
        </Link>
        <p className="mt-8 text-xs text-white/40">
          If you followed a saved link, check the address and try again.
        </p>
      </section>
    </main>
  );
}
