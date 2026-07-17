import type { GovernanceEvent } from "./events";
import type {
  ProjectId,
  ScreenId,
  ScreenVersionRecord,
  SpecId,
  GovernanceState,
} from "./types";
import { baselineScreenVersionId } from "./types";

export type { GovernanceState } from "./types";

export type InitializeBaselineScreenVersionsInput = {
  projectId: ProjectId;
  specId: SpecId;
  specVersion: string;
  baselineVersion: string;
  requiredScreenIds: readonly ScreenId[];
  createdAt: string;
};

/**
 * Creates deterministic baseline ScreenVersionRecord entries for every
 * required screen. IDs follow `sv-${screenId}-baseline`.
 */
export function initializeBaselineScreenVersions(
  input: InitializeBaselineScreenVersionsInput,
): Readonly<Record<ScreenId, readonly ScreenVersionRecord[]>> {
  const screenVersions: Record<ScreenId, readonly ScreenVersionRecord[]> = {};

  for (const screenId of input.requiredScreenIds) {
    const record: ScreenVersionRecord = {
      id: baselineScreenVersionId(screenId),
      screenId,
      projectId: input.projectId,
      specId: input.specId,
      specVersion: input.specVersion,
      baselineVersion: input.baselineVersion,
      sequence: 1,
      source: "baseline",
      createdAt: input.createdAt,
    };
    screenVersions[screenId] = [record];
  }

  return screenVersions;
}

export type CreateInitialGovernanceStateInput =
  InitializeBaselineScreenVersionsInput;

export function createInitialGovernanceState(
  input: CreateInitialGovernanceStateInput,
): GovernanceState {
  return {
    schemaVersion: 1,
    requiredScreenIds: [...input.requiredScreenIds],
    events: [] satisfies readonly GovernanceEvent[],
    screenVersions: initializeBaselineScreenVersions(input),
  };
}
