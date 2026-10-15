import Link from "next/link";
import type { Lead } from "@/lib/types";
import { formatLeadDate, isNewLead } from "@/lib/leads";
import { PriorityTag } from "./PriorityTag";
import { formatMoney } from "@/lib/stats";

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link href={`/leads/${lead.id}`} className="lead-card">
      <div className="lead-top">
        <span className="lead-name">{lead.name}</span>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          {isNewLead(lead.created_at) ? <span className="tag tag-live">New</span> : null}
          {lead.analysis ? (
            <PriorityTag priority={lead.analysis.priority} />
          ) : (
            <span className="tag tag-neutral">Pending</span>
          )}
        </span>
      </div>
      <p className="lead-meta">
        {lead.location} · {formatMoney(lead.budget)} · {lead.buying_timeline}
        {lead.analysis?.influencer.present ? " · flagged" : ""}
        {lead.origin === "call" ? " · via call" : ""}
      </p>
      <p className="lead-meta" title={lead.created_at}>
        Added {formatLeadDate(lead.created_at)}
      </p>
      <p className="lead-reason">
        {lead.analysis ? lead.analysis.priority_reason : "Analysis pending."}
      </p>
    </Link>
  );
}
