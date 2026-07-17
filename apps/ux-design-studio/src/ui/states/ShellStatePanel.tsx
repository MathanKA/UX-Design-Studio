import type { ReactNode } from "react";
import styles from "./ShellStatePanel.module.css";

export type ShellStateTone = "info" | "warning" | "danger";

type ShellStatePanelProps = {
  title: string;
  children: ReactNode;
  tone?: ShellStateTone;
  role?: "status" | "alert";
  busy?: boolean;
  actions?: ReactNode;
};

export function ShellStatePanel({
  title,
  children,
  tone = "info",
  role = "status",
  busy = false,
  actions,
}: ShellStatePanelProps) {
  return (
    <section
      className={`${styles.panel} ${styles[tone]}`}
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      aria-busy={busy || undefined}
      data-shell-state={tone}
    >
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.body}>{children}</div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  );
}
