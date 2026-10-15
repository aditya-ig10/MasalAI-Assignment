import { listLeads } from "./api";
import { fetchStoredLeads } from "./firestoreLeads";
import type { Lead } from "./types";

/** Backend rows are live truth; Firestore restores anything the backend
 *  forgot (e.g. after a restart). Shared by the home and leads pages so
 *  both read the same browser cache. */
export async function fetchMergedLeads(): Promise<Lead[]> {
  const [backendRows, storedRows] = await Promise.all([
    listLeads().catch(() => [] as Lead[]),
    fetchStoredLeads().catch(() => [] as Lead[]),
  ]);
  const seen = new Set(backendRows.map((l) => l.id));
  return [...backendRows, ...storedRows.filter((l) => !seen.has(l.id))];
}

/** Newest first, capped — for the home page strip. */
export function newestLeads(leads: Lead[], limit = 5): Lead[] {
  return [...leads]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .slice(0, Math.max(0, limit));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today, 9:41 AM" · "Yesterday, 3:05 PM" · "12 Oct 2026, 9:00 AM".
 *  Always includes the time so new leads are easy to spot. */
export function formatLeadDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  const h24 = d.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  const time = `${h12}:${mm} ${h24 < 12 ? "AM" : "PM"}`;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time}`;
}

/** True when the lead arrived within the window (default 48h) — and not in the future. */
export function isNewLead(iso: string, nowMs: number = Date.now(), windowMs = 48 * 3_600_000): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const age = nowMs - t;
  return age >= 0 && age <= windowMs;
}
