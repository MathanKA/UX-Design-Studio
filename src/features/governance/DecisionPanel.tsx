import { useId, useState, type FormEvent } from "react";
import {
  GOVERNANCE_LIMITS,
  selectApprovalProgress,
  selectIsGateComplete,
} from "../../domain/governance";
import { useGovernance } from "./governance-context";
import { screenReviewStatusLabel } from "./status-labels";
import styles from "./DecisionPanel.module.css";

type DecisionPanelProps = {
  screenId?: string;
  screenName?: string;
};

export function DecisionPanel({ screenId, screenName }: DecisionPanelProps) {
  const {
    actor,
    isSubmitting,
    canApprove,
    approveScreen,
    getScreenStatus,
    getCurrentScreenVersion,
    getApprovalProgress,
    isGateComplete,
  } = useGovernance();
  const commentId = useId();
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"info" | "error">("info");

  const progress = getApprovalProgress();
  const gateComplete = isGateComplete();
  const version = screenId ? getCurrentScreenVersion(screenId) : undefined;
  const status = screenId ? getScreenStatus(screenId) : null;
  const alreadyApproved = status === "approved";
  const approveDisabled =
    !screenId ||
    !version ||
    !canApprove ||
    alreadyApproved ||
    isSubmitting ||
    status === "regenerating";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!screenId || !version || approveDisabled) {
      return;
    }

    const trimmed = comment.trim();
    const result = approveScreen({
      screenId,
      expectedScreenVersionId: version.id,
      ...(trimmed.length > 0 ? { comment: trimmed } : {}),
    });

    if (!result.ok) {
      setFeedbackTone("error");
      setFeedback(result.error.message);
      return;
    }

    setComment("");
    setFeedbackTone("info");
    const nextProgress = selectApprovalProgress(result.state);
    const completed = selectIsGateComplete(result.state);
    if (completed) {
      setFeedback(
        `${screenName ?? "Screen"} approved. All required screens are approved. Ready for Agile plan generation.`,
      );
    } else {
      setFeedback(
        `${screenName ?? "Screen"} version ${version.id} approved. ${nextProgress.remainingCount} screen${nextProgress.remainingCount === 1 ? "" : "s"} remaining.`,
      );
    }
  };

  return (
    <aside
      className={styles.panel}
      aria-labelledby="decision-panel-heading"
      data-workbench-region="decision-panel"
      data-testid="decision-panel"
    >
      <h3 id="decision-panel-heading" className={styles.heading}>
        Decision panel
      </h3>
      <p className={styles.lede}>
        Approval applies only to the current screen version. Other screens are
        unchanged.
      </p>

      {!screenId || !version || status === null ? (
        <p className={styles.body} data-decision="empty">
          Select a valid screen to review and approve.
        </p>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} data-decision="form">
          <dl className={styles.meta}>
            <div>
              <dt>Active screen</dt>
              <dd data-decision="screen-name">{screenName ?? screenId}</dd>
            </div>
            <div>
              <dt>Screen version</dt>
              <dd data-decision="screen-version">{version.id}</dd>
            </div>
            <div>
              <dt>Review status</dt>
              <dd data-decision="status">{screenReviewStatusLabel(status)}</dd>
            </div>
            <div>
              <dt>Actor</dt>
              <dd data-decision="actor">
                {actor.displayLabel} ({actor.role})
              </dd>
            </div>
          </dl>

          <div className={styles.field}>
            <label htmlFor={commentId}>Approval comment (optional)</label>
            <textarea
              id={commentId}
              name="approval-comment"
              value={comment}
              maxLength={GOVERNANCE_LIMITS.maxCommentLength}
              rows={3}
              disabled={alreadyApproved || isSubmitting}
              onChange={(event) => {
                setComment(event.target.value);
              }}
              data-decision="comment"
            />
            <p className={styles.hint}>
              {comment.length}/{GOVERNANCE_LIMITS.maxCommentLength} characters
            </p>
          </div>

          <button
            type="submit"
            className={styles.approve}
            disabled={approveDisabled}
            data-decision="approve"
          >
            {alreadyApproved
              ? "Current version approved"
              : isSubmitting
                ? "Approving…"
                : "Approve current version"}
          </button>
        </form>
      )}

      <section
        className={styles.progress}
        aria-labelledby="decision-gate-heading"
        data-testid="decision-gate-progress"
      >
        <h4 id="decision-gate-heading" className={styles.progressHeading}>
          UX gate progress
        </h4>
        <p data-decision="progress">
          {progress.approvedCount} of {progress.totalRequired} screens approved
        </p>
        <p data-decision="remaining">
          {gateComplete
            ? "No screens remaining"
            : `${progress.remainingCount} remaining`}
        </p>
        <p data-decision="gate-readiness" data-gate-complete={gateComplete}>
          {gateComplete
            ? "Ready for Agile plan generation"
            : "Agile plan generation unavailable until all required screens are approved"}
        </p>
      </section>

      <div
        className={
          feedbackTone === "error" ? styles.feedbackError : styles.feedback
        }
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-decision="feedback"
        data-feedback-tone={feedbackTone}
      >
        {feedback}
      </div>
    </aside>
  );
}
