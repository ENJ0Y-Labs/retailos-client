import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, findUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    if (!username || !password) return NextResponse.json({ error: "Username and password are required" }, { status: 400 });

    const user = await findUser(username);
    if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    await createSession({ id: user.id, username: user.username, fullName: user.full_name, role: user.role });
    return NextResponse.json({ user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to sign in. Check the database configuration." }, { status: 500 });
  }
}
