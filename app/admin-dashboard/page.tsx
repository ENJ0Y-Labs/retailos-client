import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell";

export default function AdminDashboard() {
  return <DashboardShell role="admin" user="John Admin" title="Admin Dashboard">
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Store Health"><Placeholder text="Store health metrics will appear here." /></Section>
      <Section title="Quick Actions"><div className="grid gap-3 sm:grid-cols-3"><Action label="+ Add Sale" href="/sales" /><Action label="+ Add Purchase" href="/purchases" /><Action label="+ Admit User" href="/users" /></div></Section>
      <Section title="Recent Transactions" className="lg:col-span-2"><TransactionTable /></Section>
      <Section title="Activity Feed" className="lg:col-span-2"><Placeholder text="Activity feed will appear here." /></Section>
    </div>
  </DashboardShell>;
}
function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) { return <section className={`rounded-2xl border border-white/10 bg-[#151515] p-5 ${className}`}><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>; }
function Placeholder({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">{text}</div>; }
function Action({ label, href }: { label: string; href: string }) { return <Link href={href} className="rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-black hover:bg-orange-400">{label}</Link>; }
function TransactionTable() { return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-white/40"><tr>{["DATE","TYPE","REF","AMOUNT","STATUS"].map(h => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody><tr><td colSpan={5} className="px-3 py-10 text-center text-white/30">No transactions yet</td></tr></tbody></table></div>; }
