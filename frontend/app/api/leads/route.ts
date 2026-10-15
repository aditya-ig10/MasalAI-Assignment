import { NextResponse } from "next/server";
import { buildMockAnalysis, listMockLeads, saveLead } from "@/lib/mock";
import { sortLeads } from "@/lib/sort";
import { validateLeadIn } from "@/lib/validate";

function matches(query: string, hay: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = hay.toLowerCase();
  return tokens.every((t) => text.includes(t));
}

export function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  // Live backend proxy: when the full stack runs, prefer real data.
  // The client calls this route only when NEXT_PUBLIC_BACKEND_URL is unset.
  let leads = sortLeads(listMockLeads());
  if (q) {
    leads = leads.filter((l) =>
      matches(
        q,
        [l.name, l.location, l.property_requirement, l.buying_timeline, l.customer_message, l.analysis?.intent ?? "", l.analysis?.priority ?? ""].join(" ")
      )
    );
  }
  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const input = {
    name: String(raw?.name ?? ""),
    location: String(raw?.location ?? ""),
    property_requirement: String(raw?.property_requirement ?? ""),
    budget: String(raw?.budget ?? ""),
    buying_timeline: String(raw?.buying_timeline ?? ""),
    customer_message: String(raw?.customer_message ?? ""),
  };
  const { errors, value } = validateLeadIn(input);
  if (!value) {
    const first = Object.values(errors)[0] ?? "Invalid lead.";
    return NextResponse.json({ detail: first }, { status: 422 });
  }
  const lead = {
    ...value,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    analysis: buildMockAnalysis(value),
    analysis_error: null,
  };
  saveLead(lead);
  return NextResponse.json(lead, { status: 201 });
}
