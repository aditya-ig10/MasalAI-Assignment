import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Lexend } from "next/font/google";
import Script from "next/script";
import { Shell } from "@/components/Shell";
import { ThemeProvider } from "@/components/Theme";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Lexend({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "LeadAnalyzer",
  description: "Real estate lead triage for property agents.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('masalai-theme')||'system';var d=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme='light';}})();`,
          }}
        />
        <ThemeProvider>
          <Shell>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
