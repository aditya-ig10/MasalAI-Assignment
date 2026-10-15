import { NextResponse } from "next/server";
import { buildMockTranscriptAnalysis, saveMockTranscript } from "@/lib/transcriptMock";

const ALLOWED = [".mp3", ".wav", ".m4a", ".ogg", ".webm", ".mp4"];

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "No audio file uploaded. Attach an mp3 or wav file." }, { status: 400 });
  }
  const dot = file.name.lastIndexOf(".");
  const ext = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json(
      { detail: `Unsupported audio type '${ext || "unknown"}'. Upload mp3 or wav (m4a/ogg also accepted).` },
      { status: 400 }
    );
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ detail: "Audio file is too large (max 25 MB)." }, { status: 413 });
  }
  // Standalone mock: no speech-to-text here — return a placeholder transcript
  // so the page flow (upload → analysis → pick action) works without the backend.
  const words = Math.max(1, Math.round(file.size / 4000));
  const record = {
    id: crypto.randomUUID(),
    filename: file.name || "call-audio.mp3",
    created_at: new Date().toISOString(),
    transcript:
      `Mock transcript for ${file.name || "call-audio"} (~${words} words). ` +
      "Connect the Python backend with GROQ_API_KEY for live Whisper transcription and AI suggestions.",
    analysis: buildMockTranscriptAnalysis(file.name || "call-audio.mp3", words),
    analysis_error: null as string | null,
    chosen_action: null as string | null,
    action_note: null as string | null,
    lead_id: null as string | null,
  };
  saveMockTranscript(record);
  return NextResponse.json(record, { status: 201 });
}
