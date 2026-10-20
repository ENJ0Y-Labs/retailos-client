
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

type DashboardShellProps = {
  children: ReactNode;
  title: string;
};

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Sales", href: "/sales" },
  { label: "Products & Inventory", href: "/inventory" },
  { label: "Transactions", href: "/transactions" },
  { label: "Customers", href: "/customers" },
  { label: "Who Owes Me", href: "/debts" },
  { label: "Settings", href: "/settings" },
] as const;

