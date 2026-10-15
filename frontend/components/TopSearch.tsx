"use client";

import { Search } from "lucide-react";

export function TopSearch({ className = "side-search" }: { className?: string }) {
  return (
    <form
      className={className}
      role="search"
      action="/leads"
      method="get"
      onSubmit={(e) => {
        const form = e.currentTarget;
        const data = new FormData(form);
        const q = String(data.get("q") ?? "").trim();
        if (typeof window !== "undefined" && window.history) {
          e.preventDefault();
          window.location.href = q ? `/leads?q=${encodeURIComponent(q)}` : "/leads";
        }
      }}
    >
      <span className="search-wrap">
        <Search size={14} strokeWidth={2} aria-hidden className="search-icon" />
        <input name="q" placeholder="Search leads…" aria-label="Search leads" />
      </span>
    </form>
  );
}
