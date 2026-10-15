import { NextResponse } from "next/server";
import { seedLeads } from "@/lib/mock";
import { computeStats } from "@/lib/stats";

export function GET() {
  return NextResponse.json(computeStats(seedLeads()));
}
