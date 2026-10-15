import { NextResponse } from "next/server";
import { buildMockAnalysis, saveLead, seedLeads } from "@/lib/mock";
import { sortLeads } from "@/lib/sort";
import { validateLeadIn } from "@/lib/validate";

export function GET() {
  return NextResponse.json({ leads: sortLeads(seedLeads()) });
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
