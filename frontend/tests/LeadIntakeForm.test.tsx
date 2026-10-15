import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LeadIntakeForm } from "../components/LeadIntakeForm";

async function fill(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    Name: "Priya Nair",
    Location: "Whitefield",
    "Property requirement": "3BHK",
    Budget: "12000000",
    "Buying timeline": "within 2 months",
    "Customer message": "Loan approved.",
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    await userEvent.clear(screen.getByLabelText(label));
    if (value !== "") await userEvent.type(screen.getByLabelText(label), value);
  }
}

test("blank submit shows required errors and never submits", async () => {
  const onValidSubmit = vi.fn();
  render(<LeadIntakeForm onValidSubmit={onValidSubmit} />);
  await userEvent.click(screen.getByRole("button", { name: /save lead/i }));
  expect(await screen.findAllByText(/required/i)).not.toHaveLength(0);
  expect(onValidSubmit).not.toHaveBeenCalled();
});

test("whitespace-only name fails like empty", async () => {
  const onValidSubmit = vi.fn();
  render(<LeadIntakeForm onValidSubmit={onValidSubmit} />);
  await fill({ Name: "   " });
  await userEvent.click(screen.getByRole("button", { name: /save lead/i }));
  expect(await screen.findAllByText(/required/i)).toHaveLength(1);
  expect(onValidSubmit).not.toHaveBeenCalled();
});

test("zero budget shows field error and never submits", async () => {
  const onValidSubmit = vi.fn();
  render(<LeadIntakeForm onValidSubmit={onValidSubmit} />);
  await fill({ Budget: "0" });
  await userEvent.click(screen.getByRole("button", { name: /save lead/i }));
  expect(await screen.findByText(/above zero/i)).toBeInTheDocument();
  expect(onValidSubmit).not.toHaveBeenCalled();
});

test("valid submit passes a LeadIn with numeric budget", async () => {
  const onValidSubmit = vi.fn();
  render(<LeadIntakeForm onValidSubmit={onValidSubmit} />);
  await fill();
  await userEvent.click(screen.getByRole("button", { name: /save lead/i }));
  expect(onValidSubmit).toHaveBeenCalledWith(expect.objectContaining({ budget: 12000000 }));
});
