"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import type {
  DailyBrief,
  DashboardStats,
  SaleSummary,
  User,
} from "@/types";

type DashboardResponse = {
  stats: DashboardStats;
  brief: DailyBrief | null;
  sales: SaleSummary[];
};

export default function LiveDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<DashboardResponse>("/dashboard");

        if (cancelled) return;

        setStats(response.stats);
        setBrief(response.brief ?? null);
        setSales(response.sales ?? []);
      } catch (err: unknown) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard data.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section aria-live="polite" aria-busy="true">
        <p>Loading dashboard...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section role="alert">
        <h2>Dashboard unavailable</h2>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </section>
    );
  }

  if (!stats) {
    return (
      <section>
        <p>Dashboard data is unavailable.</p>
      </section>
    );
  }

  return (
    <main>
      <header>
        <h1>Dashboard</h1>
        <p>
          Welcome{user?.name ? `, ${user.name}` : ""}.
        </p>
      </header>

      <section aria-labelledby="dashboard-summary">
        <h2 id="dashboard-summary">Business summary</h2>

        {/* Render the metrics using the actual DashboardStats fields. */}
        <pre>{JSON.stringify(stats, null, 2)}</pre>
      </section>

      <section aria-labelledby="daily-brief">
        <h2 id="daily-brief">Daily Business Brief</h2>

        {brief ? (
          <pre>{JSON.stringify(brief, null, 2)}</pre>
        ) : (
          <p>Today&apos;s business brief is not available.</p>
        )}
      </section>

      <section aria-labelledby="recent-sales">
        <h2 id="recent-sales">Recent sales</h2>

        {sales.length > 0 ? (
          <pre>{JSON.stringify(sales, null, 2)}</pre>
        ) : (
          <p>No sales have been recorded yet.</p>
        )}
      </section>
    </main>
  );
}