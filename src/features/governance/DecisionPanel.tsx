import { useId, useState, type FormEvent } from "react";
import { appConfig, REGENERATION_TARGET_SCREEN_ID } from "../../app/config";
import { MIN_REVISION_DESCRIPTION_LENGTH } from "../../application/request-revision";
import {
  GOVERNANCE_LIMITS,
  REVISION_CATEGORIES,
  selectApprovalProgress,
  selectIsGateComplete,
  type RevisionCategory,
} from "../../domain/governance";
import { RoleSwitcher } from "./RoleSwitcher";
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
    isRegenerating,
    canApprove,
    canRequestRevision,
    canRegenerate,
    controlledFailureArmed,
    setControlledFailureArmed,
    approveScreen,
    requestRevision,
    regenerateScreen,
    cancelRegeneration,
    listScreenNodes,
    getScreenStatus,
    getCurrentScreenVersion,
    getLatestRevisionForScreen,
    getApprovalProgress,
    isGateComplete,
  } = useGovernance();
  const commentId = useId();
  const categoryId = useId();
  const descriptionId = useId();
  const nodesFieldId = useId();
  const controlledFailureId = useId();
  const [comment, setComment] = useState("");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [category, setCategory] = useState<RevisionCategory>("content");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"info" | "error">("info");

  const progress = getApprovalProgress();
  const gateComplete = isGateComplete();
  const version = screenId ? getCurrentScreenVersion(screenId) : undefined;
  const status = screenId ? getScreenStatus(screenId) : null;
  const latestRevision = screenId
    ? getLatestRevisionForScreen(screenId)
    : undefined;
  const nodeOptions = screenId ? listScreenNodes(screenId) : [];
  const alreadyApproved = status === "approved";
  const roleRestricted = !canApprove && !canRequestRevision;
  const isDashboardTarget = screenId === REGENERATION_TARGET_SCREEN_ID;
  const hasCurrentRevision =
    Boolean(latestRevision) &&
    latestRevision?.screenVersionId === version?.id;
  const approveDisabled =
    !screenId ||
    !version ||
    !canApprove ||
    alreadyApproved ||
    isSubmitting ||
    status === "regenerating";
  const revisionDisabled =
    !screenId ||
    !version ||
    !canRequestRevision ||
    isSubmitting ||
    status === "regenerating";
  const regenerateDisabled =
    !screenId ||
    !version ||
    !canRegenerate ||
    !isDashboardTarget ||
    !hasCurrentRevision ||
    isSubmitting ||
    status === "regenerating";

  const onApprove = (event: FormEvent) => {
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

  const onRequestRevision = (event: FormEvent) => {
    event.preventDefault();
    if (!screenId || !version || revisionDisabled) {
      return;
    }

    const result = requestRevision({
      screenId,
      expectedScreenVersionId: version.id,
      affectedNodeIds: selectedNodeIds,
      category,
      description,
    });

    if (!result.ok) {
      setFeedbackTone("error");
      setFeedback(result.error.message);
      return;
    }

    setSelectedNodeIds([]);
    setDescription("");
    setCategory("content");
    setFeedbackTone("info");
    setFeedback(
      `Revision requested for ${screenName ?? "Screen"}. Approval for this version is invalidated.`,
    );
  };

  const onRegenerate = async () => {
    if (!screenId || !version || regenerateDisabled) {
      return;
    }

    setFeedbackTone("info");
    setFeedback(`Regenerating ${screenName ?? "screen"}…`);

    const result = await regenerateScreen({
      screenId,
      expectedScreenVersionId: version.id,
    });

    if (!result.ok) {
      setFeedbackTone("error");
      if (result.outcome === "cancelled") {
        setFeedback("Regeneration cancelled. Current screen version retained.");
      } else {
        setFeedback(result.error.message);
      }
      return;
    }

    setFeedbackTone("info");
    setFeedback(
      `${screenName ?? "Screen"} regenerated to version ${result.version.id}. Ready for review.`,
    );
  };

  const toggleNode = (nodeId: string) => {
    setSelectedNodeIds((current) =>
      current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId],
    );
  };

  return (
    <aside
      className={styles.panel}
      aria-labelledby="decision-panel-heading"
      data-workbench-region="decision-panel"
      data-testid="decision-panel"
      data-actor-role={actor.role}
    >
      <h3 id="decision-panel-heading" className={styles.heading}>
        Decision panel
      </h3>
      <RoleSwitcher />
      <p className={styles.lede}>
        Approval and revision apply only to the current screen version. Other
        screens are unchanged.
      </p>

      {!screenId || !version || status === null ? (
        <p className={styles.body} data-decision="empty">
          Select a valid screen to review and approve.
        </p>
      ) : (
        <>
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

          {roleRestricted ? (
            <p
              className={styles.roleMessage}
              data-decision="role-restricted"
              data-testid="role-restricted-message"
            >
              The current POC demo role ({actor.displayLabel}) is read-only for
              approval and revision. Switch to Demo Approver to submit decisions.
              Viewing overview, preview, and audit remains available.
            </p>
          ) : null}

          {canApprove ? (
            <form
              className={styles.form}
              onSubmit={onApprove}
              data-decision="approve-form"
            >
              <div className={styles.field}>
                <label htmlFor={commentId}>Approval comment (optional)</label>
                <textarea
                  id={commentId}
                  name="approval-comment"
                  value={comment}
                  maxLength={GOVERNANCE_LIMITS.maxCommentLength}
                  rows={3}
                  disabled={alreadyApproved || isSubmitting || !canApprove}
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
                  : isSubmitting && !isRegenerating
                    ? "Approving…"
                    : "Approve current version"}
              </button>
            </form>
          ) : null}

          {canRequestRevision ? (
            <form
              className={styles.form}
              onSubmit={onRequestRevision}
              data-decision="revision-form"
              data-testid="revision-form"
            >
              <h4 className={styles.sectionHeading}>Request revision</h4>
              <fieldset className={styles.fieldset} disabled={revisionDisabled}>
                <legend id={nodesFieldId}>Affected component nodes</legend>
                <div
                  className={styles.nodeList}
                  role="group"
                  aria-labelledby={nodesFieldId}
                  data-decision="affected-nodes"
                >
                  {nodeOptions.map((node) => (
                    <label key={node.id} className={styles.nodeOption}>
                      <input
                        type="checkbox"
                        name="affected-nodes"
                        value={node.id}
                        checked={selectedNodeIds.includes(node.id)}
                        onChange={() => {
                          toggleNode(node.id);
                        }}
                        data-node-option={node.id}
                      />
                      <span>{node.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className={styles.field}>
                <label htmlFor={categoryId}>Revision category</label>
                <select
                  id={categoryId}
                  name="revision-category"
                  value={category}
                  disabled={revisionDisabled}
                  onChange={(event) => {
                    setCategory(event.target.value as RevisionCategory);
                  }}
                  data-decision="revision-category"
                >
                  {REVISION_CATEGORIES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor={descriptionId}>Revision description</label>
                <textarea
                  id={descriptionId}
                  name="revision-description"
                  value={description}
                  maxLength={GOVERNANCE_LIMITS.maxDescriptionLength}
                  rows={4}
                  disabled={revisionDisabled}
                  onChange={(event) => {
                    setDescription(event.target.value);
                  }}
                  data-decision="revision-description"
                />
                <p className={styles.hint}>
                  {description.length}/{GOVERNANCE_LIMITS.maxDescriptionLength}{" "}
                  characters (minimum {MIN_REVISION_DESCRIPTION_LENGTH})
                </p>
              </div>

              <button
                type="submit"
                className={styles.revise}
                disabled={revisionDisabled}
                data-decision="request-revision"
              >
                {isSubmitting && !isRegenerating ? "Submitting…" : "Request revision"}
              </button>
            </form>
          ) : null}

          {canRegenerate ? (
            <div
              className={styles.regenerate}
              data-decision="regenerate"
              data-testid="regenerate-indicator"
              data-regenerate-operational={isDashboardTarget ? "true" : "false"}
            >
              <p className={styles.sectionHeading}>Regenerate</p>
              {!isDashboardTarget ? (
                <p className={styles.hint} data-decision="regenerate-scope">
                  Provider-backed regeneration in this POC targets Dashboard
                  only ({REGENERATION_TARGET_SCREEN_ID}).
                </p>
              ) : !hasCurrentRevision ? (
                <p className={styles.hint} data-decision="regenerate-help">
                  Submit a structured revision for the current Dashboard version
                  before regenerating.
                </p>
              ) : (
                <p className={styles.hint} data-decision="regenerate-help">
                  Uses DesignAgentProvider with a deterministic mock variant.
                  Cancel retains the current version.
                </p>
              )}

              {isDashboardTarget &&
              canRegenerate &&
              appConfig.enableControlledProviderFailure ? (
                <label
                  className={styles.controlledFailure}
                  htmlFor={controlledFailureId}
                >
                  <input
                    id={controlledFailureId}
                    type="checkbox"
                    checked={controlledFailureArmed}
                    disabled={isRegenerating || isSubmitting}
                    onChange={(event) => {
                      setControlledFailureArmed(event.target.checked);
                    }}
                    data-decision="controlled-failure"
                  />
                  <span>Simulate controlled provider failure</span>
                </label>
              ) : null}

              <div className={styles.regenerateActions}>
                <button
                  type="button"
                  className={styles.regenerateButton}
                  disabled={regenerateDisabled}
                  onClick={() => {
                    void onRegenerate();
                  }}
                  data-decision="regenerate-control"
                >
                  {isRegenerating ? "Regenerating…" : "Regenerate"}
                </button>
                {isRegenerating ? (
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={cancelRegeneration}
                    data-decision="cancel-regeneration"
                  >
                    Cancel
                  </button>
                ) : null}
                {!isRegenerating &&
                status === "changes_requested" &&
                hasCurrentRevision &&
                isDashboardTarget ? (
                  <button
                    type="button"
                    className={styles.retryButton}
                    disabled={regenerateDisabled}
                    onClick={() => {
                      void onRegenerate();
                    }}
                    data-decision="retry-regeneration"
                  >
                    Retry regenerate
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
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
