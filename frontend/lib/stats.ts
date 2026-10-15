import type { Lead } from "./types";

export interface DashboardStats {
  total: number;
  pending: number;
  flagged: number;
  pipeline_value: number;
  hot_value: number;
  by_priority: Record<string, number>;
  by_intent: Record<string, number>;
  budget_buckets: { bucket: string; count: number }[];
}

export function computeStats(leads: Lead[]): DashboardStats {
  const by_priority: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
  const by_intent: Record<string, number> = {};
  const buckets: Record<string, number> = {
    "< ₹50L": 0,
    "₹50L–₹1Cr": 0,
    "₹1Cr–₹5Cr": 0,
    "₹5Cr+": 0,
  };
  let pending = 0;
  let flagged = 0;
  let pipeline = 0;
  let hotValue = 0;

  const bucketOf = (b: number) =>
    b < 5_000_000 ? "< ₹50L" : b < 10_000_000 ? "₹50L–₹1Cr" : b < 50_000_000 ? "₹1Cr–₹5Cr" : "₹5Cr+";

  for (const lead of leads) {
    pipeline += lead.budget || 0;
    buckets[bucketOf(lead.budget || 0)] += 1;
    if (!lead.analysis) {
      pending += 1;
      by_intent["unanalyzed"] = (by_intent["unanalyzed"] ?? 0) + 1;
      continue;
    }
    by_priority[lead.analysis.priority] = (by_priority[lead.analysis.priority] ?? 0) + 1;
    by_intent[lead.analysis.intent] = (by_intent[lead.analysis.intent] ?? 0) + 1;
    if (lead.analysis.influencer.present) flagged += 1;
    if (lead.analysis.priority === "hot") hotValue += lead.budget || 0;
  }

  return {
    total: leads.length,
    pending,
    flagged,
    pipeline_value: pipeline,
    hot_value: hotValue,
    by_priority,
    by_intent,
    budget_buckets: Object.entries(buckets).map(([bucket, count]) => ({ bucket, count })),
  };
}

export function formatMoney(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatMoneyFull(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const BUDGET_DEFAULT = 1000000;

/** Lenient budget parsing for AI-extracted values: numbers, numeric
 *  strings, "80L", "1.2Cr", "₹80,00,000". Never NaN — falls back to
 *  the default so a vague cold-call budget never blocks storing the lead. */
export function parseBudget(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  const text = String(raw ?? "")
    .toLowerCase()
    .replace(/[₹,\s]/g, "")
    .replace(/rs\.?|inr/g, "");
  const m = text.match(/^([\d.]+)(crores?|cr|lakhs?|lacs?|lac|l|k)?$/);
  if (!m) return BUDGET_DEFAULT;
  const suffix = m[2] ?? "";
  const mult = suffix.startsWith("cr")
    ? 10_000_000
    : suffix.startsWith("lak") || suffix.startsWith("lac") || suffix === "l"
      ? 100_000
      : suffix === "k"
        ? 1_000
        : 1;
  const value = parseFloat(m[1]) * mult;
  return value > 0 ? value : BUDGET_DEFAULT;
}
