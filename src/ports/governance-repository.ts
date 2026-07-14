import type { GovernanceState } from "../domain/governance";

/**
 * Persistence port for governance state.
 * Domain modules never import adapters; US-4.2 uses an in-memory implementation.
 */
export interface GovernanceRepository {
  load(): Promise<GovernanceState> | GovernanceState;
  save(state: GovernanceState): Promise<void> | void;
  reset?(): Promise<void> | void;
}
