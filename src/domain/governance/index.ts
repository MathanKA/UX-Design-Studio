export type {
  ActorId,
  ActorSnapshot,
  AuditEventId,
  ComponentNodeId,
  DemoRole,
  GovernanceState,
  ProjectId,
  RevisionCategory,
  ScreenId,
  ScreenReviewStatus,
  ScreenVersionId,
  ScreenVersionRecord,
  ScreenVersionSource,
  SpecId,
} from "./types";

export {
  GOVERNANCE_LIMITS,
  REVISION_CATEGORIES,
  baselineScreenVersionId,
} from "./types";

export type { GovernanceEventMetadata, CreateEventMetadataInput } from "./event-metadata";
export { createEventMetadata } from "./event-metadata";

export type {
  GovernanceEvent,
  GovernanceEventType,
  RevisionRequestedEvent,
  ScreenApprovedEvent,
  ScreenRegeneratedEvent,
  ScreenRegenerationFailedEvent,
  ScreenRegenerationStartedEvent,
} from "./events";

export type {
  GovernanceError,
  GovernanceErrorCode,
  GovernanceResult,
  GovernanceStateResult,
} from "./governance-errors";

export {
  governanceErr,
  governanceOk,
  governanceStateErr,
  governanceStateOk,
} from "./governance-errors";

export type { Capability } from "./policies";
export {
  assertCapability,
  capabilitiesForRole,
  hasCapability,
} from "./policies";

export type {
  CreateInitialGovernanceStateInput,
  InitializeBaselineScreenVersionsInput,
} from "./governance-state";

export {
  createInitialGovernanceState,
  initializeBaselineScreenVersions,
} from "./governance-state";

export type { GovernanceAction } from "./governance-reducer";
export {
  appendGovernanceEvent,
  foldGovernanceEvents,
  reduceGovernance,
} from "./governance-reducer";

export type {
  ApproveScreenCommand,
  BeginRegenerationCommand,
  GovernancePorts,
  RecordRegeneratedCommand,
  RecordRegenerationFailedCommand,
  RegeneratedEventBundle,
  RequestRevisionCommand,
  ScreenCommandBase,
} from "./commands";

export {
  createApproveScreenEvent,
  createBeginRegenerationEvent,
  createRegeneratedEvent,
  createRegenerationFailedEvent,
  createRequestRevisionEvent,
} from "./commands";

export type { ApprovalProgress } from "./selectors";
export {
  selectApprovalProgress,
  selectCanApprove,
  selectCanRegenerate,
  selectCanRequestRevision,
  selectChronologicalEvents,
  selectCurrentScreenVersion,
  selectEventsForScreen,
  selectIsGateComplete,
  selectIsScreenApproved,
  selectLatestRevisionRequest,
  selectScreenStatus,
} from "./selectors";

export {
  actorSnapshotSchema,
  demoRoleSchema,
  governanceEventSchema,
  governanceStateSchema,
  regenerationFailedEventSchema,
  regeneratedEventSchema,
  regenerationStartedEventSchema,
  revisionCategorySchema,
  revisionRequestedEventSchema,
  screenApprovedEventSchema,
  screenVersionRecordSchema,
} from "./schemas";
