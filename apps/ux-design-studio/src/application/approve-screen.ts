import {
  appendGovernanceEvent,
  assertCapability,
  createApproveScreenEvent,
  selectIsScreenApproved,
  type ActorSnapshot,
  type GovernanceError,
  type GovernanceState,
  type ScreenApprovedEvent,
  type ScreenId,
  type ScreenVersionId,
} from "../domain/governance";
import type { Clock } from "../ports/clock";
import type { IdGenerator } from "../ports/id-generator";
import type { SpecGovernanceContext } from "./governance-session";

export type ApproveScreenInput = SpecGovernanceContext & {
  screenId: ScreenId;
  expectedScreenVersionId: ScreenVersionId;
  actor: ActorSnapshot;
  comment?: string;
};

export type ApproveScreenPorts = {
  clock: Clock;
  idGenerator: IdGenerator;
};

export type ApproveScreenSuccess = {
  ok: true;
  state: GovernanceState;
  event: ScreenApprovedEvent;
};

export type ApproveScreenFailure = {
  ok: false;
  error: GovernanceError;
};

export type ApproveScreenResult = ApproveScreenSuccess | ApproveScreenFailure;

/**
 * Version-bound screen approval use case.
 * Asserts capability, creates a domain event, appends immutably.
 * Never mutates UXSpec.
 */
export function approveScreen(
  state: GovernanceState,
  input: ApproveScreenInput,
  ports: ApproveScreenPorts,
): ApproveScreenResult {
  const capability = assertCapability(input.actor.role, "screen.approve");
  if (!capability.ok) {
    return { ok: false, error: capability.error };
  }

  if (selectIsScreenApproved(state, input.screenId)) {
    return {
      ok: false,
      error: {
        code: "INVALID_COMMAND",
        message: "Current screen version is already approved.",
      },
    };
  }

  const command = {
    projectId: input.projectId,
    specId: input.specId,
    specVersion: input.specVersion,
    baselineVersion: input.baselineVersion,
    screenId: input.screenId,
    expectedScreenVersionId: input.expectedScreenVersionId,
    actor: input.actor,
    ...(input.comment !== undefined ? { comment: input.comment } : {}),
  };

  const eventResult = createApproveScreenEvent(state, command, ports);
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
