import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPage from "../app/chat/page";

const LEAD = {
  id: "a",
  created_at: "2026-10-15T09:00:00Z",
  name: "Priya Nair",
  location: "Whitefield, Bengaluru",
  property_requirement: "3BHK apartment",
  budget: 12000000,
  buying_timeline: "within 2 months",
  customer_message: "Wants a weekend visit.",
  analysis: {
    summary: "Hot buyer.",
    intent: "buy",
    requirements: [],
    objections: [],
    next_action: "Confirm visit.",
    suggested_response: "See you Saturday!",
    priority: "hot",
    priority_reason: "Weekend visit.",
    influencer: { present: false, who: "", evidence_phrase: "", suggested_action: "" },
  },
  analysis_error: null,
};

function stubBackend(leads: unknown[]) {
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith("/leads")) {
      return new Response(JSON.stringify({ leads }), { status: 200 });
    }
    if (u.endsWith("/chat") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { message: string };
      const history = [
        { role: "user", content: body.message },
        { role: "assistant", content: "Priya is hot — book Saturday." },
      ];
      return new Response(JSON.stringify({ reply: "Priya is hot — book Saturday.", history }), { status: 200 });
    }
    return new Response(JSON.stringify({ detail: "not found" }), { status: 404 });
  }) as typeof fetch;
}

test("chat page grounds the assistant in all leads and chats", async () => {
  stubBackend([LEAD]);
  render(<ChatPage />);

  expect(await screen.findByText(/Knows all 1 leads/)).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText("Message"), "Who is hot?");
  await userEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(await screen.findByText("Priya is hot — book Saturday.")).toBeInTheDocument();
  expect(screen.getByText("Who is hot?")).toBeInTheDocument();
});

test("chat page handles an empty pipeline", async () => {
  stubBackend([]);
  render(<ChatPage />);

  expect(await screen.findByText(/No leads yet/)).toBeInTheDocument();
});
