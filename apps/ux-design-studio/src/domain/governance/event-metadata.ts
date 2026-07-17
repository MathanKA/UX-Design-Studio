import type {
  ActorSnapshot,
  AuditEventId,
  ProjectId,
  ScreenId,
  ScreenVersionId,
  SpecId,
} from "./types";

/**
 * Shared metadata present on every governance event.
 */
export type GovernanceEventMetadata = {
  id: AuditEventId;
  projectId: ProjectId;
  specId: SpecId;
  specVersion: string;
  baselineVersion: string;
  screenId: ScreenId;
  screenVersionId: ScreenVersionId;
  actor: ActorSnapshot;
  occurredAt: string;
};

export type CreateEventMetadataInput = GovernanceEventMetadata;

export function createEventMetadata(
  input: CreateEventMetadataInput,
): GovernanceEventMetadata {
  return {
    id: input.id,
    projectId: input.projectId,
    specId: input.specId,
    specVersion: input.specVersion,
    baselineVersion: input.baselineVersion,
    screenId: input.screenId,
    screenVersionId: input.screenVersionId,
    actor: {
      id: input.actor.id,
      role: input.actor.role,
      displayLabel: input.actor.displayLabel,
    },
    occurredAt: input.occurredAt,
  };
}
