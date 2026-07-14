import type { GovernanceState } from "../../domain/governance";
import type {
  GovernanceLoadResult,
  GovernanceRepository,
  GovernanceSaveResult,
} from "../../ports/governance-repository";

/**
 * Sync in-memory governance store for tests and storage fallbacks.
 */
export class InMemoryGovernanceRepository implements GovernanceRepository {
  private state: GovernanceState;

  constructor(initial: GovernanceState) {
    this.state = cloneState(initial);
  }

  load(): GovernanceLoadResult {
    return { ok: true, state: cloneState(this.state) };
  }

  save(state: GovernanceState): GovernanceSaveResult {
    this.state = cloneState(state);
    return { ok: true };
  }

  reset(): void {
    this.state = {
      schemaVersion: 1,
      requiredScreenIds: [...this.state.requiredScreenIds],
      events: [],
      screenVersions: Object.fromEntries(
        Object.entries(this.state.screenVersions).map(([screenId, versions]) => [
          screenId,
          versions.filter((entry) => entry.source === "baseline"),
        ]),
      ),
    };
  }
}

function cloneState(state: GovernanceState): GovernanceState {
  return {
    schemaVersion: 1,
    requiredScreenIds: [...state.requiredScreenIds],
    events: [...state.events],
    screenVersions: Object.fromEntries(
      Object.entries(state.screenVersions).map(([screenId, versions]) => [
        screenId,
        versions.map((entry) => ({ ...entry })),
      ]),
    ),
  };
}
