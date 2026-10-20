
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { User } from "@/lib/types";

type DashboardShellProps = {
  children: ReactNode;
  title: string;
  role?: string;
  user?: User | null;
};

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Sales", href: "/sales" },
  { label: "Products & Inventory", href: "/inventory" },
  { label: "Transactions", href: "/transactions" },
  { label: "Customers", href: "/customers" },
  { label: "Who Owes Me", href: "/debts" },
  { label: "Settings", href: "/settings" },
];

export default function DashboardShell({ children, title }: DashboardShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const storeName = user?.store_name ?? "Store";

  return (
    <div className="flex min-h-screen bg-[#0b0b0b] text-white">
      <nav className="w-64 border-r border-white/10 bg-[#121212] p-4 shrink-0">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-3">
            TX RetailOS
          </p>
          <p className="text-sm font-medium">{storeName}</p>
        </div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-md text-sm transition-colors ${
              pathname === item.href
                ? "bg-orange-500 text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-xl font-semibold mb-6">{title}</h1>
        {children}
        <div className="mt-12 pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={() => void logout()}
            className="text-xs text-red-400 hover:text-red-300 underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}

