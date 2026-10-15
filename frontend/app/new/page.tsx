"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Braces, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ApiError, createLead } from "@/lib/api";
import { persistLead } from "@/lib/firestoreLeads";
import type { LeadIn } from "@/lib/types";
import { BulkLeadImport } from "@/components/BulkLeadImport";
import { LeadIntakeForm } from "@/components/LeadIntakeForm";

type Tab = "single" | "bulk";

export default function NewLead() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("single");
  const [serverError, setServerError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  async function submit(value: LeadIn) {
    setPosting(true);
    setServerError(null);
    try {
      const lead = await createLead(value);
      void persistLead(lead).catch(() => {});
      toast.success("Lead saved — AI triage complete.");
      router.push(`/leads/${lead.id}`);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "Could not save the lead.";
      setServerError(message);
      toast.error(message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <p className="micro-label">Intake</p>
        <h1>New lead{tab === "bulk" ? "s" : ""}</h1>
        <p>
          {tab === "single"
            ? "Capture it once. Triage runs automatically."
            : "Paste many at once. Each valid row gets its own triage."}
        </p>
      </div>

      <div className="chips" role="tablist" aria-label="Intake mode" style={{ marginBottom: 12 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "single"}
          aria-pressed={tab === "single"}
          className="chip"
          onClick={() => setTab("single")}
        >
          <UserPlus size={13} aria-hidden style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Single lead
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "bulk"}
          aria-pressed={tab === "bulk"}
          className="chip"
          onClick={() => setTab("bulk")}
        >
          <Braces size={13} aria-hidden style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Bulk JSON
        </button>
      </div>

      {tab === "single" ? (
        <div role="tabpanel" aria-label="Single lead form">
          {serverError ? (
            <p role="alert" className="alert" style={{ margin: "0 0 12px" }}>
              {serverError}
            </p>
          ) : null}
          <LeadIntakeForm onValidSubmit={submit} disabled={posting} />
        </div>
      ) : (
        <div className="card" role="tabpanel" aria-label="Bulk JSON import">
          <BulkLeadImport disabled={posting} />
        </div>
      )}
    </>
  );
}
