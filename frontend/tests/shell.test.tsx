import { render, screen } from "@testing-library/react";
import { Shell } from "../components/Shell";

test("shell shows wordmark and nav", () => {
  render(
    <Shell>
      <p>hi</p>
    </Shell>
  );
  expect(screen.getByText("MasalAI")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Leads" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "New lead" })).toHaveAttribute("href", "/new");
});
