import { BULK_SAMPLE_TEXT, parseBulkLeads } from "../lib/bulkLeads";

test("empty block yields no rows and no error", () => {
  expect(parseBulkLeads("   ")).toEqual({ parseError: null, rows: [] });
});

test("invalid JSON surfaces a parse error", () => {
  const out = parseBulkLeads('[{"name": }]');
  expect(out.parseError).toMatch(/not valid JSON/i);
  expect(out.rows).toEqual([]);
});

test("sample block parses into two valid rows", () => {
  const out = parseBulkLeads(BULK_SAMPLE_TEXT);
  expect(out.parseError).toBeNull();
  expect(out.rows).toHaveLength(2);
  expect(out.rows[0].value).toMatchObject({ name: "Priya Nair", budget: 12000000 });
  expect(out.rows[1].value).toMatchObject({ name: "Rahul Shah", budget: 8500000 });
  expect(out.rows.every((r) => Object.keys(r.errors).length === 0)).toBe(true);
});

test("numeric and string budgets both validate", () => {
  const out = parseBulkLeads(
    JSON.stringify([
      { name: "A", location: "L", property_requirement: "P", budget: 5000000, buying_timeline: "soon", customer_message: "Hi" },
      { name: "B", location: "L", property_requirement: "P", budget: "7500000", buying_timeline: "soon", customer_message: "Hi" },
    ])
  );
  expect(out.parseError).toBeNull();
  expect(out.rows[0].value?.budget).toBe(5000000);
  expect(out.rows[1].value?.budget).toBe(7500000);
});

test("bad rows are flagged per-row without failing the block", () => {
  const out = parseBulkLeads(
    JSON.stringify([
      { name: "Good", location: "L", property_requirement: "P", budget: 100, buying_timeline: "soon", customer_message: "Hi" },
      { name: "   ", location: "L", property_requirement: "P", budget: -5, buying_timeline: "soon", customer_message: "Hi" },
      "not-an-object",
    ])
  );
  expect(out.parseError).toBeNull();
  expect(out.rows).toHaveLength(3);
  expect(out.rows[0].value).not.toBeNull();
  expect(out.rows[1].value).toBeNull();
  expect(out.rows[1].errors.name).toMatch(/required/i);
  expect(out.rows[1].errors.budget).toMatch(/above zero/i);
  expect(out.rows[2].value).toBeNull();
});

test("single object and {leads:[...]} wrappers are accepted", () => {
  const one = { name: "Solo", location: "L", property_requirement: "P", budget: 100, buying_timeline: "soon", customer_message: "Hi" };
  expect(parseBulkLeads(JSON.stringify(one)).rows).toHaveLength(1);
  expect(parseBulkLeads(JSON.stringify({ leads: [one, one] })).rows).toHaveLength(2);
});

test("empty array and oversized blocks are rejected", () => {
  expect(parseBulkLeads("[]").parseError).toMatch(/no leads/i);
  const many = JSON.stringify(Array.from({ length: 101 }, (_, i) => ({
    name: `N${i}`, location: "L", property_requirement: "P", budget: 100, buying_timeline: "soon", customer_message: "Hi",
  })));
  expect(parseBulkLeads(many).parseError).toMatch(/max 100/i);
});
