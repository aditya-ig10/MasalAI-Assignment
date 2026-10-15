import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecisionMakerFlag } from "../components/DecisionMakerFlag";
import type { Influencer } from "../lib/types";

const influencer: Influencer = {
  present: true,
  who: "wife",
  evidence_phrase: "My wife wants a garden facing flat.",
  suggested_action: "Ask to include wife in the site visit.",
};

test("shows who, quoted evidence, and call action", () => {
  render(<DecisionMakerFlag influencer={influencer} />);
  expect(screen.getByRole("heading", { name: /hidden decision maker: wife/i })).toBeInTheDocument();
  expect(screen.getByText(/my wife wants a garden/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /confirm before calling/i })).toBeInTheDocument();
});

test("confirm dialog restates who and evidence with proceed and cancel", async () => {
  render(<DecisionMakerFlag influencer={influencer} />);
  await userEvent.click(screen.getByRole("button", { name: /confirm before calling/i }));
  expect(screen.getByRole("dialog")).toHaveTextContent(/wife/);
  expect(screen.getByRole("button", { name: /proceed/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /proceed/i }));
  expect(screen.getByText(/confirmed for the call/i)).toBeInTheDocument();
});

test("absent flag renders nothing", () => {
  const { container } = render(
    <DecisionMakerFlag
      influencer={{ present: false, who: "", evidence_phrase: "", suggested_action: "" }}
    />
  );
  expect(container).toBeEmptyDOMElement();
});
