import type { DemoRole } from "./types";
import {
  governanceErr,
  governanceOk,
  type GovernanceResult,
} from "./governance-errors";

/**
 * Capability model from architecture §18, extended with mission view
 * capabilities (spec.view, preview.view) for later UI stories.
 */
export type Capability =
  | "spec.view"
  | "preview.view"
  | "audit.view"
  | "screen.view"
  | "screen.approve"
  | "screen.requestRevision"
  | "screen.regenerate";

const VIEW_CAPABILITIES = [
  "spec.view",
  "preview.view",
  "audit.view",
  "screen.view",
] as const satisfies readonly Capability[];

const APPROVER_CAPABILITIES = [
  ...VIEW_CAPABILITIES,
  "screen.approve",
  "screen.requestRevision",
  "screen.regenerate",
] as const satisfies readonly Capability[];

const ROLE_CAPABILITIES: Record<DemoRole, readonly Capability[]> = {
  approver: APPROVER_CAPABILITIES,
  reviewer: VIEW_CAPABILITIES,
  viewer: VIEW_CAPABILITIES,
};

export function capabilitiesForRole(role: DemoRole): readonly Capability[] {
  return ROLE_CAPABILITIES[role];
}

export function hasCapability(role: DemoRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function assertCapability(
  role: DemoRole,
  capability: Capability,
): GovernanceResult<true> {
  if (!hasCapability(role, capability)) {
    return governanceErr(
      "CAPABILITY_DENIED",
      `Role "${role}" lacks capability "${capability}".`,
    );
  }
  return governanceOk(true);
}
