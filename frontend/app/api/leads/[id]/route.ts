import { NextResponse } from "next/server";
import { deleteMockLead, findLead, updateMockLead } from "@/lib/mock";
import { validateLeadIn } from "@/lib/validate";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = findLead(id);
  if (!lead) return NextResponse.json({ detail: "lead not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const input = {
    name: String(raw?.name ?? ""),
    location: String(raw?.location ?? ""),
    property_requirement: String(raw?.property_requirement ?? ""),
    budget: String(raw?.budget ?? ""),
    buying_timeline: String(raw?.buying_timeline ?? ""),
    customer_message: String(raw?.customer_message ?? ""),
  };
  const { value } = validateLeadIn(input);
  if (!value) return NextResponse.json({ detail: "Invalid lead." }, { status: 422 });
  const lead = updateMockLead(id, value);
  if (!lead) return NextResponse.json({ detail: "lead not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!deleteMockLead(id)) return NextResponse.json({ detail: "lead not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
