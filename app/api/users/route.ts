import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    await requireSession(["ADMIN", "MANAGER"]);
    const result = await query("select id,username,full_name as \"fullName\",role,active,created_at as \"createdAt\" from users order by created_at desc");
    return NextResponse.json({ users: result.rows });
  } catch (error) { const status = error instanceof Error && error.message === "FORBIDDEN" ? 403 : 500; return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unable to load users" }, { status }); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSession(["ADMIN"]);
    const body = await request.json();
    const username = String(body.username ?? "").trim(); const fullName = String(body.fullName ?? "").trim(); const password = String(body.password ?? ""); const role = String(body.role ?? "EMPLOYEE").toUpperCase();
    if (!username || !fullName || password.length < 8 || !["ADMIN","MANAGER","EMPLOYEE"].includes(role)) return NextResponse.json({ error: "Username, full name, valid role and an 8+ character password are required" }, { status: 400 });
    const hash = await bcrypt.hash(password, 12);
    const result = await query("insert into users(username,full_name,password_hash,role) values($1,$2,$3,$4) returning id,username,full_name as \"fullName\",role,active", [username, fullName, hash, role]);
    await query("insert into audit_logs(user_id,action,entity,entity_id,details) values($1,'CREATE','USER',$2,$3)", [actor.id, result.rows[0].id, JSON.stringify({ username, role })]);
    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: "Unable to create user. Username may already exist." }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireSession(["ADMIN"]); const body = await request.json(); const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "User id is required" }, { status: 400 });
    const result = await query("update users set full_name=coalesce(nullif($2,''),full_name), role=coalesce($3,role), active=coalesce($4,active) where id=$1 returning id,username,full_name as \"fullName\",role,active", [id, body.fullName ? String(body.fullName).trim() : "", body.role ? String(body.role).toUpperCase() : null, typeof body.active === "boolean" ? body.active : null]);
    if (!result.rowCount) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await query("insert into audit_logs(user_id,action,entity,entity_id,details) values($1,'UPDATE','USER',$2,$3)", [actor.id, id, JSON.stringify(body)]);
    return NextResponse.json({ user: result.rows[0] });
  } catch (error) { return NextResponse.json({ error: "Unable to update user" }, { status: 400 }); }
}
