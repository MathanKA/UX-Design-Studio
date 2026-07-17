import { screenReviewStatusLabel } from "../governance/status-labels";
import type { VersionHistoryContext } from "./version-history-selectors";
import styles from "./VersionHistoryPanel.module.css";

type VersionHistoryPanelProps = {
  context: VersionHistoryContext | null;
};

function formatTimestamp(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function approvalLabel(
  tone: VersionHistoryContext["entries"][number]["approvalTone"],
  statusLabel: string,
): string {
  if (tone === "current") {
    return `Current approval: ${statusLabel}`;
  }
  if (tone === "historical") {
    return `Historical approval: ${statusLabel}`;
  }
  return statusLabel;
}

export function VersionHistoryPanel({ context }: VersionHistoryPanelProps) {
  if (!context) {
    return (
      <aside
        className={styles.panel}
        aria-labelledby="version-history-heading"
        data-workbench-region="version-history"
        data-testid="version-history-panel"
        data-version-history-enabled="true"
        data-version-history-empty="true"
      >
        <h3 id="version-history-heading" className={styles.heading}>
          Version history
        </h3>
        <p className={styles.empty} role="status">
          No screen versions are available for this route.
        </p>
      </aside>
    );
  }

  const { screenName, entries, comparison, isBaselineOnly } = context;

  return (
    <aside
      className={styles.panel}
      aria-labelledby="version-history-heading"
      data-workbench-region="version-history"
      data-testid="version-history-panel"
      data-version-history-enabled="true"
      data-version-history-baseline-only={isBaselineOnly ? "true" : "false"}
      data-version-count={String(entries.length)}
    >
      <h3 id="version-history-heading" className={styles.heading}>
        Version history
      </h3>
      <p className={styles.lede}>
        Review prior and current screen versions without a separate history
        store. Records derive from governance versions and audit events.
      </p>
      <p className={styles.meta} data-version-history-screen="true">
        <span className={styles.label}>Screen</span> {screenName}
      </p>

      {isBaselineOnly ? (
        <p
          className={styles.empty}
          role="status"
          data-version-history-empty-baseline="true"
        >
          Only the baseline version exists. Prior/current comparison appears
          after regeneration creates a new version.
        </p>
      ) : null}

      <ol className={styles.list} data-version-history-list="true">
        {[...entries].reverse().map((entry) => {
          const statusLabel = screenReviewStatusLabel(entry.status);
          return (
            <li
              key={entry.version.id}
              className={
                entry.isCurrent
                  ? `${styles.item} ${styles.itemCurrent}`
                  : styles.item
              }
              data-version-id={entry.version.id}
              data-version-current={entry.isCurrent ? "true" : "false"}
              data-version-source={entry.version.source}
              data-version-approval={entry.approvalTone}
            >
              <div className={styles.itemHeader}>
                <span className={styles.versionId}>{entry.version.id}</span>
                {entry.isCurrent ? (
                  <span className={styles.currentBadge} data-version-marker="current">
                    Current
                  </span>
                ) : null}
              </div>
              <dl className={styles.details}>
                <div>
                  <dt>Sequence</dt>
                  <dd data-version-sequence="true">{entry.version.sequence}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd data-version-source-label="true">{entry.version.source}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd data-version-created="true">
                    {formatTimestamp(entry.version.createdAt)}
                  </dd>
                </div>
                {entry.version.previousVersionId ? (
                  <div>
                    <dt>Previous</dt>
                    <dd data-version-previous="true">
                      {entry.version.previousVersionId}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Approval</dt>
                  <dd data-version-approval-label="true">
                    {approvalLabel(entry.approvalTone, statusLabel)}
                  </dd>
                </div>
                {entry.triggeringRevision ? (
                  <div>
                    <dt>Revision that triggered regen</dt>
                    <dd data-version-revision="true">
                      {entry.triggeringRevision.payload.category}:{" "}
                      {entry.triggeringRevision.payload.description}
                    </dd>
                  </div>
                ) : null}
                {entry.regeneratedEvent?.payload.providerRequestId ? (
                  <div>
                    <dt>Provider request</dt>
                    <dd data-version-provider-request="true">
                      {entry.regeneratedEvent.payload.providerRequestId}
                    </dd>
                  </div>
                ) : null}
                {entry.resolveFailureReason ? (
                  <div>
                    <dt>Content</dt>
                    <dd data-version-resolve-failure="true">
                      Could not resolve ({entry.resolveFailureReason})
                    </dd>
                  </div>
                ) : null}
              </dl>
            </li>
          );
        })}
      </ol>

      {comparison ? (
        <section
          className={styles.comparison}
          aria-labelledby="version-comparison-heading"
          data-version-comparison="true"
        >
          <h4 id="version-comparison-heading" className={styles.subheading}>
            Prior / current comparison
          </h4>
          <p className={styles.meta} data-comparison-versions="true">
            <span className={styles.label}>Versions</span>{" "}
            {comparison.priorVersionId} → {comparison.currentVersionId}
          </p>
          <p className={styles.meta} data-comparison-node-delta="true">
            <span className={styles.label}>Node count</span>{" "}
            {comparison.priorNodeCount} → {comparison.currentNodeCount} (
            {comparison.nodeCountDelta >= 0 ? "+" : ""}
            {comparison.nodeCountDelta})
          </p>
          {comparison.addedNodeIds.length > 0 ? (
            <p className={styles.meta} data-comparison-added="true">
              <span className={styles.label}>Added nodes</span>{" "}
              {comparison.addedNodeIds.join(", ")}
            </p>
          ) : null}
          {comparison.removedNodeIds.length > 0 ? (
            <p className={styles.meta} data-comparison-removed="true">
              <span className={styles.label}>Removed nodes</span>{" "}
              {comparison.removedNodeIds.join(", ")}
            </p>
          ) : null}
          {comparison.changeSummaries.length > 0 ? (
            <ul className={styles.changeList} data-comparison-changes="true">
              {comparison.changeSummaries.map((summary) => (
                <li key={summary}>{summary}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty} data-comparison-changes-empty="true">
              No bounded text or prop changes detected between prior and current.
            </p>
          )}
          {comparison.providerExplanation ? (
            <ul
              className={styles.changeList}
              data-comparison-explanation="true"
            >
              {comparison.providerExplanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty} data-comparison-explanation-empty="true">
              Provider explanation unavailable on the regeneration event.
            </p>
          )}
          {comparison.providerRequestId ? (
            <p className={styles.meta} data-comparison-provider-request="true">
              <span className={styles.label}>Provider request</span>{" "}
              {comparison.providerRequestId}
            </p>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
