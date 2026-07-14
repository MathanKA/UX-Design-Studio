import {
  appendGovernanceEvent,
  assertCapability,
  createBeginRegenerationEvent,
  createRegeneratedEvent,
  createRegenerationFailedEvent,
  selectCurrentScreenVersion,
  selectLatestRevisionRequest,
  type ActorSnapshot,
  type GovernanceError,
  type GovernanceState,
  type ScreenId,
  type ScreenRegeneratedEvent,
  type ScreenRegenerationFailedEvent,
  type ScreenRegenerationStartedEvent,
  type ScreenVersionId,
  type ScreenVersionRecord,
} from "../domain/governance";
import { loadScreenSpec } from "../domain/ux-spec";
import type { ScreenSpec, UXSpec } from "../domain/ux-spec";
import type { Clock } from "../ports/clock";
import type { DesignAgentProvider } from "../ports/design-agent-provider";
import type { IdGenerator } from "../ports/id-generator";
import type { SpecGovernanceContext } from "./governance-session";
import {
  resolveScreenVersionContent,
  type ScreenContentResolver,
} from "./screen-version-content";

export const REGENERATION_CANCELLED_CODE = "PROVIDER_CANCELLED";
export const REGENERATION_PROVIDER_FAILED_CODE = "MOCK_PROVIDER_FAILURE";

export type RegenerateScreenInput = SpecGovernanceContext & {
  screenId: ScreenId;
  expectedScreenVersionId: ScreenVersionId;
  actor: ActorSnapshot;
  signal?: AbortSignal;
};

export type RegenerateScreenPorts = {
  clock: Clock;
  idGenerator: IdGenerator;
  provider: DesignAgentProvider;
  seed: UXSpec;
  contentRegistry: ScreenContentResolver;
};

export type RegenerateScreenSuccess = {
  ok: true;
  outcome: "activated";
  state: GovernanceState;
  startedEvent: ScreenRegenerationStartedEvent;
  regeneratedEvent: ScreenRegeneratedEvent;
  version: ScreenVersionRecord;
  screen: ScreenSpec;
};

export type RegenerateScreenCancelled = {
  ok: false;
  outcome: "cancelled";
  state: GovernanceState;
  startedEvent: ScreenRegenerationStartedEvent;
  failedEvent: ScreenRegenerationFailedEvent;
  error: GovernanceError;
};

export type RegenerateScreenFailed = {
  ok: false;
  outcome: "failed";
  state: GovernanceState;
  startedEvent?: ScreenRegenerationStartedEvent;
  failedEvent?: ScreenRegenerationFailedEvent;
  error: GovernanceError;
};

export type RegenerateScreenResult =
  | RegenerateScreenSuccess
  | RegenerateScreenCancelled
  | RegenerateScreenFailed;

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "AbortError"
  );
}

function providerFailureMessage(error: unknown): {
  code: string;
  message: string;
} {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return {
      code: (error as { code: string }).code,
      message: (error as { message: string }).message,
    };
  }
  if (error instanceof Error) {
    return {
      code: REGENERATION_PROVIDER_FAILED_CODE,
      message: error.message,
    };
  }
  return {
    code: REGENERATION_PROVIDER_FAILED_CODE,
    message: "Provider regeneration failed.",
  };
}

async function appendFailure(
  state: GovernanceState,
  input: RegenerateScreenInput,
  ports: Pick<RegenerateScreenPorts, "clock" | "idGenerator">,
  failureCode: string,
  message: string,
): Promise<{
  state: GovernanceState;
  failedEvent: ScreenRegenerationFailedEvent;
}> {
  const failedResult = createRegenerationFailedEvent(
    state,
    {
      projectId: input.projectId,
      specId: input.specId,
      specVersion: input.specVersion,
      baselineVersion: input.baselineVersion,
      screenId: input.screenId,
      expectedScreenVersionId: input.expectedScreenVersionId,
      actor: input.actor,
      failureCode,
      message,
    },
    ports,
  );
  if (!failedResult.ok) {
    throw new Error(failedResult.error.message);
  }
  const appendResult = appendGovernanceEvent(state, failedResult.value);
  if (!appendResult.ok) {
    throw new Error(appendResult.error.message);
  }
  return { state: appendResult.state, failedEvent: failedResult.value };
}

