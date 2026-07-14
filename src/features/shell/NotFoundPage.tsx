import { Link } from "react-router-dom";
import styles from "../../ui/PlaceholderPage.module.css";

export function NotFoundPage() {
  return (
    <section className={styles.page} aria-labelledby="not-found-heading">
      <h2 id="not-found-heading">Page not found</h2>
      <p>The requested studio route does not exist.</p>
      <p>
        <Link to="/overview">Return to overview</Link>
      </p>
    </section>
  );
}
