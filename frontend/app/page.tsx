"use client";

import { useEffect, useState } from "react";
import { ApiError, listLeads } from "@/lib/api";
import type { Lead } from "@/lib/types";
import { LeadList } from "@/components/LeadList";

export default function Home() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listLeads()
      .then(setLeads)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : "Could not load leads.");
      });
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!leads) return <p>Loading leads.</p>;
  return (
    <>
      <h1>Leads</h1>
      <LeadList leads={leads} />
    </>
  );
}
