import type { UXSpec } from "../../domain/ux-spec";
import {
  deriveUXSpecOverviewSummary,
  listOverviewScreens,
} from "../../domain/ux-spec/overview-selectors";
import { agentPilotSeed } from "../../infrastructure/seed";
import {
  deriveApprovalProgressPlaceholder,
  buildPlaceholderScreenStatuses,
} from "./review-status-placeholder";
import { OverviewCard } from "./OverviewCard";
import { EmptyState, LoadingState } from "../../ui/states";
import styles from "./OverviewPage.module.css";

type OverviewPageProps = {
  /** Injected UXSpec for tests; defaults to AgentPilot seed. */
  spec?: UXSpec;
  loading?: boolean;
};

export function OverviewPage({
  spec = agentPilotSeed,
  loading = false,
}: OverviewPageProps = {}) {
  if (loading) {
    return (
      <section className={styles.page} aria-labelledby="overview-heading">
        <h2 id="overview-heading">Overview</h2>
        <LoadingState />
      </section>
    );
  }

  if (spec.screens.length === 0) {
    return (
      <section className={styles.page} aria-labelledby="overview-heading">
        <h2 id="overview-heading">Overview</h2>
        <EmptyState title="Empty UX specification">
          <p>No screens are available in the loaded UXSpec.</p>
        </EmptyState>
      </section>
    );
  }

  const summary = deriveUXSpecOverviewSummary(spec);
  const screens = listOverviewScreens(spec);
  const statuses = buildPlaceholderScreenStatuses(spec);
  const statusById = new Map(statuses.map((entry) => [entry.screenId, entry.label]));
  const progress = deriveApprovalProgressPlaceholder(spec);
  const spacingValues = Object.values(summary.designSystem.spacingScale).join(", ");
  const radiusValues = Object.values(summary.designSystem.radiusScale).join(", ");

  return (
    <section className={styles.page} aria-labelledby="overview-heading">
      <h2 id="overview-heading">Overview</h2>
      <p className={styles.lede}>
        Specification summary for {summary.projectTitle}. Counts derive from the
        validated UXSpec.
      </p>

      <div className={styles.summaryGrid} data-testid="overview-summary">
        <dl className={styles.stats}>
          <div>
            <dt>Project</dt>
            <dd data-overview-field="project-name">{summary.projectTitle}</dd>
          </div>
          <div>
            <dt>Baseline version</dt>
            <dd data-overview-field="baseline-version">{summary.baselineVersion}</dd>
          </div>
          <div>
            <dt>Specification version</dt>
            <dd data-overview-field="spec-version">{summary.specificationVersion}</dd>
          </div>
          <div>
            <dt>Personas</dt>
            <dd data-overview-field="persona-count">{summary.personaCount}</dd>
          </div>
          <div>
            <dt>Journeys</dt>
            <dd data-overview-field="journey-count">{summary.journeyCount}</dd>
          </div>
          <div>
            <dt>Screens</dt>
            <dd data-overview-field="screen-count">{summary.screenCount}</dd>
          </div>
          <div>
            <dt>Component nodes</dt>
            <dd data-overview-field="component-count">{summary.componentNodeCount}</dd>
          </div>
        </dl>

        <section
          className={styles.designSystem}
          aria-labelledby="design-system-heading"
          data-testid="design-system-summary"
        >
          <h3 id="design-system-heading">Design system</h3>
          <ul className={styles.tokenList}>
            <li>
              Primary palette:{" "}
              <span data-token="primary">{summary.designSystem.primaryColor}</span>
              {" / "}
              <span data-token="primary-contrast">
                {summary.designSystem.primaryContrast}
              </span>
            </li>
            <li>
              Typography:{" "}
              <span data-token="font-family">{summary.designSystem.fontFamily}</span>
              {", "}
              <span data-token="base-size">{summary.designSystem.baseSize}</span>
            </li>
            <li>
              Spacing scale: <span data-token="spacing">{spacingValues}</span>
            </li>
            <li>
              Radius scale: <span data-token="radius">{radiusValues}</span>
            </li>
          </ul>
        </section>

        <section
          className={styles.approval}
          aria-labelledby="approval-progress-heading"
          data-testid="approval-progress-placeholder"
        >
          <h3 id="approval-progress-heading">Approval progress</h3>
          <p data-approval="headline">{progress.headline}</p>
          <p data-approval="detail">{progress.detail}</p>
          <p className={styles.note} data-approval="note">
            {progress.note}
          </p>
        </section>
      </div>

      <section aria-labelledby="screen-cards-heading">
        <h3 id="screen-cards-heading">Screens</h3>
        <div className={styles.cardGrid} data-testid="screen-cards">
          {screens.map((screen) => (
            <OverviewCard
              key={screen.id}
              screen={screen}
              statusLabel={statusById.get(screen.id) ?? "Not reviewed"}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
