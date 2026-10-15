"use client";

import { useEffect, useState } from "react";
import { ApiError, listLeads } from "@/lib/api";
import type { Lead } from "@/lib/types";
import { ChatThread } from "@/components/ChatThread";

export default function ChatPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listLeads()
      .then((rows) => {
        if (live) setLeads(rows);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof ApiError ? e.message : "Could not load leads.");
      });
    return () => {
      live = false;
    };
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!leads) return <p>Loading…</p>;
  if (leads.length === 0) return <p>No leads yet — add one first.</p>;

  return (
    <ChatThread
      key="all-leads"
      leadId="all"
      leadName="Pipeline assistant"
      initialHistory={[]}
      contextLeads={leads}
    />
  );
}
