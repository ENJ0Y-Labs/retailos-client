import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireSession();
    const result = await query("select id,title,message,read_at as \"readAt\",created_at as \"createdAt\" from notifications where user_id is null or user_id=$1 order by created_at desc limit 50", [user.id]);
    return NextResponse.json({ notifications: result.rows });
  } catch (error) { return NextResponse.json({ error: "Unable to load notifications" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSession();
    const body = await request.json();
    if (body.all) await query("update notifications set read_at=coalesce(read_at,now()) where user_id is null or user_id=$1", [user.id]);
    else if (body.id) await query("update notifications set read_at=coalesce(read_at,now()) where id=$1 and (user_id is null or user_id=$2)", [String(body.id), user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: "Unable to update notification" }, { status: 500 }); }
}
