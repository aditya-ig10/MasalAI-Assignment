import Link from "next/link";
import styles from "./EmptyState.module.css";

export function EmptyState() {
  return (
    <div className={styles.box}>
      <p>No leads yet. Add your first lead to start triage.</p>
      <Link href="/new">Add your first lead</Link>
    </div>
  );
}
