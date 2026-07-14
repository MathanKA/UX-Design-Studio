import type { UXSpec } from "../domain/ux-spec";
import {
  createInitialGovernanceState,
  type ActorSnapshot,
  type DemoRole,
  type GovernanceState,
} from "../domain/governance";

/** Deterministic demo Approver. Default actor for the POC role switcher. */
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

/** All POC demo actors. Separate from UXSpec personas (Alex/Jordan/Taylor). */
export const DEMO_ACTORS = [
  DEMO_APPROVER,
  DEMO_REVIEWER,
  DEMO_VIEWER,
] as const satisfies readonly ActorSnapshot[];

const DEMO_ACTORS_BY_ROLE: Record<DemoRole, ActorSnapshot> = {
  approver: DEMO_APPROVER,
  reviewer: DEMO_REVIEWER,
  viewer: DEMO_VIEWER,
};

export function demoActorForRole(role: DemoRole): ActorSnapshot {
  return DEMO_ACTORS_BY_ROLE[role];
}

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
