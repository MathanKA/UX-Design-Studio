import { Link, useParams } from "react-router-dom";
import { DEMO_PROJECT_ID, DEMO_PROJECT_NAME } from "../app/config";
import styles from "./placeholders.module.css";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const { projectId = DEMO_PROJECT_ID } = useParams();

  return (
    <section className={styles.page} aria-labelledby="host-placeholder-heading">
      <h1 id="host-placeholder-heading">{title}</h1>
      <p className={styles.meta}>Project: {DEMO_PROJECT_NAME}</p>
      <p>{description}</p>
      <p className={styles.note}>Simulated host page — not the real InsaneSDD product.</p>
      <p>
        <Link to={`/projects/${projectId}/ux-design-studio/overview`}>
          Open UX Design
        </Link>
      </p>
    </section>
  );
}
