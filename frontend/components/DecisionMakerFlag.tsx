"use client";

import { useState } from "react";
import type { Influencer } from "@/lib/types";
import styles from "./DecisionMakerFlag.module.css";

export function DecisionMakerFlag({ influencer }: { influencer: Influencer }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!influencer.present) return null;

  return (
    <section className={styles.panel} aria-label="Hidden decision maker">
      <h2>Hidden decision maker: {influencer.who}</h2>
      <blockquote>{influencer.evidence_phrase}</blockquote>
      <p>{influencer.suggested_action}</p>
      {confirmed ? (
        <p className={styles.confirmed}>Confirmed for the call.</p>
      ) : (
        <button type="button" onClick={() => setOpen(true)}>
          Confirm before calling
        </button>
      )}
      {open && !confirmed ? (
        <div role="dialog" aria-label="Confirm before calling" className={styles.dialog}>
          <p>
            You are calling about {influencer.who}. Evidence: {influencer.evidence_phrase}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => {
                setConfirmed(true);
                setOpen(false);
              }}
            >
              Proceed
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
