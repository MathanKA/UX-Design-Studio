import type {
  ComponentNodeId,
  ProjectId,
  RevisionCategory,
  ScreenVersionId,
  SpecId,
} from "../domain/governance";
import type { Persona, ScreenSpec } from "../domain/ux-spec";

export type RegenerateScreenRequest = {
  projectId: ProjectId;
  specId: SpecId;
  specVersion: string;
  baselineVersion: string;
  screen: Readonly<ScreenSpec>;
  currentVersionId: ScreenVersionId;
  revision: {
    affectedNodeIds: readonly ComponentNodeId[];
    category: RevisionCategory;
    description: string;
  };
  personaContext?: Readonly<Persona>;
};

export type RegenerateScreenResult = {
  providerRequestId: string;
  generatedAt: string;
  screen: ScreenSpec;
  /** Content reference for persistence / reload resolution. */
  contentRef: string;
  explanation?: string[];
};

/**
 * Transport-agnostic design-agent regeneration boundary.
 * UI and application depend on this port — never on a mock adapter.
 */
export interface DesignAgentProvider {
  regenerateScreen(
    request: RegenerateScreenRequest,
    signal?: AbortSignal,
  ): Promise<RegenerateScreenResult>;
}
