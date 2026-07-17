import type { GovernanceEvent } from "./events";
import {
  governanceStateErr,
  governanceStateOk,
  type GovernanceStateResult,
} from "./governance-errors";
import {
  GOVERNANCE_LIMITS,
  type ScreenId,
  type ScreenVersionRecord,
  type GovernanceState,
} from "./types";

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

function findVersionAnywhere(
  screenVersions: GovernanceState["screenVersions"],
  versionId: string,
): ScreenVersionRecord | undefined {
  for (const versions of Object.values(screenVersions)) {
    const match = versions.find((entry) => entry.id === versionId);
    if (match) {
      return match;
    }
  }
  return undefined;
}

function appendScreenVersion(
  screenVersions: GovernanceState["screenVersions"],
  version: ScreenVersionRecord,
): GovernanceStateResult {
  if (findVersionAnywhere(screenVersions, version.id)) {
    return governanceStateErr(
      "DUPLICATE_VERSION_ID",
      `Screen version id "${version.id}" already exists.`,
    );
  }

  if (version.source === "regenerated") {
    const contentRef = version.contentRef?.trim();
    if (!contentRef) {
      return governanceStateErr(
        "MISSING_CONTENT_REF",
        `Regenerated version "${version.id}" requires a contentRef.`,
      );
    }
    if (contentRef.length > GOVERNANCE_LIMITS.maxContentRefLength) {
      return governanceStateErr(
        "MISSING_CONTENT_REF",
        `contentRef exceeds ${GOVERNANCE_LIMITS.maxContentRefLength} characters.`,
      );
    }
  }

  const next = cloneScreenVersions(screenVersions);
  const existing = next[version.screenId] ?? [];
  next[version.screenId] = [...existing, version];
  return governanceStateOk({
    schemaVersion: 1,
    requiredScreenIds: [],
    events: [],
    screenVersions: next,
  });
}

function versionFromRegeneratedEvent(
  event: Extract<GovernanceEvent, { type: "screen.regenerated" }>,
  state: GovernanceState,
): ScreenVersionRecord {
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
    contentRef: event.payload.contentRef,
  };
}

function validateRegeneratedActivation(
  state: GovernanceState,
  event: Extract<GovernanceEvent, { type: "screen.regenerated" }>,
): GovernanceStateResult {
  const { previousVersionId, newVersionId, revisionEventId, contentRef } =
    event.payload;

  if (newVersionId === previousVersionId) {
    return governanceStateErr(
      "VERSION_ID_COLLISION",
      `newVersionId must differ from previousVersionId ("${previousVersionId}").`,
    );
  }

  if (findVersionAnywhere(state.screenVersions, newVersionId)) {
    return governanceStateErr(
      "DUPLICATE_VERSION_ID",
      `Screen version id "${newVersionId}" already exists.`,
    );
  }

  const trimmedRef = contentRef.trim();
  if (!trimmedRef) {
    return governanceStateErr(
      "MISSING_CONTENT_REF",
      "Regenerated event requires a non-empty contentRef.",
    );
  }
  if (trimmedRef.length > GOVERNANCE_LIMITS.maxContentRefLength) {
    return governanceStateErr(
      "MISSING_CONTENT_REF",
      `contentRef exceeds ${GOVERNANCE_LIMITS.maxContentRefLength} characters.`,
    );
  }

  const previous = (state.screenVersions[event.screenId] ?? []).find(
    (entry) => entry.id === previousVersionId,
  );
  if (!previous) {
    return governanceStateErr(
      "MISSING_SCREEN_VERSION",
      `Previous version "${previousVersionId}" was not found for "${event.screenId}".`,
    );
  }

  const revision = state.events.find((entry) => entry.id === revisionEventId);
  if (
    !revision ||
    revision.type !== "screen.revision_requested" ||
    revision.screenId !== event.screenId ||
    revision.screenVersionId !== previousVersionId
  ) {
    return governanceStateErr(
      "INVALID_REVISION_REFERENCE",
      `revisionEventId "${revisionEventId}" is not a revision for version "${previousVersionId}" on "${event.screenId}".`,
    );
  }

  return governanceStateOk(state);
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

  if (event.type === "screen.regenerated") {
    const validation = validateRegeneratedActivation(state, event);
    if (!validation.ok) {
      return validation;
    }

    const version = versionFromRegeneratedEvent(event, state);
    const nextVersions = cloneScreenVersions(state.screenVersions);
    const existing = nextVersions[version.screenId] ?? [];
    nextVersions[version.screenId] = [...existing, version];

    return governanceStateOk({
      schemaVersion: 1,
      requiredScreenIds: state.requiredScreenIds,
      events: [...state.events, event],
      screenVersions: nextVersions,
    });
  }

  return governanceStateOk({
    schemaVersion: 1,
    requiredScreenIds: state.requiredScreenIds,
    events: [...state.events, event],
    screenVersions: state.screenVersions,
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

    case "screenVersionAdded": {
      const appendResult = appendScreenVersion(
        state.screenVersions,
        action.version,
      );
      if (!appendResult.ok) {
        return appendResult;
      }
      return governanceStateOk({
        schemaVersion: 1,
        requiredScreenIds: state.requiredScreenIds,
        events: state.events,
        screenVersions: appendResult.state.screenVersions,
      });
    }

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
