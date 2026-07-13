import styles from "../overview/PlaceholderPage.module.css";

export function AuditPage() {
  return (
    <section className={styles.page} aria-labelledby="audit-heading">
      <h2 id="audit-heading">Audit</h2>
      <p>
        Chronological governance events will appear here. This route is reserved for the
        append-only audit log.
      </p>
    </section>
  );
}
