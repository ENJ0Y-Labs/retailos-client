"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/lib/api";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Sales", "/sales"],
  ["Products", "/items"],
  ["Inventory", "/inventory"],
  ["Transactions", "/transactions"],
  ["Customers", "/customers"],
  ["Alerts", "/alerts"],
  ["Settings", "/settings"],
] as const;

export default function DashboardShell({ children, user, storeName, title }: { children: ReactNode; user: string; storeName?: string; title: string }) {
  const pathname = usePathname();

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } finally { window.location.href = "/login"; }
  }

  return <div className="min-h-screen bg-[#0b0b0b] text-white lg:flex">
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#111] p-5 lg:block">
      <Link href="/dashboard" className="mb-2 block text-xl font-bold">TX <span className="text-orange-500">RetailOS</span></Link>
      <p className="mb-8 text-xs text-white/35">{storeName || "Your Store"}</p>
      <nav className="space-y-1">{nav.map(([label, href]) => <Link key={href} href={href} className={`block rounded-lg px-3 py-2.5 text-sm ${pathname === href ? "bg-orange-500 font-semibold text-black" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>{label}</Link>)}</nav>
      <button onClick={logout} className="mt-8 w-full rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white/50 hover:text-white">Sign out</button>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-8">
        <div><p className="text-xs uppercase tracking-wider text-white/35">Store</p><p className="font-medium">{user}</p></div>
        <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 lg:hidden">Sign out</button>
      </header>
      <div className="border-b border-white/5 px-5 py-3 lg:hidden"><div className="flex gap-2 overflow-x-auto">{nav.map(([label, href]) => <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs ${pathname === href ? "bg-orange-500 text-black" : "bg-white/5 text-white/60"}`}>{label}</Link>)}</div></div>
      <div className="p-5 md:p-8"><div className="mb-7"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-white/40">Connected to the RetailOS server.</p></div>{children}</div>
    </main>
  </div>;
}
