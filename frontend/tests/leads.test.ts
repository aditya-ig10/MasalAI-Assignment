import { vi } from "vitest";
import { fetchMergedLeads, formatLeadDate, isNewLead, newestLeads } from "../lib/leads";
import { fetchStoredLeads } from "../lib/firestoreLeads";
import type { Lead } from "../lib/types";

vi.mock("../lib/firestoreLeads", () => ({
  fetchStoredLeads: vi.fn(),
}));

function lead(id: string, created_at: string): Lead {
  return {
    id,
    created_at,
    name: `Name ${id}`,
    location: "Whitefield",
    property_requirement: "3BHK",
    budget: 1000000,
    buying_timeline: "soon",
    customer_message: "Hi",
    analysis: null,
    analysis_error: null,
  };
}

test("newestLeads returns newest first, capped at 5", () => {
  const rows = ["a", "b", "c", "d", "e", "f", "g"].map((id, i) =>
    lead(id, `2026-10-${String(10 + i).padStart(2, "0")}T09:00:00Z`)
  );
  const out = newestLeads(rows);
  expect(out).toHaveLength(5);
  expect(out.map((l) => l.id)).toEqual(["g", "f", "e", "d", "c"]);
});

test("newestLeads respects a custom limit", () => {
  const rows = [lead("a", "2026-10-10T09:00:00Z"), lead("b", "2026-10-11T09:00:00Z")];
  expect(newestLeads(rows, 1).map((l) => l.id)).toEqual(["b"]);
  expect(newestLeads([], 5)).toEqual([]);
});

test("fetchMergedLeads prefers backend rows and backfills from Firestore", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ leads: [lead("a", "2026-10-12T09:00:00Z")] }), { status: 200 })) as typeof fetch;
  vi.mocked(fetchStoredLeads).mockResolvedValue([
    lead("a", "2026-10-10T09:00:00Z"), // stale duplicate — backend wins
    lead("b", "2026-10-11T09:00:00Z"), // backend forgot this one — restored
  ]);
  const out = await fetchMergedLeads();
  expect(out.map((l) => l.id)).toEqual(["a", "b"]);
  expect(out[0].created_at).toBe("2026-10-12T09:00:00Z");
});

test("fetchMergedLeads survives both sources failing", async () => {
  globalThis.fetch = (async () => new Response("nope", { status: 500 })) as typeof fetch;
  vi.mocked(fetchStoredLeads).mockRejectedValue(new Error("offline"));
  await expect(fetchMergedLeads()).resolves.toEqual([]);
});

test("formatLeadDate labels today, yesterday, and older dates with time", () => {
  const now = new Date(2026, 9, 15, 18, 30); // 15 Oct 2026, local
  expect(formatLeadDate("2026-10-15T09:05:00", now)).toBe("Today, 9:05 AM");
  expect(formatLeadDate("2026-10-14T15:45:00", now)).toBe("Yesterday, 3:45 PM");
  expect(formatLeadDate("2026-10-01T00:03:00", now)).toBe("1 Oct 2026, 12:03 AM");
  expect(formatLeadDate("not-a-date", now)).toBe("Unknown date");
});

test("isNewLead flags recent leads and rejects old, future, or invalid ones", () => {
  const now = new Date(2026, 9, 15, 12, 0).getTime();
  expect(isNewLead(new Date(now - 60_000).toISOString(), now)).toBe(true);
  expect(isNewLead(new Date(now - 49 * 3_600_000).toISOString(), now)).toBe(false);
  expect(isNewLead(new Date(now + 60_000).toISOString(), now)).toBe(false);
  expect(isNewLead("garbage", now)).toBe(false);
  expect(isNewLead(new Date(now - 60_000).toISOString(), now, 30_000)).toBe(false);
});
