import type { ApiErrorBody } from "@/lib/types";

// Browser requests use the same-origin Next.js proxy so the session cookie is
// associated with the frontend origin in both development and production.
// Set NEXT_PUBLIC_API_URL to call the Flask backend directly or via a
// dedicated gateway (NGINX, Kong, AWS ALB) instead of the Next.js proxy.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

// Simple in-memory cache for GET requests to reduce redundant backend calls.
const GET_CACHE = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL_MS = 30_000;

function getCached<T>(key: string): T | null {
  const entry = GET_CACHE.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  GET_CACHE.delete(key);
  return null;
}

function setCached<T>(key: string, data: T) {
  GET_CACHE.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error?.code;
    this.fields = body?.error?.fields;
  }
}

type ApiInit = RequestInit & { json?: unknown; refresh?: boolean };

export async function api<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  // `refresh` bypasses the in-memory GET cache so callers can re-read the
  // server state after a mutation without inventing a cache-busting query
  // parameter on the backend contract.
  const { refresh = false, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (rest.json !== undefined) headers.set("Content-Type", "application/json");

  const isGet = (rest.method ?? "GET") === "GET" && rest.json === undefined;
  const cacheKey = isGet ? API_URL + path : null;
  if (cacheKey && !refresh) {
    const cached = getCached<T>(cacheKey);
    if (cached !== null) return cached;
  }

  const response = await fetch(API_URL + path, {
    ...rest,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    body: rest.json !== undefined ? JSON.stringify(rest.json) : rest.body,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Do not redirect failed login/registration or the session probe itself.
    // Any other 401 means a protected action has an expired/invalid session.
    const isIncorrectCurrentPassword =
      path === "/auth/change-password" && body?.error?.code === "AUTH_INVALID_CURRENT_PASSWORD";
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !isIncorrectCurrentPassword &&
      !["/auth/login", "/auth/register", "/auth/me", "/auth/logout"].includes(path)
    ) {
      // This helper is a plain module, so the App Router router is not
      // available here. A full navigation is required so the app boots with a
      // clean in-memory GET cache after the session is replaced.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login?reason=session-expired");
    }

    throw new ApiError(
      body?.error?.message || body?.message || "Request failed (" + response.status + ")",
      response.status,
      body,
    );
  }

  // Mutations may invalidate any cached read, including product prices and sale totals.
  if (!isGet) GET_CACHE.clear();

  const result = (body?.data ?? body) as T;
  if (cacheKey) setCached(cacheKey, result);
  return result;
}

export const getApiUrl = () => API_URL;