export function rejectIfStaleAsyncCompletion(
  state: GovernanceState,
  screenId: ScreenId,
  expectedScreenVersionId: ScreenVersionId,
): GovernanceError | null {
  const stillCurrent = selectCurrentScreenVersion(state, screenId);
  if (!stillCurrent || stillCurrent.id !== expectedScreenVersionId) {
    return {
      code: "STALE_ASYNC_COMPLETION",
      message: "Stale asynchronous provider completion was rejected.",
    };
  }
  return null;
}

/**
 * Provider-bound screen regeneration use case.
 * Requires latest current-version revision; validates provider output;
 * activates event+version atomically; rejects stale async completions.
 */
export async function regenerateScreen(
  state: GovernanceState,
  input: RegenerateScreenInput,
  ports: RegenerateScreenPorts,
): Promise<RegenerateScreenResult> {
  const capability = assertCapability(input.actor.role, "screen.regenerate");
  if (!capability.ok) {
    return { ok: false, outcome: "failed", state, error: capability.error };
  }

  const current = selectCurrentScreenVersion(state, input.screenId);
  if (!current) {
    return {
      ok: false,
      outcome: "failed",
      state,
      error: {
        code: "MISSING_SCREEN_VERSION",
        message: `No screen version exists for "${input.screenId}".`,
      },
    };
  }

  if (current.id !== input.expectedScreenVersionId) {
    return {
      ok: false,
      outcome: "failed",
      state,
      error: {
        code: "STALE_SCREEN_VERSION",
        message: `Expected current version "${input.expectedScreenVersionId}" but current is "${current.id}".`,
      },
    };
  }

  const revision = selectLatestRevisionRequest(state, input.screenId);
  if (!revision || revision.screenVersionId !== current.id) {
    return {
      ok: false,
      outcome: "failed",
      state,
      error: {
        code: "INVALID_REVISION_REFERENCE",
        message:
          "Regeneration requires the latest structured revision for the current screen version.",
      },
    };
  }

  const currentContent = resolveScreenVersionContent({
    version: current,
    seed: ports.seed,
    contentRegistry: ports.contentRegistry,
  });
  if (!currentContent.ok) {
    return {
      ok: false,
      outcome: "failed",
      state,
      error: {
        code: "INVALID_COMMAND",
        message: "Unable to resolve current screen content for regeneration.",
      },
    };
  }

  const requestId = ports.idGenerator.next("regen-req");
  const startedResult = createBeginRegenerationEvent(
    state,
    {
      projectId: input.projectId,
      specId: input.specId,
      specVersion: input.specVersion,
      baselineVersion: input.baselineVersion,
      screenId: input.screenId,
      expectedScreenVersionId: input.expectedScreenVersionId,
      actor: input.actor,
      requestId,
      correlationId: revision.id,
    },
    { clock: ports.clock, idGenerator: ports.idGenerator },
  );
  if (!startedResult.ok) {
    return {
      ok: false,
      outcome: "failed",
      state,
      error: startedResult.error,
    };
  }

  const startedAppend = appendGovernanceEvent(state, startedResult.value);
  if (!startedAppend.ok) {
    return {
      ok: false,
      outcome: "failed",
      state,
      error: startedAppend.error,
    };
  }

  const workingState = startedAppend.state;
  const startedEvent = startedResult.value;

  try {
    const providerResult = await ports.provider.regenerateScreen(
      {
        projectId: input.projectId,
        specId: input.specId,
        specVersion: input.specVersion,
        baselineVersion: input.baselineVersion,
        screen: currentContent.screen,
        currentVersionId: current.id,
        revision: {
          affectedNodeIds: revision.payload.affectedNodeIds,
          category: revision.payload.category,
          description: revision.payload.description,
        },
      },
      input.signal,
    );

    const staleError = rejectIfStaleAsyncCompletion(
      workingState,
      input.screenId,
      input.expectedScreenVersionId,
    );
    if (staleError) {
      const staleAppend = await appendFailure(
        workingState,
        input,
        ports,
        "STALE_ASYNC_COMPLETION",
        staleError.message,
      );
      return {
        ok: false,
        outcome: "failed",
        state: staleAppend.state,
        startedEvent,
        failedEvent: staleAppend.failedEvent,
        error: staleError,
      };
    }

    const validated = loadScreenSpec(providerResult.screen, {
      expectedScreenId: input.screenId,
      knownPersonaIds: new Set(ports.seed.personas.map((persona) => persona.id)),
    });
    if (!validated.ok) {
      const invalidAppend = await appendFailure(
        workingState,
        input,
        ports,
        "INVALID_PROVIDER_OUTPUT",
        validated.issues.map((issue) => issue.message).join("; "),
      );
      return {
        ok: false,
        outcome: "failed",
        state: invalidAppend.state,
        startedEvent,
        failedEvent: invalidAppend.failedEvent,
        error: {
          code: "INVALID_PROVIDER_OUTPUT",
          message: "Provider output failed shared ScreenSpec validation.",
        },
      };
    }

    const contentRef = providerResult.contentRef.trim();
    if (!contentRef) {
      const missingAppend = await appendFailure(
        workingState,
        input,
        ports,
        "MISSING_CONTENT_REF",
        "Provider output did not include a contentRef.",
      );
      return {
        ok: false,
        outcome: "failed",
        state: missingAppend.state,
        startedEvent,
        failedEvent: missingAppend.failedEvent,
        error: {
          code: "MISSING_CONTENT_REF",
          message: "Provider output did not include a contentRef.",
        },
      };
    }

    if (!ports.contentRegistry.resolve(contentRef)) {
      const unresolvedAppend = await appendFailure(
        workingState,
        input,
        ports,
        "INVALID_PROVIDER_OUTPUT",
        `Unknown contentRef "${contentRef}".`,
      );
      return {
        ok: false,
        outcome: "failed",
        state: unresolvedAppend.state,
        startedEvent,
        failedEvent: unresolvedAppend.failedEvent,
        error: {
          code: "INVALID_PROVIDER_OUTPUT",
          message: `Unknown contentRef "${contentRef}".`,
        },
      };
    }

    const regenerated = createRegeneratedEvent(
      workingState,
      {
        projectId: input.projectId,
        specId: input.specId,
        specVersion: input.specVersion,
        baselineVersion: input.baselineVersion,
        screenId: input.screenId,
        expectedScreenVersionId: input.expectedScreenVersionId,
        actor: input.actor,
        revisionEventId: revision.id,
        provider: "mock",
        contentRef,
        providerRequestId: providerResult.providerRequestId,
        ...(providerResult.explanation !== undefined
          ? { explanation: providerResult.explanation }
          : {}),
      },
      { clock: ports.clock, idGenerator: ports.idGenerator },
    );
    if (!regenerated.ok) {
      return {
        ok: false,
        outcome: "failed",
        state: workingState,
        startedEvent,
        error: regenerated.error,
      };
    }

    const activated = appendGovernanceEvent(
      workingState,
      regenerated.value.event,
    );
    if (!activated.ok) {
      return {
        ok: false,
        outcome: "failed",
        state: workingState,
        startedEvent,
        error: activated.error,
      };
    }

    return {
      ok: true,
      outcome: "activated",
      state: activated.state,
      startedEvent,
      regeneratedEvent: regenerated.value.event,
      version: regenerated.value.version,
      screen: validated.screen,
    };
  } catch (error) {
    if (isAbortError(error) || input.signal?.aborted) {
      const cancelled = await appendFailure(
        workingState,
        input,
        ports,
        REGENERATION_CANCELLED_CODE,
        "Regeneration was cancelled.",
      );
      return {
        ok: false,
        outcome: "cancelled",
        state: cancelled.state,
        startedEvent,
        failedEvent: cancelled.failedEvent,
        error: {
          code: "INVALID_COMMAND",
          message: "Regeneration was cancelled.",
        },
      };
    }

    const failure = providerFailureMessage(error);
    const failed = await appendFailure(
      workingState,
      input,
      ports,
      failure.code,
      failure.message,
    );
    return {
      ok: false,
      outcome: "failed",
      state: failed.state,
      startedEvent,
      failedEvent: failed.failedEvent,
      error: {
        code: "INVALID_COMMAND",
        message: failure.message,
      },
    };
  }
}
