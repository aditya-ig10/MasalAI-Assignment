"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Braces, Check, ClipboardCopy, Eraser, FileJson, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, createLead } from "@/lib/api";
import { persistLead } from "@/lib/firestoreLeads";
import { BULK_SAMPLE_TEXT, parseBulkLeads } from "@/lib/bulkLeads";
import type { Lead } from "@/lib/types";
import styles from "./BulkLeadImport.module.css";

interface FailedRow {
  index: number;
  message: string;
}

export function BulkLeadImport({ disabled }: { disabled?: boolean }) {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);
  const [created, setCreated] = useState<Lead[]>([]);
  const [failed, setFailed] = useState<FailedRow[]>([]);
  const [finished, setFinished] = useState(false);

  const parsed = useMemo(() => parseBulkLeads(text), [text]);
  const valid = useMemo(() => parsed.rows.filter((r) => r.value !== null), [parsed]);
  const invalidCount = parsed.rows.length - valid.length;

  function reset() {
    setText("");
    setCreated([]);
    setFailed([]);
    setFinished(false);
    setDone(0);
  }

  function copyTemplate() {
    navigator.clipboard.writeText(BULK_SAMPLE_TEXT).then(
      () => toast.success("JSON template copied — paste your leads into it."),
      () => toast.error("Could not copy to clipboard.")
    );
  }

  async function importValid() {
    if (valid.length === 0 || importing) return;
    setImporting(true);
    setCreated([]);
    setFailed([]);
    setFinished(false);
    const ok: Lead[] = [];
    const bad: FailedRow[] = [];
    let n = 0;
    for (const row of valid) {
      try {
        const lead = await createLead(row.value!);
        ok.push(lead);
        void persistLead(lead).catch(() => {});
      } catch (e: unknown) {
        bad.push({ index: row.index, message: e instanceof ApiError ? e.message : "Could not save this lead." });
      }
      n += 1;
      setDone(n);
    }
    setCreated(ok);
    setFailed(bad);
    setFinished(true);
    setImporting(false);
    if (ok.length > 0 && bad.length === 0) toast.success(`${ok.length} lead${ok.length === 1 ? "" : "s"} imported — triage complete.`);
    else if (ok.length > 0) toast.success(`${ok.length} imported, ${bad.length} failed.`);
    else toast.error("None of the leads could be imported.");
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <p className={styles.hint}>
          Paste a JSON array of leads below. Validation runs live — only valid rows import.
        </p>
        <div className={styles.actions}>
          <button type="button" className="btn btn-ghost" onClick={() => setText(BULK_SAMPLE_TEXT)} disabled={importing || disabled}>
            <FileJson size={13} aria-hidden /> Load sample
          </button>
          <button type="button" className="btn btn-ghost" onClick={copyTemplate}>
            <ClipboardCopy size={13} aria-hidden /> Copy template
          </button>
          {text ? (
            <button type="button" className="btn btn-ghost" onClick={reset} disabled={importing || disabled}>
              <Trash2 size={13} aria-hidden /> Clear
            </button>
          ) : null}
        </div>
      </div>

      <label className={styles.label} htmlFor="bulk-json">
        <Braces size={12} aria-hidden /> Structured JSON block
      </label>
      <textarea
        id="bulk-json"
        className={styles.editor}
        value={text}
        onChange={(e) => { setText(e.target.value); setFinished(false); }}
        placeholder={BULK_SAMPLE_TEXT}
        spellCheck={false}
        rows={14}
        disabled={importing || disabled}
      />

      {parsed.parseError ? (
        <p role="alert" className="alert">{parsed.parseError}</p>
      ) : parsed.rows.length > 0 ? (
        <>
          <div className={styles.summary} role="status">
            <span className={styles.okPill}><Check size={11} aria-hidden /> {valid.length} valid</span>
            {invalidCount > 0 ? (
              <span className={styles.badPill}><X size={11} aria-hidden /> {invalidCount} need fixes</span>
            ) : null}
            <span className={styles.count}>{parsed.rows.length} total</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Name</th>
                  <th scope="col">Location</th>
                  <th scope="col">Budget</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((row) => {
                  const firstError = Object.values(row.errors)[0];
                  return (
                    <tr key={row.index} className={row.value ? "" : styles.invalidRow}>
                      <td>{row.index}</td>
                      <td>{row.value?.name ?? "—"}</td>
                      <td>{row.value?.location ?? "—"}</td>
                      <td>{row.value ? row.value.budget.toLocaleString("en-IN") : "—"}</td>
                      <td>
                        {row.value ? (
                          <span className={styles.okPill}><Check size={11} aria-hidden /> Ready</span>
                        ) : (
                          <span className={styles.badPill} title={firstError}><X size={11} aria-hidden /> {firstError ?? "Invalid"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className={styles.empty}>
          <Eraser size={13} aria-hidden /> Nothing to preview yet — paste JSON or load the sample.
        </p>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className="btn"
          onClick={importValid}
          disabled={valid.length === 0 || importing || disabled}
        >
          {importing ? <Loader2 size={13} className="pulse" aria-hidden /> : null}
          {importing ? `Importing ${done}/${valid.length}…` : `Import ${valid.length} valid lead${valid.length === 1 ? "" : "s"}`}
        </button>
        {importing ? (
          <div className={styles.progress} aria-hidden>
            <i style={{ width: valid.length ? `${Math.round((done / valid.length) * 100)}%` : "0%" }} />
          </div>
        ) : null}
      </div>

      {finished ? (
        <section className="card" aria-label="Import results" style={{ marginTop: 4 }}>
          <p className="micro-label">Results</p>
          <p style={{ margin: "0 0 8px", fontSize: 13 }}>
            {created.length} imported{failed.length ? `, ${failed.length} failed` : ""}.
          </p>
          {created.length > 0 ? (
            <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 13 }}>
              {created.map((l) => (
                <li key={l.id}>
                  {l.name} — <Link href={`/leads/${l.id}`}>open lead →</Link>
                </li>
              ))}
            </ul>
          ) : null}
          {failed.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--ink3)" }}>
              {failed.map((f) => (
                <li key={f.index}>Row {f.index}: {f.message}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
