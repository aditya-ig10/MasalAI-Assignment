import { NextResponse } from "next/server";
import { getMockTranscript } from "@/lib/transcriptMock";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getMockTranscript(id);
  if (!t) return NextResponse.json({ detail: "transcript not found" }, { status: 404 });
  return NextResponse.json(t);
}
