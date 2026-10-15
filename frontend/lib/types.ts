export type Priority = "hot" | "warm" | "cold";

export type Intent = "buy" | "sell" | "rent" | "invest" | "just_browsing" | "unclear";

export interface LeadIn {
  name: string;
  location: string;
  property_requirement: string;
  budget: number;
  buying_timeline: string;
  customer_message: string;
}

export interface Influencer {
  present: boolean;
  who: string;
  evidence_phrase: string;
  suggested_action: string;
}

export interface Analysis {
  summary: string;
  intent: Intent;
  requirements: string[];
  objections: string[];
  next_action: string;
  suggested_response: string;
  priority: Priority;
  priority_reason: string;
  influencer: Influencer;
}

export interface Lead extends LeadIn {
  id: string;
  created_at: string;
  analysis: Analysis | null;
  analysis_error: string | null;
  origin?: string;
}

export interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

export type TranscriptActionKind =
  | "create_lead"
  | "schedule_visit"
  | "send_followup"
  | "mark_cold"
  | "needs_review";

export interface TranscriptSuggestion {
  id: string;
  label: string;
  description: string;
  kind: TranscriptActionKind;
}

export interface TranscriptAnalysis {
  summary: string;
  intent: Intent;
  priority: Priority;
  priority_reason: string;
  requirements: string[];
  objections: string[];
  next_action: string;
  suggested_response: string;
  suggested_lead: Record<string, string | number>;
  suggestions: TranscriptSuggestion[];
}

export interface SalesTranscript {
  id: string;
  filename: string;
  created_at: string;
  transcript: string;
  analysis: TranscriptAnalysis | null;
  analysis_error: string | null;
  chosen_action: string | null;
  action_note: string | null;
  lead_id: string | null;
}
