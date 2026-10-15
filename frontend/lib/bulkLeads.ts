import type { LeadIn } from "./types";
import { validateLeadIn, type FieldErrors, type FieldName } from "./validate";

export interface BulkRow {
  index: number;
  value: LeadIn | null;
  errors: FieldErrors;
}

export interface BulkParseResult {
  parseError: string | null;
  rows: BulkRow[];
}

export const BULK_FIELDS: FieldName[] = [
  "name",
  "location",
  "property_requirement",
  "budget",
  "buying_timeline",
  "customer_message",
];

export const BULK_SAMPLE_TEXT = `[
  {
    "name": "Priya Nair",
    "location": "Whitefield, Bengaluru",
    "property_requirement": "3BHK apartment near ITPL",
    "budget": 12000000,
    "buying_timeline": "within 2 months",
    "customer_message": "Loan is approved, wants a weekend visit."
  },
  {
    "name": "Rahul Shah",
    "location": "HSR Layout, Bengaluru",
    "property_requirement": "2BHK for investment",
    "budget": 8500000,
    "buying_timeline": "in 3 months",
    "customer_message": "Looking for rental yield near the tech parks."
  }
]`;

function toRecord(entry: unknown): Record<FieldName, string> {
  const obj = (entry ?? {}) as Record<string, unknown>;
  const out = {} as Record<FieldName, string>;
  for (const field of BULK_FIELDS) {
    const raw = obj[field];
    out[field] = raw === null || raw === undefined ? "" : String(raw);
  }
  return out;
}

/** Parse a structured JSON block into per-row validated leads.
 *  Accepts a bare array, a single lead object, or { "leads": [...] }. */
export function parseBulkLeads(text: string): BulkParseResult {
  if (text.trim() === "") return { parseError: null, rows: [] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { parseError: "This is not valid JSON. Check for missing commas, quotes, or brackets.", rows: [] };
  }
  const entries: unknown[] = Array.isArray(data)
    ? data
    : data !== null && typeof data === "object" && Array.isArray((data as { leads?: unknown }).leads)
      ? ((data as { leads: unknown[] }).leads)
      : [data];
  if (entries.length === 0) {
    return { parseError: "The JSON block has no leads. Add at least one lead object.", rows: [] };
  }
  if (entries.length > 100) {
    return { parseError: "Too many leads in one block (max 100). Split it and import twice.", rows: [] };
  }
  const rows = entries.map((entry, i) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return { index: i + 1, value: null, errors: { name: "Row must be a JSON object." } as FieldErrors };
    }
    const { errors, value } = validateLeadIn(toRecord(entry));
    return { index: i + 1, value, errors };
  });
  return { parseError: null, rows };
}
