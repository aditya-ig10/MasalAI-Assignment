import type { Analysis, ChatEntry, Influencer, Lead, LeadIn, Priority } from "./types";

const BLANK_FLAG: Influencer = { present: false, who: "", evidence_phrase: "", suggested_action: "" };

const seeds: Lead[] = [
  {
    id: "a3f19c2e7b4a4d9c8e6f0a1b2c3d4e501",
    created_at: "2026-10-15T09:00:00Z",
    name: "Priya Nair",
    location: "Whitefield, Bengaluru",
    property_requirement: "3BHK apartment near ITPL",
    budget: 12000000,
    buying_timeline: "within 2 months",
    customer_message:
      "Hi, I loved the 3BHK listing in Whitefield. My loan is approved and I want to visit this weekend with my wife. She wants a garden facing flat. Is the price negotiable?",
    analysis: {
      summary: "Buyer with an approved loan wants a Whitefield 3BHK and a weekend visit with her wife.",
      intent: "buy",
      requirements: ["3BHK near ITPL", "Whitefield, Bengaluru", "weekend site visit"],
      objections: ["price negotiability"],
      next_action: "Confirm a site visit slot for Saturday morning and invite the wife.",
      suggested_response: "Thanks! Saturday 11 AM works for the visit. Shall I confirm for both of you?",
      priority: "hot",
      priority_reason: "Loan approved and wants to visit this weekend.",
      influencer: {
        present: true,
        who: "wife",
        evidence_phrase: "She wants a garden facing flat.",
        suggested_action: "Ask to include wife in the site visit.",
      },
    },
    analysis_error: null,
  },
  {
    id: "a3f19c2e7b4a4d9c8e6f0a1b2c3d4e502",
    created_at: "2026-10-15T10:00:00Z",
    name: "Rahul Shah",
    location: "HSR Layout, Bengaluru",
    property_requirement: "2BHK for investment",
    budget: 8500000,
    buying_timeline: "in 3 months",
    customer_message:
      "Looking for a 2BHK in HSR Layout purely as an investment. Flexible on the move in date, want good rental yield.",
    analysis: {
      summary: "Investor wants a 2BHK in HSR Layout with strong rental yield within 3 months.",
      intent: "invest",
      requirements: ["2BHK", "HSR Layout", "high rental yield"],
      objections: [],
      next_action: "Share rental yield comps for HSR Layout 2BHKs.",
      suggested_response: "HSR 2BHKs rent well near the tech parks. I will send yield comps today.",
      priority: "warm",
      priority_reason: "Investment inquiry with a 3 month horizon.",
      influencer: { ...BLANK_FLAG },
    },
    analysis_error: null,
  },
  {
    id: "a3f19c2e7b4a4d9c8e6f0a1b2c3d4e503",
    created_at: "2026-10-15T11:00:00Z",
    name: "Asha Verma",
    location: "Electronic City, Bengaluru",
    property_requirement: "1BHK on rent",
    budget: 15000,
    buying_timeline: "flexible",
    customer_message: "Just browsing 1BHK options near Electronic City. Budget is tight right now.",
    analysis: {
      summary: "Browser checking 1BHK rentals near Electronic City with a tight budget.",
      intent: "just_browsing",
      requirements: ["1BHK", "Electronic City"],
      objections: ["tight budget"],
      next_action: "Send one budget option and check back in two weeks.",
      suggested_response: "I have one 1BHK that fits. Want the details?",
      priority: "cold",
      priority_reason: "Browsing with no timeline and tight budget.",
      influencer: { ...BLANK_FLAG },
    },
    analysis_error: null,
  },
  {
    id: "a3f19c2e7b4a4d9c8e6f0a1b2c3d4e504",
    created_at: "2026-10-15T11:30:00Z",
    name: "Neha Kulkarni",
    location: "Sarjapur, Bengaluru",
    property_requirement: "3BHK near ORR",
    budget: 14000000,
    buying_timeline: "within a month",
    customer_message:
      "We need a 3BHK in Sarjapur within a month. Worried about traffic on ORR during peak hours.",
    analysis: {
      summary: "Buyer needs a Sarjapur 3BHK within a month, concerned about ORR traffic.",
      intent: "buy",
      requirements: ["3BHK", "Sarjapur", "ORR access"],
      objections: ["ORR peak hour traffic"],
      next_action: "Suggest a weekday evening visit so they face the traffic firsthand.",
      suggested_response: "ORR traffic is real at peak hours. Visit at 6 PM and judge it yourself?",
      priority: "warm",
      priority_reason: "One month timeline with a location concern to resolve.",
      influencer: { ...BLANK_FLAG },
    },
    analysis_error: null,
  },
  {
    id: "a3f19c2e7b4a4d9c8e6f0a1b2c3d4e505",
    created_at: "2026-10-15T12:00:00Z",
    name: "Demo Buyer",
    location: "Hebbal, Bengaluru",
    property_requirement: "2BHK near the flyover",
    budget: 9000000,
    buying_timeline: "soon",
    customer_message: "Saw the Hebbal listing. Call me.",
    analysis: null,
    analysis_error: "Both AI providers failed during seeding.",
  },
];

