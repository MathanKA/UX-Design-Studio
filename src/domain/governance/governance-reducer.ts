import type { GovernanceEvent } from "./events";
import {
  governanceStateErr,
  governanceStateOk,
  type GovernanceStateResult,
} from "./governance-errors";
import type { ScreenId, ScreenVersionRecord, GovernanceState } from "./types";

export type GovernanceAction =
  | { type: "rehydrated"; state: GovernanceState }
  | { type: "eventAppended"; event: GovernanceEvent }
  | { type: "screenVersionAdded"; version: ScreenVersionRecord }
  | { type: "storageReset" };

function cloneScreenVersions(
  screenVersions: GovernanceState["screenVersions"],
): Record<ScreenId, readonly ScreenVersionRecord[]> {
  const next: Record<ScreenId, readonly ScreenVersionRecord[]> = {};
  for (const [screenId, versions] of Object.entries(screenVersions)) {
    next[screenId] = [...versions];
  }
  return next;
}

function appendScreenVersion(
  screenVersions: GovernanceState["screenVersions"],
  version: ScreenVersionRecord,
): Record<ScreenId, readonly ScreenVersionRecord[]> {
  const next = cloneScreenVersions(screenVersions);
  const existing = next[version.screenId] ?? [];
  if (existing.some((entry) => entry.id === version.id)) {
    return next;
  }
  next[version.screenId] = [...existing, version];
  return next;
}

function versionFromRegeneratedEvent(
  event: Extract<GovernanceEvent, { type: "screen.regenerated" }>,
  state: GovernanceState,
): ScreenVersionRecord | undefined {
  const existing = state.screenVersions[event.screenId] ?? [];
  const previous = existing.find(
    (entry) => entry.id === event.payload.previousVersionId,
  );
  const sequence = previous ? previous.sequence + 1 : existing.length + 1;

  return {
    id: event.payload.newVersionId,
    screenId: event.screenId,
    projectId: event.projectId,
    specId: event.specId,
    specVersion: event.specVersion,
    baselineVersion: event.baselineVersion,
    sequence,
    source: "regenerated",
    createdAt: event.occurredAt,
    previousVersionId: event.payload.previousVersionId,
  };
}

function baselineOnlyVersions(
  screenVersions: GovernanceState["screenVersions"],
): Record<ScreenId, readonly ScreenVersionRecord[]> {
  const next: Record<ScreenId, readonly ScreenVersionRecord[]> = {};
  for (const [screenId, versions] of Object.entries(screenVersions)) {
    const baselines = versions.filter((entry) => entry.source === "baseline");
    if (baselines.length > 0) {
      next[screenId] = baselines;
    }
  }
  return next;
}

function appendEvent(
  state: GovernanceState,
  event: GovernanceEvent,
): GovernanceStateResult {
  if (state.events.some((existing) => existing.id === event.id)) {
    return governanceStateErr(
      "DUPLICATE_EVENT_ID",
      `Event id "${event.id}" was already appended.`,
    );
  }

  let screenVersions = state.screenVersions;
  if (event.type === "screen.regenerated") {
    const version = versionFromRegeneratedEvent(event, state);
    if (version) {
      screenVersions = appendScreenVersion(screenVersions, version);
    }
  }

  return governanceStateOk({
    schemaVersion: 1,
    requiredScreenIds: state.requiredScreenIds,
    events: [...state.events, event],
    screenVersions,
  });
}

/**
 * Pure immutable governance reducer.
 * No Date, random UUID, browser storage APIs, or React access.
 */
export function reduceGovernance(
  state: GovernanceState,
  action: GovernanceAction,
): GovernanceStateResult {
  switch (action.type) {
    case "rehydrated":
      return governanceStateOk({
        schemaVersion: 1,
        requiredScreenIds: [...action.state.requiredScreenIds],
        events: [...action.state.events],
        screenVersions: cloneScreenVersions(action.state.screenVersions),
      });

    case "eventAppended":
      return appendEvent(state, action.event);

    case "screenVersionAdded":
      return governanceStateOk({
        schemaVersion: 1,
        requiredScreenIds: state.requiredScreenIds,
        events: state.events,
        screenVersions: appendScreenVersion(
          state.screenVersions,
          action.version,
        ),
      });

    case "storageReset":
      return governanceStateOk({
        schemaVersion: 1,
        requiredScreenIds: state.requiredScreenIds,
        events: [],
        screenVersions: baselineOnlyVersions(state.screenVersions),
      });

    default: {
      const _exhaustive: never = action;
      return governanceStateErr(
        "INVALID_ACTION",
        `Unsupported governance action: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}

/**
 * Fold an event history from an initial state. Stops on first error.
 */
export function foldGovernanceEvents(
  initial: GovernanceState,
  events: readonly GovernanceEvent[],
): GovernanceStateResult {
  let current = initial;
  for (const event of events) {
    const result = reduceGovernance(current, {
      type: "eventAppended",
      event,
    });
    if (!result.ok) {
      return result;
    }
    current = result.state;
  }
  return governanceStateOk(current);
}

export function appendGovernanceEvent(
  state: GovernanceState,
  event: GovernanceEvent,
): GovernanceStateResult {
  return reduceGovernance(state, { type: "eventAppended", event });
}
