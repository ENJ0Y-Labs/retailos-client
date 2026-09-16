import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

function secret() {
  const value = process.env.AUTH_SECRET;
  return value ? new TextEncoder().encode(value) : null;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth") || path === "/api/setup") {
    return NextResponse.next();
  }

  const protectedPage = [
    "/admin-dashboard",
    "/manager-dashboard",
    "/employee-dashboard",
    "/sales",
    "/items",
    "/inventory",
    "/transactions",
    "/purchases",
    "/report",
    "/users",
    "/notification",
    "/settings",
  ].some((p) => path === p || path.startsWith(`${p}/`));

  if (!protectedPage) return NextResponse.next();

  const key = secret();
  const token = request.cookies.get("retailos_session")?.value;
  if (!key || !token) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const { payload } = await jwtVerify(token, key);
    const role = String(payload.role ?? "");

    if (path.startsWith("/admin-dashboard") && role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(role === "MANAGER" ? "/manager-dashboard" : "/employee-dashboard", request.url),
      );
    }

    if (path.startsWith("/manager-dashboard") && !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.redirect(new URL("/employee-dashboard", request.url));
    }

    if (path.startsWith("/inventory") || path.startsWith("/purchases") || path.startsWith("/report")) {
      if (!["ADMIN", "MANAGER"].includes(role)) {
        return NextResponse.redirect(new URL("/employee-dashboard", request.url));
      }
    }

    if (path.startsWith("/users") && role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(role === "MANAGER" ? "/manager-dashboard" : "/employee-dashboard", request.url),
      );
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
