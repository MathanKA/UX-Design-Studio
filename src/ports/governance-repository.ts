import type { GovernanceState } from "../domain/governance";

export type GovernanceLoadFailureReason =
  | "corrupt"
  | "mismatch"
  | "unavailable";

export type GovernanceLoadResult =
  | { ok: true; state: GovernanceState }
  | {
      ok: false;
      reason: GovernanceLoadFailureReason;
      fallbackState: GovernanceState;
    };

export type GovernanceSaveResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" };

/**
 * Persistence port for governance state.
 * Adapters validate untrusted storage envelopes; domain never imports them.
 */
export interface GovernanceRepository {
  load(): Promise<GovernanceLoadResult> | GovernanceLoadResult;
  save(state: GovernanceState): Promise<GovernanceSaveResult> | GovernanceSaveResult;
  /** Remove managed persistence only — never clear unrelated browser storage. */
  reset(): Promise<void> | void;
}
