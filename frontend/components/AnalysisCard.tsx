import type { Analysis, Intent } from "@/lib/types";
import { PriorityTag } from "./PriorityTag";
import styles from "./AnalysisCard.module.css";

const INTENT_LABEL: Record<Intent, string> = {
  buy: "Buy",
  sell: "Sell",
  rent: "Rent",
  invest: "Invest",
  just_browsing: "Browsing",
  unclear: "Unclear",
};

function intentLabel(intent: string): string {
  return (INTENT_LABEL as Record<string, string>)[intent] ?? "Unclear";
}

export function AnalysisCard({
  analysis,
  analysisError,
}: {
  analysis: Analysis | null;
  analysisError: string | null;
}) {
  if (!analysis) {
    return (
      <section className={styles.pending} aria-label="Analysis pending">
        <h2>Analysis pending</h2>
        {analysisError ? <p>{analysisError}</p> : <p>Analysis has not run for this lead yet.</p>}
      </section>
    );
  }
  return (
    <section aria-label="Lead analysis">
      <PriorityTag priority={analysis.priority} />
      <div className={styles.grid}>
        <div className={styles.block}>
          <h3>Summary</h3>
          <p>{analysis.summary}</p>
        </div>
        <div className={styles.block}>
          <h3>Intent</h3>
          <p>{intentLabel(analysis.intent)}</p>
        </div>
        <div className={styles.block}>
          <h3>Requirements</h3>
          <ul>
            {analysis.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div className={styles.block}>
          <h3>Objections</h3>
          {analysis.objections.length > 0 ? (
            <ul>
              {analysis.objections.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          ) : (
            <p>None raised.</p>
          )}
        </div>
        <div className={styles.block}>
          <h3>Next action</h3>
          <p>{analysis.next_action}</p>
        </div>
        <div className={styles.block}>
          <h3>Suggested response</h3>
          <blockquote>{analysis.suggested_response}</blockquote>
        </div>
      </div>
    </section>
  );
}
