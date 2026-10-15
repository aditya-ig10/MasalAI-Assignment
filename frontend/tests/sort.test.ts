import { sortLeads } from "../lib/sort";
import type { Lead } from "../lib/types";

function lead(id: string, priority: "hot" | "warm" | "cold" | null, created: string): Lead {
  return {
    id,
    created_at: created,
    name: id,
    location: "L",
    property_requirement: "P",
    budget: 1,
    buying_timeline: "soon",
    customer_message: "m",
    analysis:
      priority === null
        ? null
        : {
            summary: "s",
            intent: "buy",
            requirements: [],
            objections: [],
            next_action: "n",
            suggested_response: "r",
            priority,
            priority_reason: "why",
            influencer: { present: false, who: "", evidence_phrase: "", suggested_action: "" },
          },
    analysis_error: priority === null ? "Both AI providers failed." : null,
  };
}

test("sorts hot warm cold then nulls, ties oldest first", () => {
  const input = [
    lead("null-1", null, "2026-10-15T10:00:00Z"),
    lead("cold-1", "cold", "2026-10-15T09:00:00Z"),
    lead("warm-2", "warm", "2026-10-15T11:00:00Z"),
    lead("hot-1", "hot", "2026-10-15T12:00:00Z"),
    lead("warm-1", "warm", "2026-10-15T08:00:00Z"),
  ];
  expect(sortLeads(input).map((l) => l.id)).toEqual(["hot-1", "warm-1", "warm-2", "cold-1", "null-1"]);
});
