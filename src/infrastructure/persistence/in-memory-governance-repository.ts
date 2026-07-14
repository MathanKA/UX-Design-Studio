import type { GovernanceState } from "../../domain/governance";
import type { GovernanceRepository } from "../../ports/governance-repository";

/**
 * Sync in-memory governance store for US-4.2.
 * localStorage persistence lands in US-4.4 behind the same port.
 */
export class InMemoryGovernanceRepository implements GovernanceRepository {
  private state: GovernanceState;

  constructor(initial: GovernanceState) {
    this.state = cloneState(initial);
  }

  load(): GovernanceState {
    return cloneState(this.state);
  }

  save(state: GovernanceState): void {
    this.state = cloneState(state);
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
