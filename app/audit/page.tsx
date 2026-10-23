"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import { formatNigeriaDateTime } from "@/lib/nigeria-time";

type AuditEntry = {
  id: number;
  store_id: number;
  user_id: number | null;
  action_type: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type AuditResponse = { audit_logs: AuditEntry[]; count: number; limit: number };

const SENSITIVE_KEY = /(password|token|secret|credential|authorization|cookie|session|api[_-]?key|card[_-]?number|cvv|email|phone|mobile|address|customer[_-]?name|full[_-]?name)/i;

function safeDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeDetails);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    SENSITIVE_KEY.test(key) ? "[redacted]" : safeDetails(item),
  ]));
}

function displayValue(value: unknown) {
  const safe = safeDetails(value);
  if (safe === null || safe === undefined) return "Not recorded";
  return typeof safe === "string" ? safe : JSON.stringify(safe, null, 2);
}

export default function AuditHistoryPage() {
  const { user } = useAuth();
  const storeId = user?.store_id ?? null;
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionType, setActionType] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadLogs = useCallback(async () => {
    if (!storeId) {
      setLogs([]);
      setError("No store is associated with this account.");
      setLoading(false);
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setLogs([]);
      setError("Start date must be on or before end date.");
      setLoading(false);
      return;
    }
    if (userId.trim() && (!/^\d+$/.test(userId.trim()) || Number(userId) < 1)) {
      setLogs([]);
      setError("User filter must be a positive user ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ store_id: String(storeId), limit: "200" });
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (actionType.trim()) params.set("action_type", actionType.trim());
      if (userId.trim()) params.set("user_id", userId.trim());
      const data = await api<AuditResponse>("/audit?" + params.toString(), { refresh: true });
      setLogs(Array.isArray(data.audit_logs) ? data.audit_logs : []);
    } catch (cause) {
      setLogs([]);
      setError(cause instanceof Error ? cause.message : "Unable to load audit history.");
    } finally {
      setLoading(false);
    }
  }, [storeId, startDate, endDate, actionType, userId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const activeFilters = useMemo(() => [
    startDate ? "From " + startDate : "",
    endDate ? "To " + endDate : "",
    actionType.trim() ? "Action: " + actionType.trim() : "",
    userId.trim() ? "User ID: " + userId.trim() : "",
  ].filter(Boolean), [startDate, endDate, actionType, userId]);

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setActionType("");
    setUserId("");
    setExpandedId(null);
  }

  return (
    <DashboardShell title="Audit history">
      <section className="rounded-2xl border border-white/10 bg-[#151515] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Store activity log</h2>
            <p className="mt-1 max-w-2xl text-sm text-white/55">Read-only history of recorded changes. Audit access is checked by the server for the signed-in account and selected store.</p>
          </div>
          <button type="button" onClick={() => void loadLogs()} disabled={loading} className="rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-50">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-white/60">Start date
            <input aria-label="Audit start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="field" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-white/60">End date
            <input aria-label="Audit end date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="field" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-white/60">Action type
            <input aria-label="Audit action type" value={actionType} onChange={(event) => setActionType(event.target.value)} className="field" placeholder="e.g. product_updated" maxLength={60} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-white/60">Actor user ID
            <input aria-label="Audit actor user ID" inputMode="numeric" value={userId} onChange={(event) => setUserId(event.target.value)} className="field" placeholder="Filter by user ID" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={clearFilters} disabled={loading && !activeFilters.length} className="rounded-lg border border-white/15 px-4 py-2 text-sm disabled:opacity-50">Clear filters</button>
          <span className="text-xs text-white/45">Filters apply automatically</span>
          <span className="text-xs text-white/45">Showing up to 200 newest records</span>
        </div>
        {activeFilters.length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label="Active audit filters">{activeFilters.map((filter) => <span key={filter} className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-200">{filter}</span>)}</div>}
      </section>

      {error && <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      {loading ? (
        <div role="status" className="mt-4 rounded-xl border border-white/10 bg-[#151515] p-8 text-center text-sm text-white/60">Loading audit history…</div>
      ) : !error && logs.length === 0 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#151515] p-8 text-center"><h3 className="font-medium">No audit records found</h3><p className="mt-1 text-sm text-white/50">Try another date range or clear the filters.</p></div>
      ) : !error && (
        <section className="mt-4 space-y-3" aria-label="Audit records">
          <p className="text-xs text-white/45">{logs.length} record{logs.length === 1 ? "" : "s"} returned</p>
          {logs.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-white/10 bg-[#151515] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold">{entry.action_type.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-white/60">{entry.entity_type} · Record {entry.entity_id}</p>
                </div>
                <time className="text-xs text-white/50" dateTime={entry.created_at}>{formatNigeriaDateTime(entry.created_at)}</time>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/45">
                <span>Actor user ID: {entry.user_id ?? "Unavailable"}</span>
                <span>Audit entry: #{entry.id}</span>
              </div>
              <button type="button" aria-expanded={expandedId === entry.id} onClick={() => setExpandedId((current) => current === entry.id ? null : entry.id)} className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-sm">
                {expandedId === entry.id ? "Hide change details" : "View change details"}
              </button>
              {expandedId === entry.id && (
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {([["Before", entry.before], ["After", entry.after], ["Details", entry.details]] as const).map(([label, value]) => (
                    <div key={label} className="min-w-0 rounded-lg bg-black/25 p-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</h3>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-white/75">{displayValue(value)}</pre>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </DashboardShell>
  );
}
