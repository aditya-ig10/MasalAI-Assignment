import { NextResponse } from "next/server";
import { buildMockAnalysis, saveLead } from "@/lib/mock";
import { parseBudget } from "@/lib/stats";
import { getMockTranscript, saveMockTranscript } from "@/lib/transcriptMock";
import type { LeadIn } from "@/lib/types";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getMockTranscript(id);
  if (!t) return NextResponse.json({ detail: "transcript not found" }, { status: 404 });
  if (!t.analysis) return NextResponse.json({ detail: "transcript has no AI analysis yet" }, { status: 422 });
  const raw = (await req.json().catch(() => null)) as { action_id?: unknown } | null;
  const actionId = typeof raw?.action_id === "string" ? raw.action_id.trim() : "";
  const chosen = t.analysis.suggestions.find((s) => s.id === actionId || s.kind === actionId);
  if (!chosen) {
    return NextResponse.json({ detail: `unknown action '${actionId}'` }, { status: 422 });
  }
  t.chosen_action = chosen.id;
  t.action_note = chosen.description;
  if (chosen.kind === "create_lead" && !t.lead_id) {
    const s = t.analysis.suggested_lead as Record<string, string | number>;
    const input: LeadIn = {
      name: String(s.name || "Call Lead").trim() || "Call Lead",
      location: String(s.location || "Unknown").trim() || "Unknown",
      property_requirement: String(s.property_requirement || "Follow up on sales call").trim() || "Follow up on sales call",
      budget: parseBudget(s.budget),
      buying_timeline: String(s.buying_timeline || "flexible").trim() || "flexible",
      customer_message: String(s.customer_message || t.transcript.slice(0, 2000)).trim() || t.transcript.slice(0, 2000),
    };
    const lead = {
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      analysis: buildMockAnalysis(input),
      analysis_error: null,
      origin: "call",
    };
    saveLead(lead);
    t.lead_id = lead.id;
  }
  saveMockTranscript(t);
  return NextResponse.json(t);
}
