import {
  appendGovernanceEvent,
  assertCapability,
  createRequestRevisionEvent,
  GOVERNANCE_LIMITS,
  REVISION_CATEGORIES,
  type ActorSnapshot,
  type ComponentNodeId,
  type GovernanceError,
  type GovernanceState,
  type RevisionCategory,
  type RevisionRequestedEvent,
  type ScreenId,
  type ScreenVersionId,
} from "../domain/governance";
import {
  collectScreenNodeIds,
  type ComponentNode,
} from "../domain/ux-spec";
import type { Clock } from "../ports/clock";
import type { IdGenerator } from "../ports/id-generator";
import type { SpecGovernanceContext } from "./governance-session";

/** Minimum useful trimmed description length for structured revisions. */
export const MIN_REVISION_DESCRIPTION_LENGTH = 8;

export type RequestRevisionInput = SpecGovernanceContext & {
  screenId: ScreenId;
  expectedScreenVersionId: ScreenVersionId;
  actor: ActorSnapshot;
  affectedNodeIds: readonly ComponentNodeId[];
  category: RevisionCategory;
  description: string;
  /** Active screen component tree used for membership validation. */
  screenRoot: ComponentNode;
};

export type RequestRevisionPorts = {
  clock: Clock;
  idGenerator: IdGenerator;
};

export type RequestRevisionSuccess = {
  ok: true;
  state: GovernanceState;
  event: RevisionRequestedEvent;
};

export type RequestRevisionFailure = {
  ok: false;
  error: GovernanceError;
};

export type RequestRevisionResult =
  | RequestRevisionSuccess
  | RequestRevisionFailure;

function isRevisionCategory(value: string): value is RevisionCategory {
  return (REVISION_CATEGORIES as readonly string[]).includes(value);
}

function validateAffectedNodeIds(
  affectedNodeIds: readonly ComponentNodeId[],
  screenRoot: ComponentNode,
):
  | { ok: true; value: readonly ComponentNodeId[] }
  | RequestRevisionFailure {
  if (affectedNodeIds.length === 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_COMMAND",
        message: "At least one affected node is required.",
      },
    };
  }

  if (affectedNodeIds.length > GOVERNANCE_LIMITS.maxAffectedNodes) {
    return {
      ok: false,
      error: {
        code: "INVALID_COMMAND",
        message: `affectedNodeIds exceeds ${GOVERNANCE_LIMITS.maxAffectedNodes} entries.`,
      },
    };
  }

  const unique = new Set(affectedNodeIds);
  if (unique.size !== affectedNodeIds.length) {
    return {
      ok: false,
      error: {
        code: "INVALID_COMMAND",
        message: "affectedNodeIds must not contain duplicates.",
      },
    };
  }

  const allowed = collectScreenNodeIds(screenRoot);
  for (const nodeId of affectedNodeIds) {
    if (!allowed.has(nodeId)) {
      return {
        ok: false,
        error: {
          code: "INVALID_COMMAND",
          message: `Node "${nodeId}" is not part of the active screen tree.`,
        },
      };
    }
  }

  return { ok: true, value: affectedNodeIds };
}

function validateDescription(
  description: string,
): { ok: true; value: string } | RequestRevisionFailure {
  const trimmed = description.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_COMMAND",
        message: "Revision description is required.",
      },
    };
  }
  if (trimmed.length < MIN_REVISION_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: {
        code: "INVALID_COMMAND",
        message: `Revision description must be at least ${MIN_REVISION_DESCRIPTION_LENGTH} characters.`,
      },
    };
  }
  if (trimmed.length > GOVERNANCE_LIMITS.maxDescriptionLength) {
    return {
      ok: false,
      error: {
        code: "INVALID_COMMAND",
        message: `Description exceeds ${GOVERNANCE_LIMITS.maxDescriptionLength} characters.`,
      },
    };
  }
  return { ok: true, value: trimmed };
}

/**
 * Structured revision request use case.
 * Asserts capability, validates active-screen node membership, appends one event.
 * Never mutates UXSpec. Unauthorized actors append no events.
 */
export function requestRevision(
  state: GovernanceState,
  input: RequestRevisionInput,
  ports: RequestRevisionPorts,
): RequestRevisionResult {
  const capability = assertCapability(
    input.actor.role,
    "screen.requestRevision",
  );
  if (!capability.ok) {
    return { ok: false, error: capability.error };
  }

  if (!isRevisionCategory(input.category)) {
    return {
      ok: false,
      error: {
        code: "INVALID_COMMAND",
        message: "Revision category is not allowlisted.",
      },
    };
  }

  const nodesResult = validateAffectedNodeIds(
    input.affectedNodeIds,
    input.screenRoot,
  );
  if (!nodesResult.ok) {
    return nodesResult;
  }

  const descriptionResult = validateDescription(input.description);
  if (!descriptionResult.ok) {
    return descriptionResult;
  }

  const command = {
    projectId: input.projectId,
    specId: input.specId,
    specVersion: input.specVersion,
    baselineVersion: input.baselineVersion,
    screenId: input.screenId,
    expectedScreenVersionId: input.expectedScreenVersionId,
    actor: input.actor,
    affectedNodeIds: nodesResult.value,
    category: input.category,
    description: descriptionResult.value,
  };

  const eventResult = createRequestRevisionEvent(state, command, ports);
  if (!eventResult.ok) {
    return { ok: false, error: eventResult.error };
  }

  const appendResult = appendGovernanceEvent(state, eventResult.value);
  if (!appendResult.ok) {
    return { ok: false, error: appendResult.error };
  }

  return {
    ok: true,
    state: appendResult.state,
    event: eventResult.value,
  };
}
