import { parseBudget } from "../lib/stats";

test("numeric budgets pass through", () => {
  expect(parseBudget(12000000)).toBe(12000000);
  expect(parseBudget("7500000")).toBe(7500000);
});

test("indian formats parse", () => {
  expect(parseBudget("80L")).toBe(8000000);
  expect(parseBudget("1.2Cr")).toBe(12000000);
  expect(parseBudget("₹80,00,000")).toBe(8000000);
  expect(parseBudget("2 lakh")).toBe(200000);
  expect(parseBudget("500k")).toBe(500000);
});

test("garbage falls back instead of NaN", () => {
  for (const bad of ["tight budget", "", "   ", 0, -5, NaN, null, undefined, "Rs."]) {
    expect(parseBudget(bad)).toBe(1000000);
  }
  expect(Number.isNaN(parseBudget("whatever"))).toBe(false);
});
