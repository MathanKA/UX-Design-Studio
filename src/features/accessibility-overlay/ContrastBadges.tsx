import type { ScreenSpec } from "../../domain/ux-spec";
import { collectContrastAnnotations } from "./accessibility-selectors";
import styles from "./ContrastBadges.module.css";

type ContrastBadgesProps = {
  screen: ScreenSpec | null | undefined;
};

/**
 * Cut-safe contrast evidence badges. Independent of the full accessibility overlay.
 */
export function ContrastBadges({ screen }: ContrastBadgesProps) {
  const badges = collectContrastAnnotations(screen);

  if (!screen || badges.length === 0) {
    return (
      <div
        className={styles.strip}
        data-testid="contrast-badges"
        data-contrast-badges="true"
        data-contrast-empty="true"
        role="status"
      >
        <p className={styles.empty}>No contrast evidence on this screen.</p>
      </div>
    );
  }

  return (
    <div
      className={styles.strip}
      data-testid="contrast-badges"
      data-contrast-badges="true"
      data-contrast-count={String(badges.length)}
      aria-label="Contrast evidence badges"
    >
      <p className={styles.heading}>Contrast evidence</p>
      <ul className={styles.list}>
        {badges.map((badge) => {
          const status = badge.contrastStatus ?? "warning";
          const ratioLabel =
            typeof badge.contrastRatio === "number"
              ? ` ${badge.contrastRatio.toFixed(1)}:1`
              : "";
          const textLabel =
            status === "pass" ? `Pass${ratioLabel}` : `Warning${ratioLabel}`;
          return (
            <li key={badge.id}>
              <span
                className={
                  status === "pass" ? styles.badgePass : styles.badgeWarning
                }
                data-contrast-status={status}
                data-contrast-ratio={
                  badge.contrastRatio !== undefined
                    ? String(badge.contrastRatio)
                    : undefined
                }
              >
                <span className={styles.badgeLabel}>{textLabel}</span>
                <span className={styles.badgeSource}>{badge.sourceLabel}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
