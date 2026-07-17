import { Link } from "react-router-dom";
import { useStudioRouting } from "../../app/studio-routing";
import type { OverviewScreenCard } from "../../domain/ux-spec/overview-selectors";
import styles from "./OverviewPage.module.css";

type OverviewCardProps = {
  screen: OverviewScreenCard;
  statusLabel: string;
};

export function OverviewCard({ screen, statusLabel }: OverviewCardProps) {
  const { toStudio } = useStudioRouting();
  return (
    <article className={styles.card} data-screen-card={screen.id}>
      <h3 className={styles.cardTitle}>{screen.name}</h3>
      {screen.description ? (
        <p className={styles.cardDescription}>{screen.description}</p>
      ) : null}
      <p className={styles.cardMeta}>
        <span className={styles.metaLabel}>Route</span>{" "}
        <code>{screen.routeKey}</code>
      </p>
      <p className={styles.cardMeta}>
        <span className={styles.metaLabel}>Review status</span>{" "}
        <span data-review-status={screen.id}>{statusLabel}</span>
      </p>
      <Link
        className={styles.cardAction}
        to={toStudio(screen.reviewHref)}
        aria-label={`Open ${screen.name} review`}
      >
        Open review
      </Link>
    </article>
  );
}
