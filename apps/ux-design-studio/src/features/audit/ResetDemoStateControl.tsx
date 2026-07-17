import { useEffect, useId, useRef, useState } from "react";
import { useGovernance } from "../governance";
import styles from "./AuditPage.module.css";

/**
 * Demo-state reset with confirmation.
 * Removes only the managed governance persistence key.
 */
export function ResetDemoStateControl() {
  const { resetDemoState, resetAnnouncement } = useGovernance();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!confirmOpen) {
      return;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = document.getElementById(`${titleId}-dialog`);
      if (!dialog) {
        return;
      }

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [confirmOpen, titleId]);

  return (
    <section
      className={styles.resetSection}
      aria-labelledby={`${titleId}-reset-heading`}
      data-testid="reset-demo-state"
    >
      <h3 id={`${titleId}-reset-heading`} className={styles.resetHeading}>
        Reset demo state
      </h3>
      <p className={styles.resetHelp}>
        Clears persisted approvals, revisions, and audit events for this demo.
        UXSpec seed data, personas, journeys, tokens, and feature flags are
        preserved. Unrelated browser storage keys are not modified.
      </p>
      <button
        type="button"
        className={styles.resetButton}
        onClick={() => {
          setConfirmOpen(true);
        }}
        data-testid="reset-demo-open"
      >
        Reset demo state
      </button>

      <div className={styles.srOnly} aria-live="polite" role="status">
        {resetAnnouncement ?? ""}
      </div>

      {confirmOpen ? (
        <div className={styles.dialogBackdrop} data-testid="reset-confirm-backdrop">
          <div
            id={`${titleId}-dialog`}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            data-testid="reset-confirm-dialog"
          >
            <h4 id={titleId} className={styles.dialogTitle}>
              Confirm demo-state reset
            </h4>
            <p id={descriptionId} className={styles.dialogBody}>
              This removes only the managed governance storage key and clears
              visible approvals, revisions, and audit history. Unrelated browser
              storage keys are left untouched.
            </p>
            <div className={styles.dialogActions}>
              <button
                ref={cancelRef}
                type="button"
                className={styles.dialogCancel}
                onClick={() => {
                  setConfirmOpen(false);
                }}
                data-testid="reset-confirm-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dialogConfirm}
                onClick={() => {
                  resetDemoState();
                  setConfirmOpen(false);
                }}
                data-testid="reset-confirm-submit"
              >
                Confirm reset
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
