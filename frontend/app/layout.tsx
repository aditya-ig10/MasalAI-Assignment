import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

const display = Source_Serif_4({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Public_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "MasalAI Lead Dashboard",
  description: "Real estate lead triage for property agents.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
