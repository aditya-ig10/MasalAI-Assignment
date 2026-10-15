"use client";

import Link from "next/link";
import { use } from "react";
import { getLead } from "@/lib/api";
import { useCachedData } from "@/lib/cache";
import { formatLeadDate } from "@/lib/leads";
import { recordLeadVisit } from "@/lib/recent";
import { formatMoneyFull } from "@/lib/stats";
import { AnalysisCard } from "@/components/AnalysisCard";
import { ChatThread } from "@/components/ChatThread";
import { DecisionMakerFlag } from "@/components/DecisionMakerFlag";
import { PriorityTag } from "@/components/PriorityTag";

export default function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Instant first paint from the browser cache, then a quiet background refresh.
  const {
    data: lead,
    loading,
    error,
  } = useCachedData(`lead:${id}`, async () => {
    const loaded = await getLead(id);
    recordLeadVisit(loaded.id, loaded.name);
    return loaded;
  }, { ttlMs: 60_000 });

  if (error) {
    const message = error.toLowerCase().includes("not found") ? "Lead not found." : error;
    return (
      <>
        <p role="alert" className="alert">{message}</p>
        <p>
          <Link href="/">Back to leads</Link>
        </p>
      </>
    );
  }
  if (loading || !lead) return <p>Loading…</p>;

  // Cached lead paints instantly and intentionally differs from SSR HTML —
  // suppress the hydration warning for this region (client data always wins).
  return (
    <div suppressHydrationWarning>
      <p style={{ margin: "0 0 12px", fontSize: 12 }}>
        <Link href="/">← All leads</Link>
      </p>
      <div className="page-head">
        <p className="micro-label">Lead</p>
        <h1>{lead.name}</h1>
        <p>
          {lead.location} · {lead.property_requirement} · {formatMoneyFull(lead.budget)} ·{" "}
          {lead.buying_timeline}{" "}
          {lead.analysis ? <PriorityTag priority={lead.analysis.priority} /> : null}
        </p>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <section className="card" aria-label="Lead record">
          <p className="micro-label">Record</p>
          <dl className="kv">
            <dt>Name</dt>
            <dd>{lead.name}</dd>
            <dt>Location</dt>
            <dd>{lead.location}</dd>
            <dt>Requirement</dt>
            <dd>{lead.property_requirement}</dd>
            <dt>Budget</dt>
            <dd>{formatMoneyFull(lead.budget as unknown as number)}</dd>
            <dt>Timeline</dt>
            <dd>{lead.buying_timeline}</dd>
            <dt>Added</dt>
            <dd title={lead.created_at}>{formatLeadDate(lead.created_at)}</dd>
          </dl>
          <h3 style={{ margin: "14px 0 6px", fontSize: 19 }}>Customer message</h3>
          <p style={{ margin: 0, fontSize: 13 }}>{lead.customer_message}</p>
        </section>
        <AnalysisCard analysis={lead.analysis} analysisError={lead.analysis_error} />
        {lead.analysis ? <DecisionMakerFlag influencer={lead.analysis.influencer} /> : null}
      </div>

      <div style={{ marginTop: 26 }}>
        <ChatThread leadId={lead.id} leadName={lead.name} />
      </div>
    </div>
  );
}
