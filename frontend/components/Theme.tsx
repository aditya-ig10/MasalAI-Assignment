"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { Monitor, Moon, Sun } from "lucide-react";
import { initAnalytics } from "@/lib/firebase";

export type ThemeChoice = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const KEY = "masalai-theme";

function resolve(choice: ThemeChoice): Resolved {
  if (choice === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return choice;
}

const Ctx = createContext<{ theme: ThemeChoice; resolved: Resolved; setTheme: (t: ThemeChoice) => void }>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(Ctx);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<Resolved>("light");

  useEffect(() => {
    initAnalytics();
    const saved = (localStorage.getItem(KEY) as ThemeChoice | null) ?? "system";    setThemeState(saved);
    setResolved(resolve(saved));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem(KEY) as ThemeChoice | null ?? "system") === "system") {
        const next = media.matches ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        setResolved(next);
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    localStorage.setItem(KEY, next);
    const r = resolve(next);
    document.documentElement.dataset.theme = r;
    setThemeState(next);
    setResolved(r);
  }, []);

  return (
    <Ctx.Provider value={{ theme, resolved, setTheme }}>
      {children}
      <Toaster position="bottom-right" theme={resolved} toastOptions={{ style: { fontFamily: "var(--font-sans)" } }} />
    </Ctx.Provider>
  );
}

const OPTIONS: { key: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
];

export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="segmented" role="group" aria-label="Appearance">
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = theme === o.key;
        return (
          <button
            key={o.key}
            type="button"
            className={active ? "segmented-btn active" : "segmented-btn"}
            aria-pressed={active}
            onClick={() => setTheme(o.key)}
          >
            <Icon size={13} strokeWidth={2} aria-hidden /> {o.label}
          </button>
        );
      })}
    </div>
  );
}
