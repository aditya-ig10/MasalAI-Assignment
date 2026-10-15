"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { ArrowUp, Sparkles } from "lucide-react";
import { ApiError, postChat, postLeadsChat } from "@/lib/api";
import type { ChatEntry, Lead } from "@/lib/types";
import styles from "./ChatThread.module.css";

const LEAD_SUGGESTIONS = [
  "What should I emphasize on the call?",
  "Make my reply more assertive.",
  "Summarize the objections.",
];

const ALL_SUGGESTIONS = [
  "Which leads are hot right now?",
  "Who should I call first today?",
  "Summarize the flagged deals.",
];

export function ChatThread({
  leadId,
  leadName,
  initialHistory = [],
  contextLeads,
  caption,
  suggestions,
  placeholder,
}: {
  leadId: string;
  leadName: string;
  initialHistory?: ChatEntry[];
  /** When set, chat is grounded in ALL these leads instead of one record. */
  contextLeads?: Lead[];
  caption?: string;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [history, setHistory] = useState<ChatEntry[]>(initialHistory);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = bottomRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [history, sending]);

  function autoresize() {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function send(message: string) {
    const text = message.trim();
    if (text === "" || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = contextLeads
        ? await postLeadsChat(text, contextLeads, history)
        : await postChat(leadId, text);
      setHistory(res.history);
      setDraft("");
      requestAnimationFrame(autoresize);
    } catch (e: unknown) {
      const message = e instanceof ApiError ? e.message : "Could not send the message.";
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  const initial = (leadName.trim()[0] ?? "?").toUpperCase();
  const prompts = suggestions ?? (contextLeads ? ALL_SUGGESTIONS : LEAD_SUGGESTIONS);
  const sub = caption ?? (contextLeads ? `Knows all ${contextLeads.length} leads · pipeline only` : "Grounded in this lead record");
  const boxPlaceholder = placeholder ?? (contextLeads ? "Ask about your leads…" : `Ask about ${leadName}…`);

  return (
    <section aria-label={`Chat about ${leadName}`} className={styles.chat}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <span className={styles.avatar} aria-hidden>
            {initial}
          </span>
          <div>
            <p className={styles.title}>{leadName}</p>
            <p className={styles.caption}>{sub}</p>
          </div>
        </header>

        {history.length === 0 && !sending ? (
          <div className={styles.empty}>
            <p className={styles.greet}>What do you want to know?</p>
            <div className={styles.pills}>
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className={styles.pill}
                  disabled={sending}
                  onClick={() => send(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className={styles.list}>
            {history.map((entry, i) =>
              entry.role === "user" ? (
                <li key={i} className={styles.userRow}>
                  <span className={styles.user}>{entry.content}</span>
                </li>
              ) : (
                <li key={i} className={styles.aiRow}>
                  <span className={styles.aiAvatar} aria-hidden>
                    <Sparkles size={13} strokeWidth={2} />
                  </span>
                  <div className={`${styles.ai} ${styles.md}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
                  </div>
                </li>
              )
            )}
            {sending ? (
              <li className={styles.aiRow} aria-label="Waiting for reply">
                <span className={styles.aiAvatar} aria-hidden>
                  <Sparkles size={13} strokeWidth={2} />
                </span>
                <span className={styles.typing} aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </li>
            ) : null}
            <div ref={bottomRef} />
          </ol>
        )}

        {error ? (
          <p role="alert" className={styles.error}>
            {error}{" "}
            <button type="button" className={styles.retry} onClick={() => send(draft)}>
              Retry
            </button>
          </p>
        ) : null}

        <form
          className={styles.composer}
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <textarea
            ref={boxRef}
            id="chat-message"
            aria-label="Message"
            rows={1}
            value={draft}
            placeholder={boxPlaceholder}
            onChange={(e) => {
              setDraft(e.target.value);
              autoresize();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            disabled={sending}
          />
          <button
            type="submit"
            aria-label="Send"
            className={styles.send}
            disabled={sending || draft.trim() === ""}
          >
            <ArrowUp size={16} strokeWidth={2.25} aria-hidden />
          </button>
        </form>
        <p className={styles.hint}>Enter to send · Shift+Enter for a new line</p>
      </div>
    </section>
  );
}
