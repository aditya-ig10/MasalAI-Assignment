import { applyTranscriptAction, listLeads, listTranscripts, postLeadsChat, uploadTranscript } from "../lib/api";

test("listLeads returns leads array", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ leads: [] }), { status: 200 })) as typeof fetch;
  expect(await listLeads()).toEqual([]);
});

test("detail envelope surfaces on 404", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ detail: "lead not found" }), { status: 404 })) as typeof fetch;
  await expect(listLeads()).rejects.toMatchObject({ status: 404, message: "lead not found" });
});

test("listTranscripts unwraps the transcripts envelope", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ transcripts: [{ id: "t1" }] }), { status: 200 })) as typeof fetch;
  expect(await listTranscripts()).toEqual([{ id: "t1" }]);
});

test("uploadTranscript posts FormData without a JSON content-type", async () => {
  let seen: RequestInit | undefined;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    seen = init;
    return new Response(JSON.stringify({ id: "t1" }), { status: 201 });
  }) as typeof fetch;
  const file = new File(["audio"], "call.mp3", { type: "audio/mpeg" });
  expect(await uploadTranscript(file)).toEqual({ id: "t1" });
  expect(seen?.body).toBeInstanceOf(FormData);
  expect(seen?.method).toBe("POST");
});

test("applyTranscriptAction posts the chosen action id", async () => {
  let seenBody = "";
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    seenBody = String(init?.body);
    return new Response(JSON.stringify({ id: "t1", chosen_action: "create-lead" }), { status: 200 });
  }) as typeof fetch;
  const out = await applyTranscriptAction("t1", "create-lead");
  expect(JSON.parse(seenBody)).toEqual({ action_id: "create-lead" });
  expect(out.chosen_action).toBe("create-lead");
});

test("postLeadsChat caps leads and history at 20", async () => {
  let seenUrl = "";
  let seenBody: Record<string, unknown> = {};
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    seenUrl = String(url);
    seenBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ reply: "ok", history: [] }), { status: 200 });
  }) as typeof fetch;
  const leads = Array.from({ length: 25 }, (_, i) => ({ id: `l${i}` }));
  const history = Array.from({ length: 25 }, (_, i) => ({ role: "user" as const, content: `q${i}` }));
  await postLeadsChat("hi", leads as never[], history);
  expect(seenUrl).toMatch(/\/chat$/);
  expect((seenBody.leads as unknown[])).toHaveLength(20);
  expect((seenBody.history as unknown[])).toHaveLength(20);
  expect(seenBody.message).toBe("hi");
});
