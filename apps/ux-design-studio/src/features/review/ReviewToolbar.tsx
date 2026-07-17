import type { PreviewBreakpoint } from "../../renderer";
import { PreviewBreakpointControls } from "../responsive-preview";
import { StudioIcon } from "../../ui/icons";
import styles from "./ReviewToolbar.module.css";

type ReviewToolbarProps = {
  headingId: string;
  screenName: string;
  screenVersionId?: string;
  reviewStatusLabel: string;
  reviewStatusTone: "neutral" | "warning" | "success" | "info";
  breakpoint: PreviewBreakpoint;
  onBreakpointChange: (breakpoint: PreviewBreakpoint) => void;
  enableTabletPreview: boolean;
};

export function ReviewToolbar({
  headingId,
  screenName,
  screenVersionId,
  reviewStatusLabel,
  reviewStatusTone,
  breakpoint,
  onBreakpointChange,
  enableTabletPreview,
}: ReviewToolbarProps) {
  return (
    <div
      className={styles.toolbar}
      data-testid="review-toolbar"
      data-workbench-region="review-toolbar"
    >
      <div className={styles.identity}>
        <span className={styles.toolbarMark} aria-hidden="true">
          <StudioIcon name="monitor" size={16} />
        </span>
        <nav aria-label="Review breadcrumb" className={styles.breadcrumb}>
          <ol className={styles.breadcrumbList}>
            <li>
              <h2 id={headingId} className={styles.heading}>
                Screen review
              </h2>
            </li>
            <li aria-current="page">{screenName}</li>
          </ol>
        </nav>
        <div className={styles.chips}>
          {screenVersionId ? (
            <span className={styles.versionChip} data-toolbar="screen-version">
              <span className={styles.versionPrefix} aria-hidden="true">
                v.
              </span>
              {screenVersionId}
            </span>
          ) : null}
          <span
            className={styles.statusChip}
            data-toolbar="review-status"
            data-status-tone={reviewStatusTone}
          >
            {reviewStatusLabel}
          </span>
        </div>
      </div>

      <div className={styles.breakpointSlot}>
        <PreviewBreakpointControls
          value={breakpoint}
          onChange={onBreakpointChange}
          enableTabletPreview={enableTabletPreview}
        />
      </div>

    </div>
  );
}
