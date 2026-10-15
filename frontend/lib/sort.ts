import type { Lead, Priority } from "./types";

const ORDER: Record<Priority, number> = { hot: 0, warm: 1, cold: 2 };

export function compareLeads(a: Lead, b: Lead): number {
  const rank = (l: Lead) => (l.analysis ? ORDER[l.analysis.priority] : 3);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (a.created_at === b.created_at) return 0;
  return a.created_at < b.created_at ? -1 : 1;
}

export function sortLeads(leads: Lead[]): Lead[] {
  return [...leads].sort(compareLeads);
}
