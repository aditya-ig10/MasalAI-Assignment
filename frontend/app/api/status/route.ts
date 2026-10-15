import { NextResponse } from "next/server";

/** Offline mirror of backend GET /status: no live backend, no providers. */
export function GET() {
  return NextResponse.json({
    backend: "mock",
    version: "0.1.0",
    providers: { groq: false, gemini: false, apify: false },
    apify_reachable: false,
  });
}
