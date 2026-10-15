"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ApiError, getLead } from "@/lib/api";
import type { Lead } from "@/lib/types";
import { AnalysisCard } from "@/components/AnalysisCard";
import { ChatThread } from "@/components/ChatThread";
import { DecisionMakerFlag } from "@/components/DecisionMakerFlag";

export default function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLead(id)
      .then(setLead)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) setError("Lead not found.");
        else setError(e instanceof ApiError ? e.message : "Could not load this lead.");
      });
  }, [id]);

  if (error) {
    return (
      <>
        <p role="alert">{error}</p>
        <p>
          <Link href="/">Back to leads</Link>
        </p>
      </>
    );
  }
  if (!lead) return <p>Loading lead.</p>;
  return (
    <>
      <h1>{lead.name}</h1>
      <p>{lead.location}</p>
      <AnalysisCard analysis={lead.analysis} analysisError={lead.analysis_error} />
      {lead.analysis ? <DecisionMakerFlag influencer={lead.analysis.influencer} /> : null}
      <ChatThread leadId={lead.id} leadName={lead.name} />
    </>
  );
}
