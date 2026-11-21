import Link from "next/link";
import BrandMark from "@/components/brand/BrandMark";

export default function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-10 sm:py-6">
      <Link href="/" className="flex shrink-0 items-center gap-1.5 text-base font-bold tracking-tight sm:gap-2 sm:text-xl" aria-label="TX RetailOS home">
        <BrandMark size={32} />
        TX <span className="text-orange-500">RetailOS</span>
      </Link>
      <nav aria-label="Main navigation" className="flex items-center gap-1.5 sm:gap-3">
        <Link href="/pricing" className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white sm:px-3">
          Pricing
        </Link>
        <Link href="/login" className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white sm:px-3">
          Sign in
        </Link>
        <Link href="/register" className="rounded-lg bg-orange-500 px-3 py-2.5 text-xs font-semibold text-black transition hover:bg-orange-400 sm:px-4 sm:text-sm">
          <span className="sm:hidden">Join</span>
          <span className="hidden sm:inline">Create account</span>
        </Link>
      </nav>
    </header>
  );
}
