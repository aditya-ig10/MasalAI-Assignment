import Link from "next/link";
import type { ReactNode } from "react";
import { SideNav } from "./SideNav";
import { TopSearch } from "./TopSearch";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Sidebar">
        <Link href="/" className="wordmark">
          LeadAnalyzer
        </Link>
        <TopSearch />
        <SideNav />
        <div className="side-foot">
          <p className="live-row">
            <i /> Live
          </p>
        </div>
      </aside>
      <main className="content">
        <div className="container">{children}</div>
        <div className="container">
          <footer className="footer">LeadAnalyzer — lead triage for property agents.</footer>
        </div>
      </main>
    </div>
  );
}
