"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { getRecentLeads, type RecentLead } from "@/lib/recent";

export default function PropertiesPage() {
  const [leads, setLeads] = useState<RecentLead[]>([]);

  useEffect(() => {
    setLeads(getRecentLeads());
  }, []);

  return (
    <>
      <div className="page-head">
        <p className="micro-label">
          <History size={12} strokeWidth={2} aria-hidden style={{ verticalAlign: "-1px" }} /> Recent visits
        </p>
        <h1>Picked up where you left off.</h1>
        <p>Leads you opened, most recent first.</p>
      </div>

      <div className="section-title">
        <h2>Recently viewed leads</h2>
        <span className="count">{leads.length}</span>
      </div>
      {leads.length === 0 ? (
        <div className="empty-search">
          <span className="empty-icon" aria-hidden>
            <History size={20} strokeWidth={1.5} />
          </span>
          <p className="empty-title">Nothing here yet</p>
          <p className="empty-sub">
            Open a lead and it will show up here. <Link href="/leads">Browse leads →</Link>
          </p>
        </div>
      ) : (
        <div className="lead-grid">
          {leads.map((r) => (
            <Link key={r.id} href={`/leads/${r.id}`} className="lead-card">
              <div className="lead-top">
                <span className="lead-name" style={{ fontSize: 17 }}>
                  {r.name}
                </span>
                <span className="tag tag-neutral">recent</span>
              </div>
              <p className="lead-meta">Viewed {new Date(r.at).toLocaleString()}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
