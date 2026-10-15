"use client";

import { useState } from "react";
import type { Lead, Priority } from "@/lib/types";
import { sortLeads } from "@/lib/sort";
import { LeadCard } from "./LeadCard";
import { EmptyState } from "./EmptyState";
import styles from "./LeadList.module.css";

type Filter = "all" | Priority | "flagged";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hot", label: "Hot" },
  { key: "warm", label: "Warm" },
  { key: "cold", label: "Cold" },
  { key: "flagged", label: "Flagged" },
];

export function LeadList({ leads }: { leads: Lead[] }) {
  const [sortKey, setSortKey] = useState<"priority" | "newest">("priority");
  const [filter, setFilter] = useState<Filter>("all");

  if (leads.length === 0) return <EmptyState />;

  const ordered =
    sortKey === "priority"
      ? sortLeads(leads)
      : [...leads].sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
  const visible = ordered.filter((l) => {
    if (filter === "all") return true;
    if (filter === "flagged") return l.analysis?.influencer.present === true;
    return l.analysis?.priority === filter;
  });

  return (
    <div>
      <div className={styles.controls}>
        <label htmlFor="sort">Sort</label>
        <select
          id="sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as "priority" | "newest")}
        >
          <option value="priority">Priority</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      <div className={styles.chips} role="group" aria-label="Filter">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            className={filter === f.key ? styles.active : undefined}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {visible.map((l) => (
        <LeadCard key={l.id} lead={l} />
      ))}
    </div>
  );
}
