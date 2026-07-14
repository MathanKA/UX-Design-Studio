import { NavLink, Outlet } from "react-router-dom";
import { appConfig } from "../app/config";
import { RoleSwitcher } from "../features/governance/RoleSwitcher";
import { useGovernance } from "../features/governance";
import { ShellStatePanel } from "./states";
import styles from "./AppShell.module.css";

const navItems = [
  { to: "/overview", label: "Overview" },
  { to: "/review/screen-dashboard", label: "Review" },
  { to: "/audit", label: "Audit" },
] as const;

export function AppShell() {
  const { persistenceNotice, dismissPersistenceNotice } = useGovernance();

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <p className={styles.eyebrow}>InsaneSDD proof-of-work concept</p>
          <h1 className={styles.title}>{appConfig.appName}</h1>
        </div>
        <div className={styles.headerTools}>
          <nav aria-label="Studio">
            <ul className={styles.navList}>
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
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
          <RoleSwitcher />
        </div>
      </header>
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
