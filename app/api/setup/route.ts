import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const expected = process.env.SETUP_KEY;
    if (!expected) return NextResponse.json({ error: "Setup is disabled" }, { status: 404 });
    const body = await request.json();
    if (String(body.setupKey ?? "") !== expected) return NextResponse.json({ error: "Invalid setup key" }, { status: 401 });
    const existing = await query("select count(*)::int as count from users");
    if (existing.rows[0].count > 0) return NextResponse.json({ error: "Setup has already been completed" }, { status: 409 });
    const username = String(body.username ?? "admin").trim(); const fullName = String(body.fullName ?? "Administrator").trim(); const password = String(body.password ?? "");
    if (!username || !fullName || password.length < 8) return NextResponse.json({ error: "Username, full name and an 8+ character password are required" }, { status: 400 });
    const hash = await bcrypt.hash(password, 12);
    const result = await query("insert into users(username,full_name,password_hash,role) values($1,$2,$3,'ADMIN') returning id,username,full_name as \"fullName\",role", [username, fullName, hash]);
    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ error: "Unable to initialize RetailOS" }, { status: 500 }); }
}
