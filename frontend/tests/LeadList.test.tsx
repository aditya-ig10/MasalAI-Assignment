import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeadList } from "../components/LeadList";
import type { Lead } from "../lib/types";

function lead(id: string, priority: "hot" | "warm" | "cold" | null, flag: boolean): Lead {
  return {
    id,
    created_at: `2026-10-15T0${id.slice(-1)}:00:00Z`,
    name: `Name ${id}`,
    location: "L",
    property_requirement: "P",
    budget: 1,
    buying_timeline: "soon",
    customer_message: "m",
    analysis:
      priority === null
        ? null
        : {
            summary: "s",
            intent: "buy",
            requirements: [],
            objections: [],
            next_action: "n",
            suggested_response: "r",
            priority,
            priority_reason: priority === "hot" ? "Loan approved." : "Steady.",
            influencer: {
              present: flag,
              who: flag ? "wife" : "",
              evidence_phrase: flag ? "Wife quote." : "",
              suggested_action: flag ? "Include wife." : "",
            },
          },
    analysis_error: priority === null ? "Both AI providers failed." : null,
  };
}

const mixed = [lead("cold-1", "cold", false), lead("warm-1", "warm", true), lead("pend-1", null, false), lead("hot-1", "hot", false)];

test("highest priority surfaces first with reason line visible", () => {
  render(<LeadList leads={mixed} />);
  const rows = screen.getAllByRole("link");
  expect(within(rows[0]).getByText(/loan approved/i)).toBeInTheDocument();
});

test("filter chips narrow the list", async () => {
  render(<LeadList leads={mixed} />);
  await userEvent.click(screen.getByRole("button", { name: /^hot$/i }));
  expect(screen.getAllByRole("link")).toHaveLength(1);
});

test("flagged filter shows only leads with the flag", async () => {
  render(<LeadList leads={mixed} />);
  await userEvent.click(screen.getByRole("button", { name: /flagged/i }));
  expect(screen.getAllByRole("link")).toHaveLength(1);
});

test("empty list invites creating the first lead", () => {
  render(<LeadList leads={[]} />);
  expect(screen.getByRole("link", { name: /first lead/i })).toBeInTheDocument();
});

test("null analysis row renders pending and sorts last", () => {
  render(<LeadList leads={mixed} />);
  const rows = screen.getAllByRole("link");
  expect(within(rows[rows.length - 1]).getByText(/analysis pending/i)).toBeInTheDocument();
});
