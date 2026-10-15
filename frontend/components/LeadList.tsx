"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
import type { Lead, LeadIn, Priority } from "@/lib/types";
import { ApiError, deleteLead, updateLead } from "@/lib/api";
import { forgetLead, persistLead } from "@/lib/firestoreLeads";
import { sortLeads } from "@/lib/sort";
import { LeadCard } from "./LeadCard";
import { EmptyState } from "./EmptyState";

type Filter = "all" | Priority | "flagged";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hot", label: "Hot" },
  { key: "warm", label: "Warm" },
  { key: "cold", label: "Cold" },
  { key: "flagged", label: "Flagged" },
];

const ADMIN_CODE = "tetrax";

function AdminRow({
  lead,
  onUpdated,
  onDeleted,
}: {
  lead: Lead;
  onUpdated: (lead: Lead) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: lead.name,
    location: lead.location,
    property_requirement: lead.property_requirement,
    budget: String(lead.budget),
    buying_timeline: lead.buying_timeline,
    customer_message: lead.customer_message,
  });

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save() {
    const payload: LeadIn = {
      name: form.name.trim(),
      location: form.location.trim(),
      property_requirement: form.property_requirement.trim(),
      budget: Number(form.budget),
      buying_timeline: form.buying_timeline.trim(),
      customer_message: form.customer_message.trim(),
    };
    if (!payload.name || !payload.location || !payload.property_requirement || !payload.customer_message) {
      toast.error("Name, location, requirement and message are required.");
      return;
    }
    if (!(payload.budget > 0)) {
      toast.error("Budget must be greater than zero.");
      return;
    }
    setBusy(true);
    try {
      const updated = await updateLead(lead.id, payload);
      onUpdated(updated);
      setEditing(false);
      void persistLead(updated).catch(() => {});
      toast.success(`Saved ${updated.name} — re-analyzed.`);
    } catch (e: unknown) {
      toast.error(e instanceof ApiError ? e.message : "Could not save the lead.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteLead(lead.id);
      onDeleted(lead.id);
      void forgetLead(lead.id).catch(() => {});
      toast.success(`Deleted ${lead.name}.`);
    } catch (e: unknown) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete the lead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lead-card">
      <div className="lead-top">
        <span className="lead-name">{lead.name}</span>
        <span className="tag tag-neutral">{lead.analysis?.priority ?? "pending"}</span>
      </div>
      <p className="lead-meta">
        {lead.location} · {lead.property_requirement}
      </p>
      {!editing ? (
        <div className="toolbar" style={{ margin: "10px 0 0" }}>
          <Link href={`/leads/${lead.id}`} className="btn btn-ghost">
            Open
          </Link>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setEditing(true)}>
            <Pencil size={13} strokeWidth={2} aria-hidden /> Edit
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={remove}>
            <Trash2 size={13} strokeWidth={2} aria-hidden /> Delete
          </button>
        </div>
      ) : (
        <div className="form-grid" style={{ marginTop: 10 }}>
          {(["name", "location", "property_requirement", "budget", "buying_timeline"] as const).map((f) => (
            <div key={f}>
              <label htmlFor={`admin-${lead.id}-${f}`}>{f.replace(/_/g, " ")}</label>
              <input
                id={`admin-${lead.id}-${f}`}
                className="input"
                style={{ width: "100%" }}
                value={form[f]}
                onChange={(e) => set(f, e.target.value)}
                disabled={busy}
              />
            </div>
          ))}
          <div>
            <label htmlFor={`admin-${lead.id}-message`}>Customer message</label>
            <textarea
              id={`admin-${lead.id}-message`}
              className="input"
              style={{ width: "100%" }}
              rows={3}
              value={form.customer_message}
              onChange={(e) => set("customer_message", e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="toolbar" style={{ margin: 0 }}>
            <button type="button" className="btn btn-dark" disabled={busy} onClick={save}>
              Save
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LeadList({ leads: initial, initialQuery = "" }: { leads: Lead[]; initialQuery?: string }) {
  const [items, setItems] = useState<Lead[]>(initial);
  const [sortKey, setSortKey] = useState<"priority" | "newest">("priority");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState(initialQuery);
  const [admin, setAdmin] = useState(initialQuery.trim().toLowerCase() === ADMIN_CODE);
  const announced = useRef(false);

  useEffect(() => {
    if (query.trim().toLowerCase() === ADMIN_CODE && !announced.current) {
      announced.current = true;
      setAdmin(true);
      toast.success("Admin access granted — edit and delete enabled.", { icon: <ShieldCheck size={15} /> });
    }
  }, [query]);

  const visible = useMemo(() => {
    if (items.length === 0) return [];
    const ordered =
      sortKey === "priority"
        ? sortLeads(items)
        : [...items].sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
    const q = admin ? "" : query.trim().toLowerCase();
    return ordered.filter((l) => {
      if (filter === "flagged" && l.analysis?.influencer.present !== true) return false;
      if (filter !== "all" && filter !== "flagged" && l.analysis?.priority !== filter) return false;
      if (!q) return true;
      const hay = [l.name, l.location, l.property_requirement, l.buying_timeline, l.customer_message, l.analysis?.intent ?? "", l.analysis?.priority ?? ""]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((t) => hay.includes(t));
    });
  }, [items, sortKey, filter, query, admin]);

  if (items.length === 0) return <EmptyState />;

  return (
    <div>
      <div className="toolbar">
        <label htmlFor="sort" style={{ fontSize: 13, fontWeight: 700 }}>
          Sort
        </label>
        <select
          id="sort"
          className="input"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as "priority" | "newest")}
        >
          <option value="priority">Priority</option>
          <option value="newest">Newest</option>
        </select>
        <input
          className="input"
          style={{ flex: 1 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter these leads…"
          aria-label="Filter leads"
        />
      </div>
      {admin ? (
        <p className="alert" role="status" style={{ marginBottom: 12 }}>
          Admin mode — edits re-run AI analysis. Deletions are permanent.
        </p>
      ) : null}
      <div className="chips" role="group" aria-label="Filter" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            className="chip"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="sub">No leads match this filter.</p>
      ) : (
        <div className="lead-grid">
          {visible.map((l) =>
            admin ? (
              <AdminRow
                key={l.id}
                lead={l}
                onUpdated={(updated) => setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                onDeleted={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
              />
            ) : (
              <LeadCard key={l.id} lead={l} />
            )
          )}
        </div>
      )}
    </div>
  );
}
