"use client";

export interface RecentLead {
  id: string;
  name: string;
  at: string;
}

const LEADS_KEY = "masalai-recent-leads";
const LIMIT = 8;

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as T[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — recents are best-effort
  }
}

export function recordLeadVisit(id: string, name: string): void {
  if (typeof window === "undefined") return;
  const rows = read<RecentLead>(LEADS_KEY).filter((r) => r.id !== id);
  rows.unshift({ id, name, at: new Date().toISOString() });
  write(LEADS_KEY, rows.slice(0, LIMIT));
}

export function getRecentLeads(): RecentLead[] {
  if (typeof window === "undefined") return [];
  return read<RecentLead>(LEADS_KEY);
}
