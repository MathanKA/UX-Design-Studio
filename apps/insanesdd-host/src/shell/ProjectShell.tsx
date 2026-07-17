import { Outlet, useParams } from "react-router-dom";
import { ProjectSidebar } from "./ProjectSidebar";
import styles from "./ProjectShell.module.css";

export function ProjectShell() {
  const { projectId = "" } = useParams();

  return (
    <div className={styles.shell} data-testid="host-project-shell">
      <a className={styles.skipLink} href="#host-main-content">
        Skip to main content
      </a>
      <ProjectSidebar projectId={projectId} />
      <div className={styles.content}>
        <header className={styles.topBar}>
          <p className={styles.simLabel}>Simulated integration host</p>
        </header>
        <main id="host-main-content" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
