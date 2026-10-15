import { NextResponse } from "next/server";
import type { ChatEntry, Lead } from "@/lib/types";

const HISTORY_LIMIT = 20;

function summarize(leads: Lead[]): string {
  if (leads.length === 0) {
    return "I don't have any Firebase leads in context right now, so I can't answer from your pipeline. Once leads sync from Firestore, ask me again.";
  }
  const hot = leads.filter((l) => l.analysis?.priority === "hot");
  const warm = leads.filter((l) => l.analysis?.priority === "warm");
  const cold = leads.filter((l) => l.analysis?.priority === "cold");
  const pending = leads.filter((l) => !l.analysis);
  const names = (rows: Lead[]) => rows.slice(0, 5).map((l) => l.name).join(", ");
  let out =
    `You have ${leads.length} recent lead${leads.length === 1 ? "" : "s"} in context: ` +
    `${hot.length} hot, ${warm.length} warm, ${cold.length} cold` +
    (pending.length > 0 ? `, ${pending.length} awaiting analysis` : "") + ".";
  if (hot.length > 0) out += ` Start with your hot leads: ${names(hot)}.`;
  else if (warm.length > 0) out += ` No hot leads right now — warmest first: ${names(warm)}.`;
  out += " (Mock reply — connect the Python backend for live AI answers.)";
  return out;
}

export async function POST(req: Request) {
  const raw = (await req.json().catch(() => null)) as {
    message?: unknown;
    leads?: unknown;
    history?: unknown;
  } | null;
  const message = typeof raw?.message === "string" ? raw.message.trim() : "";
  if (!message) return NextResponse.json({ detail: "Message must not be blank." }, { status: 422 });
  const leads = Array.isArray(raw?.leads) ? (raw.leads as Lead[]).slice(0, 20) : [];
  const past = Array.isArray(raw?.history) ? (raw.history as ChatEntry[]).slice(-HISTORY_LIMIT) : [];
  const reply = summarize(leads);
  const history: ChatEntry[] = [
    ...past,
    { role: "user" as const, content: message },
    { role: "assistant" as const, content: reply },
  ].slice(-HISTORY_LIMIT);
  return NextResponse.json({ reply, history });
}
