"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AudioLines, LayoutDashboard, MessageCircle, Plus, Settings, Users } from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard, hash: "" },
  { href: "/leads", label: "Leads", icon: Users, hash: "" },
  { href: "/new", label: "New lead", icon: Plus, hash: "" },
  { href: "/transcripts", label: "Calls", icon: AudioLines, hash: "" },
  { href: "/chat", label: "Chat", icon: MessageCircle, hash: "" },
  { href: "/settings", label: "Settings", icon: Settings, hash: "" },
];

export function SideNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <nav aria-label="Primary">
      <p className="side-label">Menu</p>
      {NAV.map((item) => {
        const [path] = item.href.split("#");
        const active =
          pathname === path && (item.hash === "" ? hash === "" : hash === item.hash);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={active ? "side-link active" : "side-link"}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={15} strokeWidth={1.75} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
