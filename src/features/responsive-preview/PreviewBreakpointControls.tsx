import { useId } from "react";
import type { PreviewBreakpoint } from "../../renderer";
import {
  listAvailableBreakpoints,
  PREVIEW_BREAKPOINT_LABELS,
} from "./preview-breakpoint";
import styles from "./PreviewBreakpointControls.module.css";

type PreviewBreakpointControlsProps = {
  value: PreviewBreakpoint;
  onChange: (breakpoint: PreviewBreakpoint) => void;
  enableTabletPreview: boolean;
};

export function PreviewBreakpointControls({
  value,
  onChange,
  enableTabletPreview,
}: PreviewBreakpointControlsProps) {
  const groupId = useId();
  const options = listAvailableBreakpoints(enableTabletPreview);

  return (
    <fieldset
      className={styles.fieldset}
      aria-labelledby={`${groupId}-legend`}
      data-preview-breakpoint-controls="true"
    >
      <legend id={`${groupId}-legend`} className={styles.legend}>
        Preview width
      </legend>
      <div
        className={styles.options}
        role="radiogroup"
        aria-label="Preview breakpoint"
      >
        {options.map((breakpoint) => {
          const checked = breakpoint === value;
          return (
            <label
              key={breakpoint}
              className={
                checked ? `${styles.option} ${styles.optionActive}` : styles.option
              }
            >
              <input
                type="radio"
                name={`${groupId}-breakpoint`}
                value={breakpoint}
                checked={checked}
                onChange={() => {
                  onChange(breakpoint);
                }}
                data-preview-breakpoint-option={breakpoint}
              />
              <span>{PREVIEW_BREAKPOINT_LABELS[breakpoint]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
