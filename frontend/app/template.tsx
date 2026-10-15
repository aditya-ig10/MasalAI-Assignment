"use client";

// Page enter animation, one system for every route change. template.tsx
// re-mounts on each navigation, so this runs per page: blur-in + fade +
// settle (sharp focus pulling in). 450ms, cubic-bezier(0.22, 1, 0.36, 1).
// Back/forward navigations play the short variant (250ms, subtler).
// The sidebar/footer live in the layout above this file, so they never
// animate — only the page content does.

import { useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { consumePopNav } from "@/lib/routeAnim";

const EXCLUDED_PREFIXES: string[] = [];

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [short] = useState(() => consumePopNav());
  const nodeRef = useRef<HTMLDivElement>(null);

  const skip =
    reduced || EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (skip) return <>{children}</>;

  // Back/forward arrival: short + subtle. Fresh navigation: deeper focus
  // pull so the blur-in reads as one continuous dissolve.
  const blurPx = short ? 5 : 14;

  return (
    <motion.div
      ref={nodeRef}
      initial={{ opacity: 0, filter: `blur(${blurPx}px)`, scale: short ? 1 : 0.992, y: short ? 0 : 14 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1, y: 0 }}
      transition={{ duration: short ? 0.25 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        // Identity filter traps fixed-position descendants, so drop it once
        // resting sharp.
        if (nodeRef.current) nodeRef.current.style.filter = "";
      }}
    >
      {children}
    </motion.div>
  );
}
