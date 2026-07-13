import { useParams } from "react-router-dom";
import styles from "../overview/PlaceholderPage.module.css";

export function ReviewPage() {
  const { screenId } = useParams<{ screenId: string }>();

  return (
    <section className={styles.page} aria-labelledby="review-heading">
      <h2 id="review-heading">Screen review</h2>
      <p>
        Active review workbench placeholder for screen{" "}
        <strong>{screenId ?? "unknown"}</strong>. Renderer and governance arrive in later
        stories.
      </p>
    </section>
  );
}
