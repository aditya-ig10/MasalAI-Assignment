"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ApiError, getStats, listLeads } from "@/lib/api";
import type { Lead, Priority } from "@/lib/types";
import { computeStats, formatMoney } from "@/lib/stats";
import { BudgetBars, IntentBars, LeadsOverTime, PriorityDonut, ValueBars } from "@/components/charts";

function dayOf(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "unknown" : d.toISOString().slice(0, 10);
}

export default function Analytics() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof computeStats> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [priority, setPriority] = useState<"all" | Priority>("all");

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const [rows, s] = await Promise.all([listLeads(), getStats()]);
      setLeads(rows);
      setStats(s);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Could not load analytics.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let live = true;
    Promise.all([listLeads(), getStats()])
      .then(([rows, s]) => {
        if (live) {
          setLeads(rows);
          setStats(s);
        }
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof ApiError ? e.message : "Could not load analytics.");
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scoped = useMemo(() => {
    const rows = leads ?? [];
    return priority === "all" ? rows : rows.filter((l) => l.analysis?.priority === priority);
  }, [leads, priority]);

  const scopedStats = useMemo(() => computeStats(scoped), [scoped]);

  function exportCsv() {
    if (!leads) return;
    const head = ["id", "name", "location", "requirement", "budget", "timeline", "priority", "intent", "origin", "message"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = leads.map((l) =>
      [l.id, l.name, l.location, l.property_requirement, l.budget, l.buying_timeline, l.analysis?.priority ?? "", l.analysis?.intent ?? "", (l as { origin?: string }).origin ?? "", l.customer_message]
        .map(esc)
        .join(",")
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leadanalyzer-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${leads.length} leads to CSV.`);
  }

  if (error) return <p role="alert">{error}</p>;
  if (!leads || !stats) return <p>Loading…</p>;

  const valueByPriority = (["hot", "warm", "cold"] as const).map((p) => ({
    name: p,
    value: scoped
      .filter((l) => l.analysis?.priority === p)
      .reduce((sum, l) => sum + (l.budget || 0), 0),
  }));

  const perDay = new Map<string, number>();
  for (const l of scoped) perDay.set(dayOf(l.created_at), (perDay.get(dayOf(l.created_at)) ?? 0) + 1);
  const overTime = [...perDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, count]) => ({ day: day.slice(5), count }));

  const flagged = leads.filter((l) => l.analysis?.influencer.present).length;
  const analyzed = leads.filter((l) => l.analysis).length;
  const funnel = [
    { label: "Total", value: leads.length },
    { label: "Analyzed", value: analyzed },
    { label: "Hot", value: stats.by_priority.hot ?? 0 },
    { label: "Flagged", value: flagged },
  ];

  return (
    <>
      <div className="page-head">
        <p className="micro-label">Analytics</p>
        <h1>Pipeline in detail.</h1>
        <p>
          {leads.length} leads · {formatMoney(stats.pipeline_value)} total pipeline · {flagged} flagged.
        </p>
        <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <div className="chips" role="group" aria-label="Scope charts by priority">
            {(["all", "hot", "warm", "cold"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className="chip"
                aria-pressed={priority === p}
                onClick={() => setPriority(p)}
              >
                {p === "all" ? "All" : p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={load} disabled={refreshing}>
            <RefreshCw size={13} strokeWidth={2} aria-hidden /> {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={exportCsv}>
            <Download size={13} strokeWidth={2} aria-hidden /> CSV
          </button>
        </div>
      </div>

      <section className="card" aria-label="Funnel" style={{ marginBottom: 10 }}>
        <p className="micro-label">Funnel {priority !== "all" ? `· scoped to ${priority}` : ""}</p>
        <div className="funnel">
          {funnel.map((f) => (
            <div key={f.label} className="funnel-step">
              <span className="funnel-value">{f.value}</span>
              <span className="funnel-label">{f.label}</span>
              <span
                className="funnel-bar"
                style={{ width: `${leads.length > 0 ? Math.max(4, (f.value / leads.length) * 100) : 0}%` }}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="chart-grid">
        <section className="card" aria-label="Priority mix">
          <p className="micro-label">Priority</p>
          <PriorityDonut data={scopedStats.by_priority} />
        </section>
        <section className="card" aria-label="Intent breakdown">
          <p className="micro-label">Intent</p>
          <IntentBars data={scopedStats.by_intent} />
        </section>
        <section className="card" aria-label="Budget spread">
          <p className="micro-label">Budget</p>
          <BudgetBars data={scopedStats.budget_buckets} />
        </section>
      </div>

      <div className="chart-grid">
        <section className="card" aria-label="Pipeline value">
          <p className="micro-label">Value by priority</p>
          <ValueBars data={valueByPriority} />
        </section>
        <section className="card" aria-label="Leads over time" style={{ gridColumn: "span 2" }}>
          <p className="micro-label">Leads over time</p>
          <LeadsOverTime data={overTime} />
        </section>
      </div>
    </>
  );
}
