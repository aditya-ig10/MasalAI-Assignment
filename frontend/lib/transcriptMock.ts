import type { SalesTranscript, TranscriptAnalysis } from "./types";

const store = new Map<string, SalesTranscript>();

export function listMockTranscripts(): SalesTranscript[] {
  return [...store.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function getMockTranscript(id: string): SalesTranscript | undefined {
  return store.get(id);
}

export function saveMockTranscript(t: SalesTranscript): void {
  store.set(t.id, t);
}

export function buildMockTranscriptAnalysis(filename: string, wordCount: number): TranscriptAnalysis {
  return {
    summary: `Sales call (${filename}) captured ${wordCount} words of conversation. Mock triage suggests a warm follow-up.`,
    intent: "buy",
    priority: "warm",
    priority_reason: "Mock analysis — connect the Python backend for live AI triage.",
    requirements: [],
    objections: [],
    next_action: "Share two matching listings and ask for a visit window.",
    suggested_response: "Thanks for speaking today! I will send over matching options shortly.",
    suggested_lead: {
      name: "Call Lead",
      location: "Unknown",
      property_requirement: "Follow up on sales call",
      budget: 1000000,
      buying_timeline: "flexible",
      customer_message: `Imported from ${filename}.`,
    },
    suggestions: [
      { id: "create-lead", label: "Create lead", description: "Save the extracted details as a new pipeline lead.", kind: "create_lead" },
      { id: "schedule-visit", label: "Schedule a visit", description: "Confirm a site visit slot at the earliest.", kind: "schedule_visit" },
      { id: "send-followup", label: "Send follow-up", description: "Copy the suggested response and message the customer.", kind: "send_followup" },
    ],
  };
}
