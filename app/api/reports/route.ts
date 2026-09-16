import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireSession(["ADMIN", "MANAGER"]);
    const period = new URL(request.url).searchParams.get("period") ?? "daily";
    const days = period === "yearly" ? 365 : period === "monthly" ? 30 : 1;
    const interval = "($1::text || ' days')::interval";
    const summary = await query(`select coalesce(sum(total_amount),0) as "totalSales", coalesce(sum(total_amount-total_cost),0) as "totalProfit", count(*)::int as "transactions" from sales where status='COMPLETED' and created_at >= now() - ${interval}`, [days]);
    const payments = await query(`select payment, coalesce(sum(total_amount),0) as amount, count(*)::int as transactions from sales where status='COMPLETED' and created_at >= now() - ${interval} group by payment order by amount desc`, [days]);
    const topItems = await query(`select p.name, sum(si.quantity)::int as quantity, sum(si.line_total) as sales from sale_items si join sales s on s.id=si.sale_id join products p on p.id=si.product_id where s.status='COMPLETED' and s.created_at >= now() - ${interval} group by p.id,p.name order by sales desc limit 10`, [days]);
    const employees = await query(`select u.full_name as "employeeName", count(s.id)::int as transactions, coalesce(sum(s.total_amount),0) as sales from sales s join users u on u.id=s.employee_id where s.status='COMPLETED' and s.created_at >= now() - ${interval} group by u.id,u.full_name order by sales desc`, [days]);
    const trend = await query("select to_char(day,'YYYY-MM-DD') as date, coalesce(sum(s.total_amount),0) as sales from generate_series(current_date - 6, current_date, interval '1 day') day left join sales s on s.created_at::date=day::date and s.status='COMPLETED' group by day order by day");
    return NextResponse.json({ summary: summary.rows[0], payments: payments.rows, topItems: topItems.rows, employees: employees.rows, trend: trend.rows });
  } catch (error) { return NextResponse.json({ error: "Unable to generate report" }, { status: 500 }); }
}
