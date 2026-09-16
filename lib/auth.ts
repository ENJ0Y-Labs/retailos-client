import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { query } from "@/lib/db";

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";
export type SessionUser = { id: string; username: string; fullName: string; role: Role };

const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(value);
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  const store = await cookies();
  store.set("retailos_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const token = (await cookies()).get("retailos_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    if (!payload.id || !payload.username || !payload.role) return null;
    return {
      id: String(payload.id),
      username: String(payload.username),
      fullName: String(payload.fullName ?? payload.username),
      role: String(payload.role) as Role,
    };
  } catch {
    return null;
  }
}

export async function requireSession(roles?: Role[]) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (roles && !roles.includes(session.role)) throw new Error("FORBIDDEN");
  return session;
}

export async function findUser(username: string) {
  const result = await query<{
    id: string; username: string; full_name: string; password_hash: string; role: Role; active: boolean;
  }>("select id, username, full_name, password_hash, role, active from users where lower(username)=lower($1) limit 1", [username]);
  return result.rows[0] ?? null;
}
