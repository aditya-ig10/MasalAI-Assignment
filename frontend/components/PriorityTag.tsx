import type { Priority } from "@/lib/types";
import styles from "./PriorityTag.module.css";

const LABEL: Record<Priority, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };

export function PriorityTag({ priority }: { priority: Priority }) {
  return <span className={`${styles.tag} ${styles[priority]}`}>{LABEL[priority]}</span>;
}
