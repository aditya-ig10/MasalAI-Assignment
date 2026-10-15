import { render, screen } from "@testing-library/react";
import { Shell } from "../components/Shell";

test("shell shows wordmark and nav", () => {
  render(
    <Shell>
      <p>hi</p>
    </Shell>
  );
  expect(screen.getByText("LeadAnalyzer")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Leads" })).toHaveAttribute("href", "/leads");
  expect(screen.getByRole("link", { name: "New lead" })).toHaveAttribute("href", "/new");
  expect(screen.queryByRole("link", { name: "Analytics" })).not.toBeInTheDocument();
});
