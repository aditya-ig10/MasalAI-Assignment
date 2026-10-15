"use client";

import { useState } from "react";
import { ApiError, postChat } from "@/lib/api";
import type { ChatEntry } from "@/lib/types";
import styles from "./ChatThread.module.css";

export function ChatThread({
  leadId,
  leadName,
  initialHistory = [],
}: {
  leadId: string;
  leadName: string;
  initialHistory?: ChatEntry[];
}) {
  const [history, setHistory] = useState<ChatEntry[]>(initialHistory);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(message: string) {
    const text = message.trim();
    if (text === "" || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await postChat(leadId, text);
      setHistory(res.history);
      setDraft("");
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Could not send the message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-label={`Chat about ${leadName}`} className={styles.thread}>
      <h2>Chat</h2>
      <p className={styles.note}>Answers use this lead record.</p>
      <ol className={styles.list}>
        {history.map((entry, i) => (
          <li key={i} className={entry.role === "user" ? styles.user : styles.assistant}>
            {entry.content}
          </li>
        ))}
      </ol>
      {error ? (
        <p role="alert">
          {error} <button type="button" onClick={() => send(draft)}>Retry</button>
        </p>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor="chat-message">Message</label>
        <input
          id="chat-message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending}>
          Send
        </button>
      </form>
    </section>
  );
}
