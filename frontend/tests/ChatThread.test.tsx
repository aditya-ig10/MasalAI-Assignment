import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatThread } from "../components/ChatThread";
import * as api from "../lib/api";

afterEach(() => {
  vi.restoreAllMocks();
});

test("sends the message and appends reply plus history", async () => {
  vi.spyOn(api, "postChat").mockResolvedValue({
    reply: "Visit set for Saturday.",
    history: [
      { role: "user", content: "Is Saturday open?" },
      { role: "assistant", content: "Visit set for Saturday." },
    ],
  });
  render(<ChatThread leadId="abc" leadName="Priya" />);
  await userEvent.type(screen.getByLabelText(/message/i), "Is Saturday open?");
  await userEvent.click(screen.getByRole("button", { name: /send/i }));
  expect(await screen.findByText(/visit set for saturday/i)).toBeInTheDocument();
});

test("failed send keeps the draft and shows detail with retry", async () => {
  vi.spyOn(api, "postChat").mockRejectedValueOnce(new api.ApiError(502, "Both AI providers failed."));
  render(<ChatThread leadId="abc" leadName="Priya" />);
  await userEvent.type(screen.getByLabelText(/message/i), "Hello?");
  await userEvent.click(screen.getByRole("button", { name: /send/i }));
  expect(await screen.findByText(/both ai providers failed/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/message/i)).toHaveValue("Hello?");
  expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
});

test("blank message never sends", async () => {
  const spy = vi.spyOn(api, "postChat");
  render(<ChatThread leadId="abc" leadName="Priya" />);
  await userEvent.click(screen.getByRole("button", { name: /send/i }));
  expect(spy).not.toHaveBeenCalled();
});
