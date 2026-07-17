import { Link } from "react-router-dom";
import { useStudioRouting } from "../../app/studio-routing";
import styles from "../../ui/PlaceholderPage.module.css";

export function NotFoundPage() {
  const { toStudio } = useStudioRouting();
  return (
    <section className={styles.page} aria-labelledby="not-found-heading">
      <h2 id="not-found-heading">Page not found</h2>
      <p>The requested studio route does not exist.</p>
      <p>
        <Link to={toStudio("overview")}>Return to overview</Link>
      </p>
    </section>
  );
}
