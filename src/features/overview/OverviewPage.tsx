import styles from "./PlaceholderPage.module.css";

export function OverviewPage() {
  return (
    <section className={styles.page} aria-labelledby="overview-heading">
      <h2 id="overview-heading">Overview</h2>
      <p>
        Specification summary and approval progress will appear here. This shell
        establishes the foundation route for later workbench features.
      </p>
    </section>
  );
}
