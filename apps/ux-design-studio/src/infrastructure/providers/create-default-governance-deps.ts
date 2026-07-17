import type { ScreenContentResolver } from "../../application/screen-version-content";
import { createAgentPilotContentRegistry } from "../seed";
import type { Clock } from "../../ports/clock";
import type { DesignAgentProvider } from "../../ports/design-agent-provider";
import type { IdGenerator } from "../../ports/id-generator";
import { MockDesignAgentProvider } from "./mock-design-agent-provider";

export type DefaultGovernanceDeps = {
  designAgentProvider: DesignAgentProvider;
  contentRegistry: ScreenContentResolver;
};

/**
 * Composition-root defaults for DesignAgentProvider + content registry.
 * Feature views depend on the port, not this factory.
 */
export function createDefaultGovernanceDeps(options: {
  clock: Clock;
  idGenerator: IdGenerator;
}): DefaultGovernanceDeps {
  return {
    designAgentProvider: new MockDesignAgentProvider({
      clock: options.clock,
      idGenerator: options.idGenerator,
    }),
    contentRegistry: createAgentPilotContentRegistry(),
  };
}

export function armControlledProviderFailure(
  provider: DesignAgentProvider,
  armed: boolean,
): void {
  if (
    "setControlledFailure" in provider &&
    typeof provider.setControlledFailure === "function"
  ) {
    (
      provider as { setControlledFailure: (value: boolean) => void }
    ).setControlledFailure(armed);
  }
}
