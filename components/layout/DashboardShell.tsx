"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {useEffect,useState} from "react";

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
  user: string;
  title: string;
}) {
  const pathname = usePathname();
  const [storeName,setStoreName]=useState("My Store");
  useEffect(()=>{fetch("/api/store").then(r=>r.json()).then(d=>{if(d.name)setStoreName(d.name)}).catch(()=>{})},[]);
  const dashboardHref = `/${role}-dashboard`;
  const items = allItems
    .filter(([, , roles]) => roles.includes(role))
    .map(([label, href, roles]) => [
      label,
      label === "Dashboard" ? dashboardHref : href,
      roles,
    ] as NavItem);

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } finally { window.location.href = "/login"; }
  }

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-8">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/75">Store: {storeName}</p>
            <p className="text-xs uppercase tracking-wider text-white/70">{role}</p>
            <p className="font-medium">{user}</p>
          </div>
          <Link
            href="/notification"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
            aria-label="Notifications"
          >
            🔔
          </Link>
        </header>

        <div className="border-b border-white/5 px-5 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {items.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs ${
                  pathname === href
                    ? "bg-orange-500 text-black"
                    : "bg-white/5 text-white/60"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="p-5 md:p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-white/40">
              {title === "Admin Dashboard"
                ? "Overview of your retail operation."
                : "Manage your retail operation from one place."}
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
