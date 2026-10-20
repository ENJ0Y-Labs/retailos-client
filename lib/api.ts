import type { ApiErrorBody } from "@/lib/types";

// Browser requests use the same-origin Next.js proxy so the session cookie is
// associated with the frontend origin in both development and production.
const API_URL = "/api";

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

  return (body?.data ?? body) as T;
}

export const getApiUrl = () => API_URL;
