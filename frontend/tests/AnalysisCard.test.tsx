import { render, screen } from "@testing-library/react";
import { AnalysisCard } from "../components/AnalysisCard";
import type { Analysis } from "../lib/types";

const analysis: Analysis = {
  summary: "Buyer with approved loan.",
  intent: "buy",
  requirements: ["3BHK", "Whitefield"],
  objections: ["price negotiability"],
  next_action: "Confirm Saturday visit.",
  suggested_response: "Saturday 11 AM works?",
  priority: "hot",
  priority_reason: "Loan approved.",
  influencer: { present: false, who: "", evidence_phrase: "", suggested_action: "" },
};

test("renders six blocks with visible headings", () => {
  render(<AnalysisCard analysis={analysis} analysisError={null} />);
  for (const heading of [
    "Summary",
    "Intent",
    "Requirements",
    "Objections",
    "Next action",
    "Suggested response",
  ]) {
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  }
});

test("null analysis renders pending, never an error card", () => {
  render(<AnalysisCard analysis={null} analysisError="Both AI providers failed." />);
  expect(screen.getByText(/analysis pending/i)).toBeInTheDocument();
  expect(screen.getByText(/both ai providers failed/i)).toBeInTheDocument();
});

test("markup in message-derived text renders inert", () => {
  render(
    <AnalysisCard
      analysis={{ ...analysis, summary: "<script>alert(1)</script>" }}
      analysisError={null}
    />
  );
  expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
  expect(document.querySelector("script")).toBeNull();
});

test("unknown intent value falls back to Unclear", () => {
  render(
    <AnalysisCard analysis={{ ...analysis, intent: "mystery" as never }} analysisError={null} />
  );
  expect(screen.getByText(/unclear/i)).toBeInTheDocument();
});
