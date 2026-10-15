"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AudioLines, Check, Copy, FileAudio, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { ApiError, applyTranscriptAction, getLead, listTranscripts, uploadTranscript } from "@/lib/api";
import { useCachedData } from "@/lib/cache";
import { persistLead } from "@/lib/firestoreLeads";
import type { SalesTranscript } from "@/lib/types";
import { PriorityTag } from "@/components/PriorityTag";

const ACCEPT = ".mp3,.wav,.m4a,.ogg,.webm,.mp4,audio/mpeg,audio/wav,audio/x-wav,audio/mp4";
const MAX_BYTES = 25 * 1024 * 1024;

function errMsg(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

export default function TranscriptsPage() {
  const [active, setActive] = useState<SalesTranscript | null>(null);
  // Instant first paint from the browser cache, then a quiet background refresh.
  const { data: history, update: setHistory } = useCachedData<SalesTranscript[]>(
    "transcripts",
    () => listTranscripts().catch(() => [] as SalesTranscript[]),
    { ttlMs: 120_000, fallback: [] }
  );
  const [phase, setPhase] = useState<"idle" | "uploading" | "transcribing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
    if (![".mp3", ".wav", ".m4a", ".ogg", ".webm", ".mp4"].includes(ext)) {
      const msg = `“${file.name}” is not audio. Upload an mp3 or wav file (m4a/ogg also accepted).`;
      setError(msg);
      toast.error(msg);
      return;
    }
    if (file.size > MAX_BYTES) {
      const msg = "Audio file is too large (max 25 MB).";
      setError(msg);
      toast.error(msg);
      return;
    }
    setError(null);
    setPhase("uploading");
    try {
      const done = await uploadTranscript(file);
      // Upload finished fast; show a beat of "transcribing" is handled server-side,
      // the request itself covers both steps.
      setPhase("transcribing");
      setActive(done);
      setHistory([done, ...history.filter((t) => t.id !== done.id)]);
      toast.success("Call transcribed — AI suggestions ready.");
    } catch (e: unknown) {
      const msg = errMsg(e, "Could not transcribe this file.");
      setError(msg);
      toast.error(msg);
    } finally {
      setPhase("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function choose(actionId: string) {
    if (!active) return;
    setApplying(actionId);
    try {
      const updated = await applyTranscriptAction(active.id, actionId);
      setActive(updated);
      setHistory(history.map((t) => (t.id === updated.id ? updated : t)));
      if (updated.lead_id) {
        // Mirror to Firestore exactly like manually created leads, so the
        // record survives backend restarts and shows up in chat context.
        getLead(updated.lead_id)
          .then((created) => persistLead(created).catch(() => {}))
          .catch(() => {});
      }
      const label = updated.analysis?.suggestions.find((s) => s.id === updated.chosen_action)?.label ?? "Action";
      toast.success(
        updated.lead_id ? `${label} — lead created.` : `${label} saved.`,
      );
    } catch (e: unknown) {
      toast.error(errMsg(e, "Could not apply this action."));
    } finally {
      setApplying(null);
    }
  }

  function copyResponse() {
    const text = active?.analysis?.suggested_response ?? "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => toast.success("Follow-up message copied."),
      () => toast.error("Could not copy to clipboard.")
    );
  }

  const busy = phase !== "idle";
  const statusLine =
    phase === "uploading" ? "Uploading audio…" : phase === "transcribing" ? "Transcribing & analyzing…" : null;

  return (
    <>
      <div className="page-head">
        <p className="micro-label">Sales calls</p>
        <h1>Transcripts, triaged.</h1>
        <p>Upload an mp3 or wav call recording. AI transcribes it and suggests what to do with the lead.</p>
      </div>

      <section
        className="card"
        aria-label="Upload a sales call"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
        style={dragOver ? { background: "var(--off)" } : undefined}
      >
        <p className="micro-label">Upload</p>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span className="empty-icon" aria-hidden><FileAudio size={20} strokeWidth={1.5} /></span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 500 }}>
              {busy ? statusLine : "Drop your call recording here"}
            </p>
            <p style={{ margin: 0, color: "var(--ink3)", fontSize: 12 }}>
              mp3 or wav · m4a / ogg also work · max 25 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
            aria-label="Choose an audio file"
            style={{ display: "none" }}
            id="transcript-file"
          />
          <label htmlFor="transcript-file" className="btn" style={{ cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? <Loader2 size={14} className="pulse" aria-hidden /> : <UploadCloud size={14} aria-hidden />}
            {busy ? "Working…" : "Choose file"}
          </label>
        </div>
        {error ? <p role="alert" className="alert" style={{ marginTop: 12 }}>{error}</p> : null}
      </section>

      {active?.analysis ? (
        <div className="detail-grid" style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <section className="card" aria-label="Transcript">
              <p className="micro-label">Transcript · {active.filename}</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{active.transcript}</p>
            </section>

            <section className="card" aria-label="AI call analysis">
              <p className="micro-label">AI analysis</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                <PriorityTag priority={active.analysis.priority} />
                <span className="tag tag-neutral">{active.analysis.intent.replace("_", " ")}</span>
              </div>
              <p style={{ margin: "0 0 6px", fontSize: 13 }}>{active.analysis.summary}</p>
              <p style={{ margin: "0 0 12px", color: "var(--ink3)", fontSize: 12 }}>{active.analysis.priority_reason}</p>
              <dl className="kv">
                <dt>Next action</dt>
                <dd>{active.analysis.next_action}</dd>
                <dt>Requirements</dt>
                <dd>{active.analysis.requirements.length ? active.analysis.requirements.join(" · ") : "—"}</dd>
                <dt>Objections</dt>
                <dd>{active.analysis.objections.length ? active.analysis.objections.join(" · ") : "None raised."}</dd>
              </dl>
              <h3 style={{ margin: "14px 0 6px", fontSize: 15 }}>Suggested follow-up</h3>
              <blockquote style={{ margin: "0 0 8px", padding: "10px 12px", background: "var(--off)", border: "1px solid var(--rule)", fontSize: 13 }}>
                {active.analysis.suggested_response}
              </blockquote>
              <button type="button" className="btn btn-ghost" onClick={copyResponse}>
                <Copy size={13} aria-hidden /> Copy message
              </button>
            </section>
          </div>

          <section className="card" aria-label="Choose what to do">
            <p className="micro-label">What should happen next?</p>
            <h2 style={{ fontSize: 20, margin: "0 0 4px" }}>Pick an action</h2>
            <p className="sub">AI ranked these for this call. Your pick is saved on the transcript.</p>
            <div style={{ display: "grid", gap: 8 }}>
              {active.analysis.suggestions.map((s) => {
                const selected = active.chosen_action === s.id;
                const running = applying === s.id;
                return (
                  <div key={s.id} style={{ border: "1px solid var(--rule)", padding: "10px 12px", background: selected ? "var(--off)" : "transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                      <strong style={{ fontSize: 13 }}>{s.label}</strong>
                      {selected ? <span className="tag tag-live"><Check size={11} aria-hidden /> chosen</span> : null}
                    </div>
                    <p style={{ margin: "4px 0 10px", fontSize: 12, color: "var(--ink3)" }}>{s.description}</p>
                    <button
                      type="button"
                      className="btn"
                      disabled={applying !== null}
                      onClick={() => choose(s.id)}
                      aria-pressed={selected}
                    >
                      {running ? <Loader2 size={13} className="pulse" aria-hidden /> : null}
                      {running ? "Applying…" : selected ? "Applied" : `Do this: ${s.label}`}
                    </button>
                  </div>
                );
              })}
            </div>
            {active.lead_id ? (
              <p style={{ margin: "12px 0 0", fontSize: 12 }}>
                Lead created — <Link href={`/leads/${active.lead_id}`}>open the lead →</Link>
              </p>
            ) : null}
          </section>
        </div>
      ) : active && !active.analysis ? (
        <p role="alert" className="alert" style={{ marginTop: 12 }}>
          {active.analysis_error ?? "Analysis is not available for this transcript yet."}
        </p>
      ) : null}

      {/* Cached history paints instantly and intentionally differs from SSR
          HTML — suppress the hydration warning here (client data wins). */}
      <div suppressHydrationWarning>
        <div className="section-title" style={{ marginTop: 26 }}>
          <h2>Recent transcripts</h2>
          <span className="count">{history.length} total</span>
        </div>
      {history.length === 0 ? (
        <div className="empty-search">
          <span className="empty-icon" aria-hidden><AudioLines size={20} strokeWidth={1.5} /></span>
          <p className="empty-title">No calls yet</p>
          <p className="empty-sub">Upload your first mp3 or wav above and AI will do the triage.</p>
        </div>
      ) : (
        <div className="lead-grid">
          {history.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t)}
              className="lead-card"
              style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
              aria-current={active?.id === t.id ? "true" : undefined}
            >
              <div className="lead-top">
                <span className="lead-name" style={{ fontSize: 16 }}>{t.filename}</span>
                {t.analysis ? <PriorityTag priority={t.analysis.priority} /> : <span className="tag tag-neutral">pending</span>}
              </div>
              <p className="lead-meta">
                {new Date(t.created_at).toLocaleString()} · {t.transcript.split(/\s+/).length} words
                {t.chosen_action ? ` · ✓ ${t.chosen_action}` : ""}
              </p>
              <p className="lead-reason">{t.analysis?.summary ?? t.transcript.slice(0, 140)}</p>
            </button>
          ))}
        </div>
        )}
      </div>
    </>
  );
}
