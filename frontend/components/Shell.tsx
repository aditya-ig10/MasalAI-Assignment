import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Shell.module.css";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className={styles.header}>
        <div className={`container ${styles.bar}`}>
          <Link href="/" className={styles.wordmark}>
            MasalAI
          </Link>
          <nav className={styles.nav}>
            <Link href="/">Leads</Link>
            <Link href="/new">New lead</Link>
          </nav>
        </div>
      </header>
      <main className="container">{children}</main>
      <footer className={styles.footer}>
        <div className="container">Lead triage for property agents.</div>
      </footer>
    </div>
  );
}
