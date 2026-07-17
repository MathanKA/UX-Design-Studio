import { useId, useMemo, useState } from "react";
import {
  selectChronologicalEvents,
  selectEventsForScreen,
  type GovernanceEvent,
  type ScreenId,
} from "../../domain/governance";
import { ShellStatePanel } from "../../ui/states";
import { useGovernance } from "../governance";
import styles from "./AuditPage.module.css";
import { formatEventDetails, formatEventType } from "./format-audit-event";
import { ResetDemoStateControl } from "./ResetDemoStateControl";

const ALL_SCREENS = "all" as const;

type ScreenFilter = typeof ALL_SCREENS | ScreenId;

function AuditEventRow({
  event,
  screenLabel,
}: {
  event: GovernanceEvent;
  screenLabel: string;
}) {
  return (
    <article
      className={styles.event}
      data-testid="audit-event"
      data-event-id={event.id}
      data-event-type={event.type}
      data-screen-id={event.screenId}
    >
      <header className={styles.eventHeader}>
        <h3 className={styles.eventType}>{formatEventType(event.type)}</h3>
        <time className={styles.timestamp} dateTime={event.occurredAt}>
          {event.occurredAt}
        </time>
      </header>
      <dl className={styles.meta}>
        <div>
          <dt>Actor</dt>
          <dd data-field="actor">{event.actor.displayLabel}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd data-field="role">{event.actor.role}</dd>
        </div>
        <div>
          <dt>Screen</dt>
          <dd data-field="screen">{screenLabel}</dd>
        </div>
        <div>
          <dt>Screen version</dt>
          <dd data-field="screen-version">{event.screenVersionId}</dd>
        </div>
        <div>
          <dt>Spec version</dt>
          <dd data-field="spec-version">{event.specVersion}</dd>
        </div>
        <div>
          <dt>Baseline</dt>
          <dd data-field="baseline">{event.baselineVersion}</dd>
        </div>
      </dl>
      <p className={styles.details} data-field="details">
        {formatEventDetails(event)}
      </p>
    </article>
  );
}

export function AuditPage() {
  const { state, getScreen } = useGovernance();
  const filterId = useId();
  const [screenFilter, setScreenFilter] = useState<ScreenFilter>(ALL_SCREENS);

  const screenOptions = useMemo(
    () =>
      state.requiredScreenIds.map((screenId) => ({
        id: screenId,
        label: getScreen(screenId)?.name ?? screenId,
      })),
    [getScreen, state.requiredScreenIds],
  );

  const events = useMemo(() => {
    if (screenFilter === ALL_SCREENS) {
      return selectChronologicalEvents(state);
    }
    return selectEventsForScreen(state, screenFilter);
  }, [screenFilter, state]);

  const emptyMessage =
    state.events.length === 0
      ? "No governance events yet. Approve or request revisions from the review workbench to build the audit trail."
      : "No governance events match the selected screen filter.";

  return (
    <section className={styles.page} aria-labelledby="audit-heading">
      <header className={styles.header}>
        <h2 id="audit-heading">Audit</h2>
        <p className={styles.lede}>
          Chronological governance history for the AgentPilot demo. Filtering
          inspects the append-only log without mutating it.
        </p>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.filter} htmlFor={filterId}>
          <span>Screen filter</span>
          <select
            id={filterId}
            value={screenFilter}
            onChange={(event) => {
              setScreenFilter(event.target.value as ScreenFilter);
            }}
            data-testid="audit-screen-filter"
          >
            <option value={ALL_SCREENS}>All screens</option>
            {screenOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {events.length === 0 ? (
        <ShellStatePanel title="Empty governance history" tone="info" role="status">
          {emptyMessage}
        </ShellStatePanel>
      ) : (
        <ol className={styles.list} data-testid="audit-event-list">
          {events.map((event) => (
            <li key={event.id}>
              <AuditEventRow
                event={event}
                screenLabel={getScreen(event.screenId)?.name ?? event.screenId}
              />
            </li>
          ))}
        </ol>
      )}

      <ResetDemoStateControl />
    </section>
  );
}
