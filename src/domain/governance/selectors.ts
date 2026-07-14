import type { GovernanceEvent } from "./events";
import { hasCapability, type Capability } from "./policies";
import type {
  ActorSnapshot,
  GovernanceState,
  ScreenId,
  ScreenReviewStatus,
  ScreenVersionId,
  ScreenVersionRecord,
} from "./types";

export type ApprovalProgress = {
  approvedCount: number;
  totalRequired: number;
  remainingCount: number;
  percent: number;
};

function compareEvents(a: GovernanceEvent, b: GovernanceEvent): number {
  if (a.occurredAt < b.occurredAt) return -1;
  if (a.occurredAt > b.occurredAt) return 1;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

export function selectChronologicalEvents(
  state: GovernanceState,
): readonly GovernanceEvent[] {
  return [...state.events].sort(compareEvents);
}

export function selectEventsForScreen(
  state: GovernanceState,
  screenId: ScreenId,
): readonly GovernanceEvent[] {
  return selectChronologicalEvents(state).filter(
    (event) => event.screenId === screenId,
  );
}

export function selectCurrentScreenVersion(
  state: GovernanceState,
  screenId: ScreenId,
): ScreenVersionRecord | undefined {
  const versions = state.screenVersions[screenId];
  if (!versions || versions.length === 0) {
    return undefined;
  }

  let current = versions[0];
  if (!current) {
    return undefined;
  }

  for (let index = 1; index < versions.length; index += 1) {
    const candidate = versions[index];
    if (!candidate) continue;
    if (
      candidate.sequence > current.sequence ||
      (candidate.sequence === current.sequence && candidate.id > current.id)
    ) {
      current = candidate;
    }
  }

  return current;
}

function eventsForVersion(
  state: GovernanceState,
  screenId: ScreenId,
  screenVersionId: ScreenVersionId,
): readonly GovernanceEvent[] {
  return selectChronologicalEvents(state).filter(
    (event) =>
      event.screenId === screenId && event.screenVersionId === screenVersionId,
  );
}

/**
 * Derive review status for the current screen version only.
 *
 * Fold rules:
 * - no events + baseline => not_reviewed
 * - no events + regenerated => ready_for_review
 * - approved (latest effective) => approved
 * - revision_requested (latest, no later approval) => changes_requested
 * - regeneration_started (no later result) => regenerating
 * - regeneration_failed => prior non-approved status for that version
 */
export function selectScreenStatus(
  state: GovernanceState,
  screenId: ScreenId,
): ScreenReviewStatus {
  const current = selectCurrentScreenVersion(state, screenId);
  if (!current) {
    return "not_reviewed";
  }

  const versionEvents = eventsForVersion(state, screenId, current.id);
  let status: ScreenReviewStatus =
    current.source === "regenerated" ? "ready_for_review" : "not_reviewed";
  let statusBeforeRegeneration: ScreenReviewStatus = status;

  for (const event of versionEvents) {
    switch (event.type) {
      case "screen.approved":
        status = "approved";
        break;
      case "screen.revision_requested":
        status = "changes_requested";
        statusBeforeRegeneration = "changes_requested";
        break;
      case "screen.regeneration_started":
        if (status !== "regenerating") {
          statusBeforeRegeneration =
            status === "approved"
              ? current.source === "regenerated"
                ? "ready_for_review"
                : "not_reviewed"
              : status;
        }
        status = "regenerating";
        break;
      case "screen.regeneration_failed":
        status = statusBeforeRegeneration;
        break;
      case "screen.regenerated":
        // Event belongs to the previous version identity; current version
        // advances via screenVersions. No status change on this version.
        break;
      default: {
        const _exhaustive: never = event;
        void _exhaustive;
        break;
      }
    }
  }

  return status;
}

export function selectIsScreenApproved(
  state: GovernanceState,
  screenId: ScreenId,
): boolean {
  return selectScreenStatus(state, screenId) === "approved";
}

export function selectApprovalProgress(
  state: GovernanceState,
): ApprovalProgress {
  const totalRequired = state.requiredScreenIds.length;
  let approvedCount = 0;

  for (const screenId of state.requiredScreenIds) {
    if (selectIsScreenApproved(state, screenId)) {
      approvedCount += 1;
    }
  }

  const remainingCount = totalRequired - approvedCount;
  const percent =
    totalRequired === 0 ? 0 : Math.round((approvedCount / totalRequired) * 100);

  return {
    approvedCount,
    totalRequired,
    remainingCount,
    percent,
  };
}

export function selectIsGateComplete(state: GovernanceState): boolean {
  if (state.requiredScreenIds.length === 0) {
    return false;
  }
  return state.requiredScreenIds.every((screenId) =>
    selectIsScreenApproved(state, screenId),
  );
}

export function selectLatestRevisionRequest(
  state: GovernanceState,
  screenId: ScreenId,
): Extract<GovernanceEvent, { type: "screen.revision_requested" }> | undefined {
  const current = selectCurrentScreenVersion(state, screenId);
  if (!current) {
    return undefined;
  }

  const events = eventsForVersion(state, screenId, current.id);
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === "screen.revision_requested") {
      return event;
    }
  }
  return undefined;
}

function selectHasCapability(
  actor: ActorSnapshot,
  capability: Capability,
): boolean {
  return hasCapability(actor.role, capability);
}

export function selectCanApprove(actor: ActorSnapshot): boolean {
  return selectHasCapability(actor, "screen.approve");
}

export function selectCanRequestRevision(actor: ActorSnapshot): boolean {
  return selectHasCapability(actor, "screen.requestRevision");
}

export function selectCanRegenerate(actor: ActorSnapshot): boolean {
  return selectHasCapability(actor, "screen.regenerate");
}
