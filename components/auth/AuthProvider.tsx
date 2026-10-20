"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
// Public pages must render without an API session check. In particular, the root
// landing page is the first touchpoint for prospects and must not be gated.
const PUBLIC_PATHS = ["/", "/login", "/register", "/demo"];

function Loader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] text-white">
      <div className="text-center">
        <p className="text-lg font-semibold">TX <span className="text-orange-500">RetailOS</span></p>
        <p className="mt-2 text-sm text-white/40">Checking your session…</p>
      </div>
    </main>
  );
}

function AuthRecovery({ message, onRetry, loading }: { message: string; onRetry: () => void; loading: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] px-5 text-white">
      <section role="alert" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-6 text-center">
        <h1 className="text-lg font-semibold">Unable to verify your session</h1>
        <p className="mt-3 text-sm text-white/60">{message}</p>
        <button type="button" onClick={onRetry} disabled={loading} className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black disabled:opacity-50">
          {loading ? "Retrying…" : "Retry connection"}
        </button>
      </section>
    </main>
  );
}

function getAuthFailureMessage(error: unknown): string {
  if (error instanceof ApiError && error.status >= 500) {
    return "The RetailOS server is temporarily unavailable. Your data has not been changed. Retry in a moment.";
  }
  if (error instanceof ApiError) return error.message || "RetailOS could not verify your session. Retry the request.";
  return "A network error prevented RetailOS from checking your session. Check your connection and retry.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!isPublic);
  const [authError, setAuthError] = useState("");

  const refresh = useCallback(async (): Promise<User | null> => {
    try {
      const data = await api<{ user: User }>("/auth/me");
      setUser(data.user);
      setAuthError("");
      return data.user;
    } catch (error) {
      setUser(null);
      if (error instanceof ApiError && error.status === 401) {
        setAuthError("");
        router.replace("/login");
      } else {
        setAuthError(getAuthFailureMessage(error));
      }
      return null;
    }
  }, [router]);

  const retrySession = useCallback(() => {
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setAuthError("");
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  useEffect(() => {
    if (isPublic) return;

    let cancelled = false;
    void Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setLoading(true);
        return refresh();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isPublic, refresh]);

  const value = useMemo(() => ({ user, loading, refresh, logout }), [user, loading, refresh, logout]);

  if (!isPublic && loading) return <Loader />;
  if (!isPublic && !user && authError) return <AuthRecovery message={authError} onRetry={retrySession} loading={loading} />;
  if (!isPublic && !user) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
