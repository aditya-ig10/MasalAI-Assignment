import { listLeads } from "../lib/api";

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
