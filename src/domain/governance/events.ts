import type { GovernanceEventMetadata } from "./event-metadata";
import type {
  AuditEventId,
  ComponentNodeId,
  RevisionCategory,
  ScreenVersionId,
} from "./types";

export type ScreenApprovedEvent = GovernanceEventMetadata & {
  type: "screen.approved";
  payload: {
    comment?: string;
  };
};

export type RevisionRequestedEvent = GovernanceEventMetadata & {
  type: "screen.revision_requested";
  payload: {
    affectedNodeIds: readonly ComponentNodeId[];
    category: RevisionCategory;
    description: string;
  };
};

export type ScreenRegenerationStartedEvent = GovernanceEventMetadata & {
  type: "screen.regeneration_started";
  payload: {
    requestId?: string;
    correlationId?: string;
  };
};

export type ScreenRegeneratedEvent = GovernanceEventMetadata & {
  type: "screen.regenerated";
  payload: {
    previousVersionId: ScreenVersionId;
    newVersionId: ScreenVersionId;
    revisionEventId: AuditEventId;
    provider: "mock" | "production";
    contentRef: string;
    providerRequestId?: string;
  };
};

export type ScreenRegenerationFailedEvent = GovernanceEventMetadata & {
  type: "screen.regeneration_failed";
  payload: {
    failureCode: string;
    message: string;
  };
};

export type GovernanceEvent =
  | ScreenApprovedEvent
  | RevisionRequestedEvent
  | ScreenRegenerationStartedEvent
  | ScreenRegeneratedEvent
  | ScreenRegenerationFailedEvent;

export type GovernanceEventType = GovernanceEvent["type"];
