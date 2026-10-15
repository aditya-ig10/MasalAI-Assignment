import { NextResponse } from "next/server";
import { appendChatHistory, findLead, getChatHistory, makeMockReply } from "@/lib/mock";
import type { ChatEntry } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = findLead(id);
  if (!lead) return NextResponse.json({ detail: "lead not found" }, { status: 404 });
  return NextResponse.json({ reply: "", history: getChatHistory(lead.id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = findLead(id);
  if (!lead) return NextResponse.json({ detail: "lead not found" }, { status: 404 });
  const raw = (await req.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof raw?.message === "string" ? raw.message.trim() : "";
  if (message === "") return NextResponse.json({ detail: "Message is required." }, { status: 422 });
  const reply = makeMockReply(lead, message);
  const outgoing: ChatEntry[] = [
    { role: "user", content: message },
    { role: "assistant", content: reply },
  ];
  const history = appendChatHistory(lead.id, outgoing);
  return NextResponse.json({ reply, history });
}
