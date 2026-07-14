import { NavLink, Outlet } from "react-router-dom";
import { appConfig } from "../app/config";
import styles from "./AppShell.module.css";

const navItems = [
  { to: "/overview", label: "Overview" },
  { to: "/review/screen-dashboard", label: "Review" },
  { to: "/audit", label: "Audit" },
] as const;

export function AppShell() {
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
        <nav aria-label="Studio">
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
