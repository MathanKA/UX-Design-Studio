import { NavLink, Outlet } from "react-router-dom";
import { appConfig } from "../app/config";
import type { UxDesignStudioAppMode } from "../app/UxDesignStudioApp";
import { useStudioRouting } from "../app/studio-routing";
import { useGovernance } from "../features/governance";
import { ShellStatePanel } from "./states";
import { StudioIcon } from "./icons";
import styles from "./AppShell.module.css";

const navItems = [
  { path: "overview", label: "Overview" },
  { path: "review/screen-dashboard", label: "Review" },
  { path: "audit", label: "Audit" },
] as const;

export function AppShell({ mode = "standalone" }: { mode?: UxDesignStudioAppMode }) {
  const { persistenceNotice, dismissPersistenceNotice } = useGovernance();
  const { toStudio } = useStudioRouting();
  const embedded = mode === "embedded";

  return (
    <div
      className={embedded ? `${styles.shell} ${styles.shellEmbedded}` : styles.shell}
      data-shell-mode={mode}
    >
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>
      {embedded ? null : (
        <header className={styles.header} data-testid="studio-standalone-header">
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              <StudioIcon name="monitor" size={18} />
            </span>
            <h1 className={styles.title}>{appConfig.appName}</h1>
            <span className={styles.eyebrow}>InsaneSDD proof-of-work concept</span>
          </div>
          <nav aria-label="Studio" className={styles.nav}>
            <ul className={styles.navList}>
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={toStudio(item.path)}
                    className={({ isActive }) =>
                      isActive
                        ? `${styles.navLink} ${styles.navLinkActive}`
                        : styles.navLink
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </header>
      )}
      {embedded ? (
        <nav aria-label="Studio" className={styles.embeddedNav} data-testid="studio-embedded-nav">
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={toStudio(item.path)}
                  className={({ isActive }) =>
                    isActive
                      ? `${styles.navLink} ${styles.navLinkActive}`
                      : styles.navLink
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {persistenceNotice ? (
        <div className={styles.persistenceNotice} data-testid="persistence-notice">
          <ShellStatePanel
            title="Persistence recovery"
            tone="warning"
            role="status"
            actions={
              <button
                type="button"
                className={styles.dismissNotice}
                onClick={dismissPersistenceNotice}
              >
                Dismiss
              </button>
            }
          >
            {persistenceNotice}
          </ShellStatePanel>
        </div>
      ) : null}
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
