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

type ApiInit = RequestInit & { json?: unknown };

export async function api<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("Content-Type", "application/json");

  const isGet = (init.method ?? "GET") === "GET" && init.json === undefined;
  const cacheKey = isGet ? API_URL + path : null;
  if (cacheKey) {
    const cached = getCached<T>(cacheKey);
    if (cached !== null) return cached;
  }

  const response = await fetch(API_URL + path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Do not redirect failed login/registration or the session probe itself.
    // Any other 401 means a protected action has an expired/invalid session.
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !["/auth/login", "/auth/register", "/auth/me", "/auth/logout"].includes(path)
    ) {
      window.location.assign("/login?reason=session-expired");
    }

    throw new ApiError(
      body?.error?.message || body?.message || "Request failed (" + response.status + ")",
      response.status,
      body,
    );
  }

  const result = (body?.data ?? body) as T;
  if (cacheKey) setCached(cacheKey, result);
  return result;
}

export const getApiUrl = () => API_URL;
