import type { ChatEntry, Lead, LeadIn } from "./types";

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

export async function listLeads(): Promise<Lead[]> {
  const body = await request<{ leads: Lead[] }>("/leads");
  return body.leads;
}

export async function getLead(id: string): Promise<Lead> {
  return request<Lead>(`/leads/${id}`);
}

export async function createLead(input: LeadIn): Promise<Lead> {
  return request<Lead>("/leads", { method: "POST", body: JSON.stringify(input) });
}

export async function postChat(
  id: string,
  message: string
): Promise<{ reply: string; history: ChatEntry[] }> {
  return request(`/leads/${id}/chat`, { method: "POST", body: JSON.stringify({ message }) });
}
