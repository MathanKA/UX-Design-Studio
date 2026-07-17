import { NavLink } from "react-router-dom";
import styles from "./ProjectShell.module.css";

const navItems = [
  { segment: "overview", label: "Overview" },
  { segment: "spec", label: "Spec" },
  { segment: "ux-design-studio", label: "UX Design" },
  { segment: "agile-editor", label: "Agile Editor" },
  { segment: "kanban-board", label: "Kanban Board" },
  { segment: "live-terminal", label: "Live Terminal" },
  { segment: "branches", label: "Branches" },
  { segment: "change-requests", label: "Change Requests" },
  { segment: "deploy", label: "Deploy" },
] as const;

type ProjectSidebarProps = {
  projectId: string;
};

export function ProjectSidebar({ projectId }: ProjectSidebarProps) {
  const truncated =
    projectId.length > 22 ? `${projectId.slice(0, 22)}…` : projectId;

  return (
    <aside className={styles.sidebar} aria-label="Project">
      <div className={styles.projectBlock}>
        <p className={styles.projectLabel}>Project</p>
        <p className={styles.projectId} title={projectId}>
          {truncated}
        </p>
      </div>
      <nav aria-label="Project sections">
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li key={item.segment}>
              <NavLink
                to={`/projects/${projectId}/${item.segment}`}
                className={({ isActive }) =>
                  isActive
                    ? `${styles.navLink} ${styles.navLinkActive}`
                    : styles.navLink
                }
                end={item.segment !== "ux-design-studio"}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
