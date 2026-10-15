"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ApiError, backendBase, getBackendStatus, pingBackend, type BackendStatus } from "@/lib/api";
import { isFirebaseConfigured, projectLabel } from "@/lib/firebase";
import { ThemeSegmented, useTheme } from "@/components/Theme";

type Conn =
  | { state: "checking" }
  | { state: "live"; ms: number }
  | { state: "mock" }
  | { state: "down"; message: string };

function Dot({ on, label }: { on: boolean | null; label: string }) {
  if (on === null) return <span className="v">…</span>;
  return (
    <span className="v">
      <span className={on ? "status-dot on" : "status-dot off"} aria-hidden />
      {on ? "On" : "Off"}
      <span style={{ color: "var(--ink4)", fontWeight: 400 }}> · {label}</span>
    </span>
  );
}

export default function Settings() {
  const [conn, setConn] = useState<Conn>({ state: "checking" });
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const { theme } = useTheme();
  const base = backendBase();
  const isMock = base === "(built-in mock)";

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const ms = await pingBackend();
      const s = await getBackendStatus().catch(() => null);
      setStatus(s);
      if (isMock) setConn({ state: "mock" });
      else setConn({ state: "live", ms });
    } catch (e: unknown) {
      setStatus(null);
      setConn({ state: "down", message: e instanceof ApiError ? e.message : "Unreachable" });
    } finally {
      setChecking(false);
    }
  }, [isMock]);

  useEffect(() => {
    check();
  }, [check]);

  return (
    <>
      <div className="page-head">
        <p className="micro-label">Configuration</p>
        <h1>Settings</h1>
        <p>Connection, providers, and appearance.</p>
      </div>

      <div style={{ display: "grid", gap: 10, maxWidth: 640 }}>
        <section className="card" aria-label="Backend connection">
          <p className="micro-label">Backend</p>
          <div className="status-row">
            <span className="k">Endpoint</span>
            <span className="v">{base}</span>
          </div>
          <div className="status-row">
            <span className="k">Status</span>
            {conn.state === "checking" && <span className="v">Checking…</span>}
            {conn.state === "live" && (
              <span className="v">
                <span className="status-dot on" aria-hidden /> Connected · {conn.ms}ms
              </span>
            )}
            {conn.state === "mock" && (
              <span className="v">
                <span className="status-dot on" aria-hidden /> Mock data · no live backend
              </span>
            )}
            {conn.state === "down" && (
              <span className="v">
                <span className="status-dot off" aria-hidden /> Down · {conn.message}
              </span>
            )}
          </div>
          <div className="status-row">
            <span className="k">Version</span>
            <span className="v">{status?.version ?? "—"}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-ghost" type="button" onClick={check} disabled={checking}>
              <RefreshCw size={13} strokeWidth={2} aria-hidden />
              {checking ? "Checking…" : "Recheck"}
            </button>
          </div>
        </section>

        <section className="card" aria-label="Providers">
          <p className="micro-label">APIs</p>
          <div className="status-row">
            <span className="k">Groq (analysis + chat)</span>
            <Dot on={status ? status.providers.groq : null} label="GROQ_API_KEY" />
          </div>
          <div className="status-row">
            <span className="k">Gemini (fallback)</span>
            <Dot on={status ? status.providers.gemini : null} label="GEMINI_API_KEY" />
          </div>
          <div className="status-row">
            <span className="k">Apify (property search)</span>
            <Dot on={status ? status.providers.apify : null} label="APIFY_API_TOKEN" />
          </div>
          <div className="status-row">
            <span className="k">Apify actor reachable</span>
            <Dot on={status ? status.apify_reachable : null} label="99acres scraper" />
          </div>
          <div className="status-row">
            <span className="k">Firestore persistence</span>
            <Dot on={isFirebaseConfigured()} label={projectLabel()} />
          </div>
        </section>

        <section className="card" aria-label="Appearance">
          <p className="micro-label">Appearance</p>
          <div className="status-row">
            <span className="k">Theme</span>
            <span className="v" style={{ fontWeight: 400, textTransform: "capitalize" }}>
              {theme}
            </span>
          </div>
          <div style={{ marginTop: 12 }}>
            <ThemeSegmented />
          </div>
        </section>
      </div>
    </>
  );
}