const created: Lead[] = [];
const chats = new Map<string, ChatEntry[]>();

export function seedLeads(): Lead[] {
  return JSON.parse(JSON.stringify(seeds)) as Lead[];
}

export function findLead(id: string): Lead | undefined {
  return [...created, ...seedLeads()].find((l) => l.id === id);
}

export function saveLead(lead: Lead): void {
  created.push(lead);
}

function firstSentenceWith(text: string, re: RegExp): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.find((s) => re.test(s)) ?? null;
}

export function buildMockAnalysis(input: LeadIn): Analysis {
  const timeline = input.buying_timeline.toLowerCase();
  const message = input.customer_message;
  const lower = message.toLowerCase();

  let priority: Priority = "warm";
  let priority_reason = "Steady inquiry with clear requirements.";
  if (/(asap|urgent|weekend|this week)/.test(timeline)) {
    priority = "hot";
    priority_reason = `Urgent timeline (${input.buying_timeline}).`;
  } else if (/(explor|brows|just looking|flexible|tight)/.test(`${timeline} ${lower}`)) {
    priority = "cold";
    priority_reason = "Browsing with no firm timeline.";
  } else if (input.budget >= 10000000) {
    priority = "hot";
    priority_reason = "High budget with a defined timeline.";
  }

  let intent: Analysis["intent"] = "buy";
  if (/\brent\b|\blease\b/.test(lower)) intent = "rent";
  else if (/\bsell\b/.test(lower)) intent = "sell";
  else if (/\binvest/.test(lower)) intent = "invest";
  else if (/brows|just looking/.test(lower)) intent = "just_browsing";

  const requirements = [input.property_requirement, input.location];
  const objections: string[] = [];
  const concern = firstSentenceWith(message, /negotia|price|cost|budget|traffic|water|supply/i);
  if (concern) objections.push(concern.trim());

  let influencer: Influencer = { ...BLANK_FLAG };
  const whoMatch = lower.match(/wife|husband|father|mother|spouse|partner|family/);
  if (whoMatch) {
    const who = whoMatch[0];
    const evidence = firstSentenceWith(message, new RegExp(who, "i"));
    influencer = {
      present: true,
      who,
      evidence_phrase: (evidence ?? `${who} was mentioned.`).trim(),
      suggested_action: `Ask to include ${who} in the site visit.`,
    };
  }

  return {
    summary: `${input.name} wants ${input.property_requirement} in ${input.location} (${input.buying_timeline}).`,
    intent,
    requirements,
    objections,
    next_action:
      priority === "hot"
        ? "Confirm a site visit slot at the earliest."
        : "Share two matching listings and ask for a visit window.",
    suggested_response:
      priority === "hot"
        ? "Thanks! I can book a visit this week. Which day suits you?"
        : "Thanks! I found two options that fit. When works for a visit?",
    priority,
    priority_reason,
    influencer,
  };
}

export function getChatHistory(id: string): ChatEntry[] {
  return chats.get(id) ?? [];
}

export function appendChatHistory(id: string, entries: ChatEntry[]): ChatEntry[] {
  const next = [...getChatHistory(id), ...entries].slice(-20);
  chats.set(id, next);
  return next;
}

export function makeMockReply(lead: Lead, message: string): string {
  const context = lead.analysis
    ? `Context: ${lead.analysis.summary} Next step: ${lead.analysis.next_action}`
    : "Analysis pending.";
  return `Noted on ${lead.name}: "${message}". ${context}`;
}
