
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { User } from "@/lib/types";

type AppRole = "admin" | "manager" | "employee";

type DashboardShellProps = {
  children: ReactNode;
  role?: AppRole;
  user?: User & { role?: string };
  title: string;
};

type NavItem = {
  label: string;
  href: string;
  roles: readonly AppRole[];
};

const ALL_ROLES: readonly AppRole[] = ["admin", "manager", "employee"];
const MANAGEMENT_ROLES: readonly AppRole[] = ["admin", "manager"];
const ADMIN_ROLES: readonly AppRole[] = ["admin"];

const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ALL_ROLES },
  { label: "Sales", href: "/sales", roles: ALL_ROLES },
  { label: "Products & Inventory", href: "/inventory", roles: ALL_ROLES },
  { label: "Transactions", href: "/transactions", roles: ALL_ROLES },
  { label: "Customers", href: "/customers", roles: ALL_ROLES },
  { label: "Who Owes Me", href: "/debts", roles: ALL_ROLES },
  { label: "Purchases", href: "/purchases", roles: MANAGEMENT_ROLES },
  { label: "Reports", href: "/report", roles: MANAGEMENT_ROLES },
  { label: "Users", href: "/users", roles: ADMIN_ROLES },
  { label: "Notifications", href: "/notification", roles: ALL_ROLES },
  { label: "Settings", href: "/settings", roles: ALL_ROLES },
];

function getDashboardHref(role: AppRole): string {
  return `/${role}-dashboard`;
}

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShell({ children, role, user, title }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user: authUser } = useAuth();
  const activeUser = user ?? authUser;
  const activeRole = role ?? "employee";
  const dashboardHref = getDashboardHref(activeRole);

  const items = NAV_ITEMS.filter((item) => item.roles.includes(activeRole)).map((item) =>
    item.label === "Dashboard" ? { ...item, href: dashboardHref } : item,
  );

  async function handleLogout() {
    try {
      await logout();
    } catch {
      router.replace("/login");
    }
  }

  const linkClass = (href: string, mobile = false) => {
    const active = isActivePath(pathname, href);
    if (mobile) {
      return [
        "whitespace-nowrap rounded-lg px-3 py-2 text-xs",
        active
          ? "bg-orange-500 font-semibold text-black"
          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
      ].join(" ");
    }
    return [
      "block rounded-lg px-3 py-2.5 text-sm",
      active
        ? "bg-orange-500 font-semibold text-black"
        : "text-white/60 hover:bg-white/5 hover:text-white",
    ].join(" ");
  };

  const storeName = activeUser?.store_name || "Your Store";
  const displayName = activeUser?.username || activeUser?.email || "User";

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#111] p-5 lg:block">
        <Link href={dashboardHref} className="mb-2 block text-xl font-bold">
          TX <span className="text-orange-500">RetailOS</span>
        </Link>
        <p className="mb-1 text-xs text-white/35">{storeName}</p>
        <p className="mb-8 truncate text-xs text-white/25">{activeUser?.email}</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isActivePath(pathname, item.href) ? "page" : undefined} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <button type="button" onClick={() => void handleLogout()} className="mt-8 w-full rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white/50 hover:text-white">
          Sign out
        </button>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-8">
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wider text-white/60">Store: {storeName}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-white/50">{activeRole}</p>
            <p className="truncate font-medium">{displayName}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/notification" aria-label="Notifications" className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Notifications</Link>
            <button type="button" onClick={() => void handleLogout()} className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 lg:hidden">Sign out</button>
          </div>
        </header>
        <div className="border-b border-white/5 px-5 py-3 lg:hidden">
          <nav aria-label="Mobile navigation" className="flex gap-2 overflow-x-auto">
            {items.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActivePath(pathname, item.href) ? "page" : undefined} className={linkClass(item.href, true)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-5 md:p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-white/40">
              {title === "Admin Dashboard" ? "Overview of your retail operation." : "Manage your retail operation from one place."}
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
