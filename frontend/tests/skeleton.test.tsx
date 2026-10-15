import { render, screen } from "@testing-library/react";
import { LeadListSkeleton } from "../components/LeadListSkeleton";

test("skeleton announces loading and renders the requested rows", () => {
  const { container } = render(<LeadListSkeleton count={3} />);
  expect(screen.getByRole("status", { name: "Loading leads" })).toBeInTheDocument();
  expect(container.querySelectorAll(".lead-card").length).toBe(3);
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});

test("skeleton defaults to five rows", () => {
  const { container } = render(<LeadListSkeleton />);
  expect(container.querySelectorAll(".lead-card").length).toBe(5);
});
