import { NextResponse } from "next/server";
import { listMockTranscripts } from "@/lib/transcriptMock";

export function GET() {
  return NextResponse.json({ transcripts: listMockTranscripts() });
}
