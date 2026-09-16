import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell";

export default function EmployeeDashboard() {
  return <DashboardShell role="employee" user="Peter Employee" title="Employee Dashboard">
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Start Selling"><div className="grid gap-3 sm:grid-cols-2"><Link href="/sales" className="rounded-xl bg-orange-500 px-4 py-3 text-center font-semibold text-black hover:bg-orange-400">▶ Start New Sale</Link><button disabled className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/30">Resume Last Sale (Coming Soon)</button></div></Section>
      <Section title="Alerts"><Placeholder text="Low stock and system alerts will appear here." /></Section>
      <Section title="Today's Activity"><Placeholder text="Today's activity will appear here." /></Section>
      <Section title="Recent Transactions"><Table /></Section>
      <Section title="Quick Access"><div className="flex flex-wrap gap-3"><Link href="/sales" className="rounded-xl border border-white/10 px-4 py-3 text-sm hover:border-orange-500/50">+ New Sale</Link><Link href="/items" className="rounded-xl border border-white/10 px-4 py-3 text-sm hover:border-orange-500/50">Search Products</Link></div></Section>
      <Section title="Products"><div className="flex flex-wrap gap-3"><Link href="/items" className="rounded-xl border border-white/10 px-4 py-3 text-sm">Search Products</Link><button disabled className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/30">Frequent Items (Coming Soon)</button></div></Section>
    </div>
  </DashboardShell>;
}
function Section({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-2xl border border-white/10 bg-[#151515] p-5"><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>}
function Placeholder({text}:{text:string}){return <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">{text}</div>}
function Table(){return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-white/40"><tr>{["DATE","REF","AMOUNT","STATUS"].map(h=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody><tr><td colSpan={4} className="px-3 py-10 text-center text-white/30">No transactions yet</td></tr></tbody></table></div>}
