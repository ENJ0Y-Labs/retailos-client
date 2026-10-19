"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { User } from "@/lib/types";
import { useAuth } from "@/components/auth/AuthProvider";

type AppRole = "admin" | "manager" | "employee";

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

type NavItem = readonly [label: string, href: string, roles: readonly AppRole[]];

const allItems: readonly NavItem[] = [
  ["Dashboard", "/admin-dashboard", ["admin", "manager", "employee"]],
  ["Sales", "/sales", ["admin", "manager", "employee"]],
  ["Products & Inventory", "/inventory", ["admin", "manager", "employee"]],
  ["Sales History & Transactions", "/transactions", ["admin", "manager", "employee"]],
  ["Customers", "/customers", ["admin", "manager", "employee"]],
  ["Who Owes Me", "/debts", ["admin", "manager", "employee"]],
  ["Purchases", "/purchases", ["admin", "manager"]],
  ["Reports", "/report", ["admin", "manager"]],
  ["Users", "/users", ["admin"]],
  ["Notifications", "/notification", ["admin", "manager", "employee"]],
  ["Settings", "/settings", ["admin", "manager", "employee"]],
];

export default function DashboardShell({
  children,
  role,
  user,
  title,
}: {
  children: ReactNode;
  role: AppRole;
  user: User & { role?: string };
  title: string;
}) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const dashboardHref = `/${role}-dashboard`;
  const items = allItems
    .filter(([, , roles]) => roles.includes(role))
    .map(([label, href, roles]) => [
      label,
      label === "Dashboard" ? dashboardHref : href,
      roles,
    ] as NavItem);

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#111] p-5 lg:block">
        <Link href="/dashboard" className="mb-2 block text-xl font-bold">
          TX <span className="text-orange-500">RetailOS</span>
        </Link>
        <p className="mb-1 text-xs text-white/35">{user?.store_name || "Your Store"}</p>
        <p className="mb-8 truncate text-xs text-white/25">{user?.email}</p>
        <nav className="space-y-1">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className={pathname === href
              ? "block rounded-lg bg-orange-500 px-3 py-2.5 text-sm font-semibold text-black"
              : "block rounded-lg px-3 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white"}>
              {label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="mt-8 w-full rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white/50 hover:text-white">
          Sign out
        </button>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-8">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/75">Store: {user.store_name || "My Store"}</p>
            <p className="text-xs uppercase tracking-wider text-white/70">{role}</p>
            <p className="font-medium">{user.username || user.email}</p>
          </div>
          <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 lg:hidden">
            Sign out
          </button>
        </header>

        <div className="border-b border-white/5 px-5 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className={pathname === href
                ? "whitespace-nowrap rounded-lg bg-orange-500 px-3 py-2 text-xs text-black"
                : "whitespace-nowrap rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60"}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="p-5 md:p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-white/40">Connected to the RetailOS Flask API.</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
