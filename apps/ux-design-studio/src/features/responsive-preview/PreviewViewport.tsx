import type { ReactNode } from "react";
import type { PreviewBreakpoint } from "../../renderer";
import { PREVIEW_BREAKPOINT_LABELS, PREVIEW_WIDTHS } from "./preview-breakpoint";
import styles from "./PreviewViewport.module.css";

type PreviewViewportProps = {
  breakpoint: PreviewBreakpoint;
  children: ReactNode;
  screenId?: string;
};

export function PreviewViewport({
  breakpoint,
  children,
  screenId,
}: PreviewViewportProps) {
  const width = PREVIEW_WIDTHS[breakpoint];

  return (
    <div
      className={styles.scrollHost}
      data-preview-viewport-scroll="true"
      data-testid="preview-viewport-scroll"
    >
      <div
        className={styles.viewport}
        style={{ width: `${width}px` }}
        data-breakpoint={breakpoint}
        data-preview-width={width}
        data-preview-viewport="true"
        {...(screenId !== undefined ? { "data-screen-id": screenId } : {})}
        data-workbench-region="preview-canvas"
      >
        <p className={styles.widthIndicator} data-preview-width-indicator="true">
          {PREVIEW_BREAKPOINT_LABELS[breakpoint]} · {width}px
        </p>
        <div className={styles.frame}>{children}</div>
      </div>
    </div>
  );
}
