import type { DashboardStats } from "./stats";
import type { ChatEntry, Lead, LeadIn, SalesTranscript } from "./types";
import { bustCache } from "./cache";

export class ApiError extends Error {
  status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
  }
}

function prefix(): string {
  const live = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "");
  return live && live.length > 0 ? live : "/api";
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail.length > 0) return body.detail;
  } catch {
    // fall through to status text below
  }
  return `Request failed with status ${res.status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${prefix()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return (await res.json()) as T;
}

export async function listLeads(q?: string): Promise<Lead[]> {
  const query = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  // Backend shape: { leads } — mock /api route mirrors it.
  const body = await request<{ leads: Lead[] }>(`/leads${query}`);
  return body.leads;
}

export async function getStats(): Promise<DashboardStats> {
  return request<DashboardStats>("/leads/stats");
}

export interface BackendStatus {
  backend: string;
  version: string;
  providers: { groq: boolean; gemini: boolean; apify: boolean };
  apify_reachable: boolean;
}

export function backendBase(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "(built-in mock)";
}

export async function pingBackend(): Promise<number> {
  const t0 = performance.now();
  await request<{ status: string }>("/health");
  return Math.round(performance.now() - t0);
}

export async function getBackendStatus(): Promise<BackendStatus> {
  return request<BackendStatus>("/status");
}

export async function getLead(id: string): Promise<Lead> {
  return request<Lead>(`/leads/${id}`);
}

export async function createLead(input: LeadIn): Promise<Lead> {
  const lead = await request<Lead>("/leads", { method: "POST", body: JSON.stringify(input) });
  bustCache("leads");
  bustCache("stats");
  return lead;
}

export async function updateLead(id: string, input: LeadIn): Promise<Lead> {
  const lead = await request<Lead>(`/leads/${id}`, { method: "PUT", body: JSON.stringify(input) });
  bustCache("leads");
  bustCache("stats");
  bustCache(`lead:${id}`);
  return lead;
}

export async function deleteLead(id: string): Promise<void> {
  const res = await fetch(`${prefix()}/leads/${id}`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  bustCache("leads");
  bustCache("stats");
  bustCache(`lead:${id}`);
}

export async function postChat(
  id: string,
  message: string
): Promise<{ reply: string; history: ChatEntry[] }> {
  return request(`/leads/${id}/chat`, { method: "POST", body: JSON.stringify({ message }) });
}

export async function getChatHistory(id: string): Promise<ChatEntry[]> {
  const body = await request<{ reply: string; history: ChatEntry[] }>(`/leads/${id}/chat`);
  return body.history;
}

export async function postLeadsChat(
  message: string,
  leads: Lead[],
  history: ChatEntry[]
): Promise<{ reply: string; history: ChatEntry[] }> {
  // Hard cap: the chat context is the 20 most recent leads, never more.
  return request(`/chat`, {
    method: "POST",
    body: JSON.stringify({ message, leads: leads.slice(0, 20), history: history.slice(-20) }),
  });
}

export async function uploadTranscript(file: File): Promise<SalesTranscript> {
  const base = prefix();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${base}/transcripts/upload`, { method: "POST", body: form });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  const done = (await res.json()) as SalesTranscript;
  bustCache("transcripts");
  return done;
}

export async function listTranscripts(): Promise<SalesTranscript[]> {
  const body = await request<{ transcripts: SalesTranscript[] }>("/transcripts");
  return body.transcripts;
}

export async function getTranscript(id: string): Promise<SalesTranscript> {
  return request<SalesTranscript>(`/transcripts/${id}`);
}

export async function applyTranscriptAction(id: string, actionId: string): Promise<SalesTranscript> {
  const updated = await request<SalesTranscript>(`/transcripts/${id}/actions`, {
    method: "POST",
    body: JSON.stringify({ action_id: actionId }),
  });
  bustCache("transcripts");
  // Choosing "create lead" adds to the pipeline, so refresh those too.
  bustCache("leads");
  bustCache("stats");
  return updated;
}
