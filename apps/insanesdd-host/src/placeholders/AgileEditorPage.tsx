import { DEMO_PROJECT_NAME } from "../app/config";
import styles from "./placeholders.module.css";

export function AgileEditorPage() {
  return (
    <section className={styles.page} aria-labelledby="agile-editor-heading" data-testid="agile-editor-page">
      <h1 id="agile-editor-heading">Agile Editor</h1>
      <p className={styles.meta}>Project: {DEMO_PROJECT_NAME}</p>
      <p>
        <strong>UX Design approved</strong>
      </p>
      <p>Ready for Agile plan generation</p>
      <p className={styles.note}>
        Simulated host page — no Agile plans were generated.
      </p>
    </section>
  );
}
