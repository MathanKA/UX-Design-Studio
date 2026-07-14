import type { ScreenContentResolver } from "../application/screen-version-content";
import {
  armControlledProviderFailure,
  createDefaultGovernanceDeps,
  type DefaultGovernanceDeps,
} from "../infrastructure/providers/create-default-governance-deps";
import type { Clock } from "../ports/clock";
import type { DesignAgentProvider } from "../ports/design-agent-provider";
import type { IdGenerator } from "../ports/id-generator";

export type { DefaultGovernanceDeps };
export { armControlledProviderFailure, createDefaultGovernanceDeps };

/**
 * App-facing re-export of composition defaults.
 */
export function createAppGovernanceDeps(options: {
  clock: Clock;
  idGenerator: IdGenerator;
}): {
  designAgentProvider: DesignAgentProvider;
  contentRegistry: ScreenContentResolver;
} {
  return createDefaultGovernanceDeps(options);
}
