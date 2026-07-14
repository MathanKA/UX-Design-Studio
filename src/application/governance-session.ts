import type { UXSpec } from "../domain/ux-spec";
import {
  createInitialGovernanceState,
  type ActorSnapshot,
  type GovernanceState,
} from "../domain/governance";

/** Deterministic default demo Approver for US-4.2. Full role switcher is US-4.3. */
export const DEMO_APPROVER: ActorSnapshot = {
  id: "demo-approver",
  role: "approver",
  displayLabel: "Demo Approver",
};

/**
 * Build baseline governance state for every screen in a validated UXSpec.
 * Does not mutate the UXSpec.
 */
export function createGovernanceStateFromSpec(
  spec: UXSpec,
  createdAt: string,
): GovernanceState {
  return createInitialGovernanceState({
    projectId: spec.projectId,
    specId: spec.id,
    specVersion: spec.version,
    baselineVersion: spec.baselineVersion,
    requiredScreenIds: spec.screens.map((screen) => screen.id),
    createdAt,
  });
}

export type SpecGovernanceContext = {
  projectId: string;
  specId: string;
  specVersion: string;
  baselineVersion: string;
};

export function specGovernanceContext(spec: UXSpec): SpecGovernanceContext {
  return {
    projectId: spec.projectId,
    specId: spec.id,
    specVersion: spec.version,
    baselineVersion: spec.baselineVersion,
  };
}
