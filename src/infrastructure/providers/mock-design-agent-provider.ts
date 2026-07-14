import type {
  DesignAgentProvider,
  RegenerateScreenRequest,
  RegenerateScreenResult,
} from "../../ports/design-agent-provider";
import type { Clock } from "../../ports/clock";
import type { IdGenerator } from "../../ports/id-generator";
import {
  AGENTPILOT_DASHBOARD_V2_CONTENT_REF,
  DASHBOARD_REGENERATION_TARGET_SCREEN_ID,
  agentPilotDashboardVariantV2,
} from "../seed/agentpilot-variants";

export const MOCK_DESIGN_AGENT_LATENCY_MS = 900;

export type MockDesignAgentProviderOptions = {
  clock: Clock;
  idGenerator: IdGenerator;
  latencyMs?: number;
  /** When true, the next regenerateScreen call fails once, then clears. */
  controlledFailure?: boolean;
};

export class MockDesignAgentProviderError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MockDesignAgentProviderError";
    this.code = code;
  }
}

/**
 * Deterministic mock DesignAgentProvider.
 * No network, no secrets, no real LLM.
 */
export class MockDesignAgentProvider implements DesignAgentProvider {
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;
  private readonly latencyMs: number;
  private failNextCall: boolean;

  constructor(options: MockDesignAgentProviderOptions) {
    this.clock = options.clock;
    this.idGenerator = options.idGenerator;
    this.latencyMs = options.latencyMs ?? MOCK_DESIGN_AGENT_LATENCY_MS;
    this.failNextCall = options.controlledFailure === true;
  }

  /** Arm a one-shot controlled failure for the next request only. */
  setControlledFailure(enabled: boolean): void {
    this.failNextCall = enabled;
  }

  getControlledFailureArmed(): boolean {
    return this.failNextCall;
  }

  async regenerateScreen(
    request: RegenerateScreenRequest,
    signal?: AbortSignal,
  ): Promise<RegenerateScreenResult> {
    if (signal?.aborted) {
      throw createAbortError();
    }

    await delay(this.latencyMs, signal);

    if (this.failNextCall) {
      this.failNextCall = false;
      throw new MockDesignAgentProviderError(
        "MOCK_PROVIDER_FAILURE",
        "Simulated controlled provider failure.",
      );
    }

    if (request.screen.id !== DASHBOARD_REGENERATION_TARGET_SCREEN_ID) {
      throw new MockDesignAgentProviderError(
        "UNSUPPORTED_SCREEN",
        `Mock provider only regenerates "${DASHBOARD_REGENERATION_TARGET_SCREEN_ID}".`,
      );
    }

    const providerRequestId = this.idGenerator.next("provider-req");

    return {
      providerRequestId,
      generatedAt: this.clock.now(),
      screen: agentPilotDashboardVariantV2,
      contentRef: AGENTPILOT_DASHBOARD_V2_CONTENT_REF,
      explanation: [
        "Applied structured revision to Dashboard priority layout.",
        `Category: ${request.revision.category}`,
      ],
    };
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(createAbortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function createAbortError(): Error {
  const error = new Error("Regeneration cancelled.");
  error.name = "AbortError";
  return error;
}
