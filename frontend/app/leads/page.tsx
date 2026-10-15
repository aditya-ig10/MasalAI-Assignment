"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useCachedData } from "@/lib/cache";
import { fetchMergedLeads } from "@/lib/leads";
import type { Lead } from "@/lib/types";
import { LeadList } from "@/components/LeadList";
import { LeadListSkeleton } from "@/components/LeadListSkeleton";

function LeadsBody() {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  // Instant first paint from the browser cache, then a quiet background refresh.
  // The Update button re-runs the same refresh on demand.
  const {
    data: leads,
    error,
    refreshing,
    refresh,
  } = useCachedData<Lead[]>("leads", fetchMergedLeads, { ttlMs: 300_000 });

  if (error) return <p role="alert">{error}</p>;

  // Cached leads paint instantly and intentionally differ from SSR HTML —
  // suppress the hydration warning for this region (client data always wins).
  // One stable wrapper keeps the tree shape identical while loading.
  return (
    <div suppressHydrationWarning>
      <div className="page-head">
        <p className="micro-label">Pipeline</p>
        <h1>Leads</h1>
        {leads ? (
          <p>
            {leads.length} open leads · ranked hot → warm → cold.
          </p>
        ) : null}
        <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <button type="button" className="btn btn-ghost" onClick={() => void refresh()} disabled={refreshing || !leads}>
            <RefreshCw size={13} strokeWidth={2} aria-hidden />
            {refreshing ? "Updating…" : "Update"}
          </button>
        </div>
      </div>
      {leads ? (
        <LeadList leads={leads} initialQuery={initialQuery} />
      ) : (
        <LeadListSkeleton count={5} />
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadListSkeleton count={5} />}>
      <LeadsBody />
    </Suspense>
  );
}
