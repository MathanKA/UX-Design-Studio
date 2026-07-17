import type { UXSpec } from "../domain/ux-spec";
import {
  createInitialGovernanceState,
  type ActorSnapshot,
  type GovernanceState,
} from "../domain/governance";

/** Deterministic Demo Approver used by default in product composition. */
export const DEMO_APPROVER: ActorSnapshot = {
  id: "demo-approver",
  role: "approver",
  displayLabel: "Demo Approver",
};

/** Deterministic demo Reviewer. Read-only for approve/revise/regenerate. */
export const DEMO_REVIEWER: ActorSnapshot = {
  id: "demo-reviewer",
  role: "reviewer",
  displayLabel: "Demo Reviewer",
};

/** Deterministic demo Viewer. Read-only for approve/revise/regenerate. */
export const DEMO_VIEWER: ActorSnapshot = {
  id: "demo-viewer",
  role: "viewer",
  displayLabel: "Demo Viewer",
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
