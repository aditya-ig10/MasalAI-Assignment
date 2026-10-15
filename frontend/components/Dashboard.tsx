"use client";

import Link from "next/link";
import { Flag, Flame, Inbox, Plus, Wallet } from "lucide-react";
import { getStats } from "@/lib/api";
import { useCachedData } from "@/lib/cache";
import { fetchMergedLeads, newestLeads } from "@/lib/leads";
import type { Lead } from "@/lib/types";
import { computeStats, formatMoney, type DashboardStats } from "@/lib/stats";
import { PriorityDonut, IntentBars, BudgetBars } from "@/components/charts";
import { LeadCard } from "@/components/LeadCard";

function StatCell({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: typeof Inbox }) {
  return (
    <div className="stat-cell">
      <div className="stat-label stat-head">
        <Icon size={12} strokeWidth={2} aria-hidden /> {label}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

const EMPTY_STATS: DashboardStats = computeStats([]);

export default function Home() {
  // Instant first paint from the browser cache, then a quiet background refresh.
  const { data: stats, loading } = useCachedData<DashboardStats>("stats", getStats, {
    ttlMs: 60_000,
    fallback: EMPTY_STATS,
  });
  // Same cache key as the leads page, so both views share one fetch.
  const { data: leads } = useCachedData<Lead[]>("leads", fetchMergedLeads, { ttlMs: 300_000 });

  if (loading || !stats) return <p>Loading…</p>;

  const hotPct = stats.total > 0 ? Math.round(((stats.by_priority.hot ?? 0) / stats.total) * 100) : 0;

  // Cached stats paint instantly and intentionally differ from SSR HTML —
  // suppress the hydration warning for this region (client data always wins).
  return (
    <div suppressHydrationWarning>
      <div className="page-head">
        <p className="micro-label">Pipeline</p>
        <h1>Leads, ranked by intent.</h1>
        <p>
          {stats.total} open leads · {formatMoney(stats.pipeline_value)} in play ·{" "}
          <Link href="/new">
            <Plus size={13} strokeWidth={2} aria-hidden style={{ verticalAlign: "-2px" }} /> New lead
          </Link>
        </p>
      </div>

      <div className="stat-grid">
        <StatCell label="Total" value={String(stats.total)} sub={`${stats.pending} awaiting analysis`} icon={Inbox} />
        <StatCell label="Hot" value={String(stats.by_priority.hot ?? 0)} sub={`${hotPct}% of total`} icon={Flame} />
        <StatCell label="Pipeline" value={formatMoney(stats.pipeline_value)} sub={`${formatMoney(stats.hot_value)} hot`} icon={Wallet} />
        <StatCell label="Flagged" value={String(stats.flagged)} sub="multi-stakeholder" icon={Flag} />
      </div>

      <div id="pipeline" className="chart-grid">
        <section className="card" aria-label="Priority mix">
          <p className="micro-label">Priority</p>
          <PriorityDonut data={stats.by_priority} />
        </section>
        <section className="card" aria-label="Intent breakdown">
          <p className="micro-label">Intent</p>
          <IntentBars data={stats.by_intent} />
        </section>
        <section className="card" aria-label="Budget spread">
          <p className="micro-label">Budget</p>
          <BudgetBars data={stats.budget_buckets} />
        </section>
      </div>

      <div className="section-title" id="leads">
        <h2>Recent leads</h2>
        <Link href="/leads">View all →</Link>
      </div>
      {leads === null ? (
        <p>Loading recent leads…</p>
      ) : leads.length === 0 ? (
        <div className="empty-search">
          <p className="empty-title">No leads yet</p>
          <p className="empty-sub">
            <Link href="/new">Add your first lead →</Link>
          </p>
        </div>
      ) : (
        <div className="lead-grid">
          {newestLeads(leads, 5).map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
