import { validateLeadIn } from "../lib/validate";

const good = {
  name: "Priya Nair",
  location: "Whitefield, Bengaluru",
  property_requirement: "3BHK near ITPL",
  budget: "12000000",
  buying_timeline: "within 2 months",
  customer_message: "Loan approved, visit Saturday?",
};

test("accepts good input with numeric budget", () => {
  const { errors, value } = validateLeadIn(good);
  expect(errors).toEqual({});
  expect(value?.budget).toBe(12000000);
});

test("rejects whitespace-only strings", () => {
  const { errors, value } = validateLeadIn({ ...good, name: "   " });
  expect(errors.name).toMatch(/required/i);
  expect(value).toBeNull();
});

test("rejects budget edge values", () => {
  for (const budget of ["0", "-5", "12abc", "Infinity", ""]) {
    const { errors, value } = validateLeadIn({ ...good, budget });
    expect(errors.budget).toBeDefined();
    expect(value).toBeNull();
  }
});
