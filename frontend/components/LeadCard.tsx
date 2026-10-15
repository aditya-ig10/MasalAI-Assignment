import Link from "next/link";
import type { Lead } from "@/lib/types";
import { PriorityTag } from "./PriorityTag";
import styles from "./LeadCard.module.css";

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link href={`/leads/${lead.id}`} className={styles.card}>
      <div className={styles.top}>
        <span className={styles.name}>{lead.name}</span>
        {lead.analysis ? (
          <PriorityTag priority={lead.analysis.priority} />
        ) : (
          <span className={styles.pending}>Pending</span>
        )}
      </div>
      <p className={styles.reason}>
        {lead.analysis ? lead.analysis.priority_reason : "Analysis pending."}
      </p>
      {lead.analysis?.influencer.present ? <p className={styles.flag}>Decision maker flagged</p> : null}
    </Link>
  );
}
