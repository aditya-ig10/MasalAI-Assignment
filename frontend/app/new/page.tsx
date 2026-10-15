"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, createLead } from "@/lib/api";
import type { LeadIn } from "@/lib/types";
import { LeadIntakeForm } from "@/components/LeadIntakeForm";

export default function NewLead() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  async function submit(value: LeadIn) {
    setPosting(true);
    setServerError(null);
    try {
      const lead = await createLead(value);
      router.push(`/leads/${lead.id}`);
    } catch (e: unknown) {
      setServerError(e instanceof ApiError ? e.message : "Could not save the lead.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      <h1>New lead</h1>
      {serverError ? <p role="alert">{serverError}</p> : null}
      <LeadIntakeForm onValidSubmit={submit} disabled={posting} />
    </>
  );
}
