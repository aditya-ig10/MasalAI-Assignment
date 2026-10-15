import { buildMockAnalysis, seedLeads } from "../lib/mock";

test("urgent timeline yields hot with reason", () => {
  const a = buildMockAnalysis({
    name: "N",
    location: "L",
    property_requirement: "P",
    budget: 5000000,
    buying_timeline: "ASAP",
    customer_message: "Need it now.",
  });
  expect(a.priority).toBe("hot");
  expect(a.priority_reason).toMatch(/ASAP/i);
});

test("family mention raises the flag with a quoted sentence", () => {
  const a = buildMockAnalysis({
    name: "N",
    location: "L",
    property_requirement: "P",
    budget: 5000000,
    buying_timeline: "flexible",
    customer_message: "My wife wants a garden. I like the floor plan.",
  });
  expect(a.influencer.present).toBe(true);
  expect(a.influencer.who).toBe("wife");
  expect(a.influencer.evidence_phrase).toMatch(/wife/i);
});

test("seeds cover hot warm cold and a null analysis", () => {
  const seeds = seedLeads();
  const priorities = seeds.map((s) => (s.analysis ? s.analysis.priority : "pending"));
  expect(priorities).toContain("hot");
  expect(priorities).toContain("warm");
  expect(priorities).toContain("cold");
  expect(priorities).toContain("pending");
});
