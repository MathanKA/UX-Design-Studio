import type { Clock } from "../../ports/clock";
import type { IdGenerator } from "../../ports/id-generator";
import { createEventMetadata } from "./event-metadata";
import type {
  RevisionRequestedEvent,
  ScreenApprovedEvent,
  ScreenRegeneratedEvent,
  ScreenRegenerationFailedEvent,
  ScreenRegenerationStartedEvent,
} from "./events";
import {
  governanceErr,
  governanceOk,
  type GovernanceResult,
} from "./governance-errors";
import { selectCurrentScreenVersion } from "./selectors";
import {
  GOVERNANCE_LIMITS,
  type ActorSnapshot,
  type AuditEventId,
  type ComponentNodeId,
  type GovernanceState,
  type ProjectId,
  type RevisionCategory,
  type ScreenId,
  type ScreenVersionId,
  type ScreenVersionRecord,
  type SpecId,
} from "./types";

export type GovernancePorts = {
  clock: Clock;
  idGenerator: IdGenerator;
};

export type ScreenCommandBase = {
  projectId: ProjectId;
  specId: SpecId;
  specVersion: string;
  baselineVersion: string;
  screenId: ScreenId;
  expectedScreenVersionId: ScreenVersionId;
  actor: ActorSnapshot;
};

export type ApproveScreenCommand = ScreenCommandBase & {
  comment?: string;
};

export type RequestRevisionCommand = ScreenCommandBase & {
  affectedNodeIds: readonly ComponentNodeId[];
  category: RevisionCategory;
  description: string;
};

export type BeginRegenerationCommand = ScreenCommandBase & {
  requestId?: string;
  correlationId?: string;
};

export type RecordRegeneratedCommand = ScreenCommandBase & {
  newVersionId?: ScreenVersionId;
  revisionEventId: AuditEventId;
  provider: "mock" | "production";
  contentRef: string;
  providerRequestId?: string;
  explanation?: readonly string[];
};

export type RecordRegenerationFailedCommand = ScreenCommandBase & {
  failureCode: string;
  message: string;
};

function validateCurrentVersion(
  state: GovernanceState,
  screenId: ScreenId,
  expectedScreenVersionId: ScreenVersionId,
): GovernanceResult<ScreenVersionRecord> {
  const current = selectCurrentScreenVersion(state, screenId);
  if (!current) {
    if (!state.requiredScreenIds.includes(screenId)) {
      return governanceErr(
        "UNKNOWN_SCREEN",
        `Screen "${screenId}" is not a required governance screen.`,
      );
    }
    return governanceErr(
      "MISSING_SCREEN_VERSION",
      `No screen version exists for "${screenId}".`,
    );
  }

  if (current.id !== expectedScreenVersionId) {
    return governanceErr(
      "STALE_SCREEN_VERSION",
      `Expected current version "${expectedScreenVersionId}" but current is "${current.id}".`,
    );
  }

  return governanceOk(current);
}

function validateBoundedOptionalComment(
  comment: string | undefined,
): GovernanceResult<string | undefined> {
  if (comment === undefined) {
    return governanceOk(undefined);
  }
  const trimmed = comment.trim();
  if (trimmed.length === 0) {
    return governanceOk(undefined);
  }
  if (trimmed.length > GOVERNANCE_LIMITS.maxCommentLength) {
    return governanceErr(
      "INVALID_COMMAND",
      `Comment exceeds ${GOVERNANCE_LIMITS.maxCommentLength} characters.`,
    );
  }
  return governanceOk(trimmed);
}

export function createApproveScreenEvent(
  state: GovernanceState,
  command: ApproveScreenCommand,
  ports: GovernancePorts,
): GovernanceResult<ScreenApprovedEvent> {
  const versionResult = validateCurrentVersion(
    state,
    command.screenId,
    command.expectedScreenVersionId,
  );
  if (!versionResult.ok) {
    return versionResult;
  }

  const commentResult = validateBoundedOptionalComment(command.comment);
  if (!commentResult.ok) {
    return commentResult;
  }

  const metadata = createEventMetadata({
    id: ports.idGenerator.next("evt"),
    projectId: command.projectId,
    specId: command.specId,
    specVersion: command.specVersion,
    baselineVersion: command.baselineVersion,
    screenId: command.screenId,
    screenVersionId: command.expectedScreenVersionId,
    actor: command.actor,
    occurredAt: ports.clock.now(),
  });

  const event: ScreenApprovedEvent = {
    ...metadata,
    type: "screen.approved",
    payload:
      commentResult.value === undefined
        ? {}
        : { comment: commentResult.value },
  };

  return governanceOk(event);
}

export function createRequestRevisionEvent(
  state: GovernanceState,
  command: RequestRevisionCommand,
  ports: GovernancePorts,
): GovernanceResult<RevisionRequestedEvent> {
  const versionResult = validateCurrentVersion(
    state,
    command.screenId,
    command.expectedScreenVersionId,
  );
  if (!versionResult.ok) {
    return versionResult;
  }

  const description = command.description.trim();
  if (description.length === 0) {
    return governanceErr("INVALID_COMMAND", "Revision description is required.");
  }
  if (description.length > GOVERNANCE_LIMITS.maxDescriptionLength) {
    return governanceErr(
      "INVALID_COMMAND",
      `Description exceeds ${GOVERNANCE_LIMITS.maxDescriptionLength} characters.`,
    );
  }
  if (command.affectedNodeIds.length > GOVERNANCE_LIMITS.maxAffectedNodes) {
    return governanceErr(
      "INVALID_COMMAND",
      `affectedNodeIds exceeds ${GOVERNANCE_LIMITS.maxAffectedNodes} entries.`,
    );
  }

  const metadata = createEventMetadata({
    id: ports.idGenerator.next("evt"),
    projectId: command.projectId,
    specId: command.specId,
    specVersion: command.specVersion,
    baselineVersion: command.baselineVersion,
    screenId: command.screenId,
    screenVersionId: command.expectedScreenVersionId,
    actor: command.actor,
    occurredAt: ports.clock.now(),
  });

  return governanceOk({
    ...metadata,
    type: "screen.revision_requested",
    payload: {
      affectedNodeIds: [...command.affectedNodeIds],
      category: command.category,
      description,
    },
  });
}

export function createBeginRegenerationEvent(
  state: GovernanceState,
  command: BeginRegenerationCommand,
  ports: GovernancePorts,
): GovernanceResult<ScreenRegenerationStartedEvent> {
  const versionResult = validateCurrentVersion(
    state,
    command.screenId,
    command.expectedScreenVersionId,
  );
  if (!versionResult.ok) {
    return versionResult;
  }

  const metadata = createEventMetadata({
    id: ports.idGenerator.next("evt"),
    projectId: command.projectId,
    specId: command.specId,
    specVersion: command.specVersion,
    baselineVersion: command.baselineVersion,
    screenId: command.screenId,
    screenVersionId: command.expectedScreenVersionId,
    actor: command.actor,
    occurredAt: ports.clock.now(),
  });

  const payload: ScreenRegenerationStartedEvent["payload"] = {};
  if (command.requestId !== undefined) {
    payload.requestId = command.requestId;
  }
  if (command.correlationId !== undefined) {
    payload.correlationId = command.correlationId;
  }

  return governanceOk({
    ...metadata,
    type: "screen.regeneration_started",
    payload,
  });
}

export type RegeneratedEventBundle = {
  event: ScreenRegeneratedEvent;
  version: ScreenVersionRecord;
};

export function createRegeneratedEvent(
  state: GovernanceState,
  command: RecordRegeneratedCommand,
  ports: GovernancePorts,
): GovernanceResult<RegeneratedEventBundle> {
  const versionResult = validateCurrentVersion(
    state,
    command.screenId,
    command.expectedScreenVersionId,
  );
  if (!versionResult.ok) {
    return versionResult;
  }

  const contentRef = command.contentRef.trim();
  if (!contentRef) {
    return governanceErr(
      "MISSING_CONTENT_REF",
      "Regenerated versions require a contentRef.",
    );
  }
  if (contentRef.length > GOVERNANCE_LIMITS.maxContentRefLength) {
    return governanceErr(
      "MISSING_CONTENT_REF",
      `contentRef exceeds ${GOVERNANCE_LIMITS.maxContentRefLength} characters.`,
    );
  }

  const previous = versionResult.value;
  const newVersionId =
    command.newVersionId ?? ports.idGenerator.next(`sv-${command.screenId}`);

  if (newVersionId === previous.id) {
    return governanceErr(
      "VERSION_ID_COLLISION",
      `newVersionId must differ from previousVersionId ("${previous.id}").`,
    );
  }

  for (const versions of Object.values(state.screenVersions)) {
    if (versions.some((entry) => entry.id === newVersionId)) {
      return governanceErr(
        "DUPLICATE_VERSION_ID",
        `Screen version id "${newVersionId}" already exists.`,
      );
    }
  }

  const revision = state.events.find(
    (entry) => entry.id === command.revisionEventId,
  );
  if (
    !revision ||
    revision.type !== "screen.revision_requested" ||
    revision.screenId !== command.screenId ||
    revision.screenVersionId !== previous.id
  ) {
    return governanceErr(
      "INVALID_REVISION_REFERENCE",
      `revisionEventId "${command.revisionEventId}" is not a revision for the current version.`,
    );
  }

  const occurredAt = ports.clock.now();

  const metadata = createEventMetadata({
    id: ports.idGenerator.next("evt"),
    projectId: command.projectId,
    specId: command.specId,
    specVersion: command.specVersion,
    baselineVersion: command.baselineVersion,
    screenId: command.screenId,
    screenVersionId: command.expectedScreenVersionId,
    actor: command.actor,
    occurredAt,
  });

  const explanation = command.explanation
    ?.map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 10);

  const event: ScreenRegeneratedEvent = {
    ...metadata,
    type: "screen.regenerated",
    payload: {
      previousVersionId: previous.id,
      newVersionId,
      revisionEventId: command.revisionEventId,
      provider: command.provider,
      contentRef,
      ...(command.providerRequestId !== undefined
        ? { providerRequestId: command.providerRequestId }
        : {}),
      ...(explanation && explanation.length > 0 ? { explanation } : {}),
    },
  };

  const version: ScreenVersionRecord = {
    id: newVersionId,
    screenId: command.screenId,
    projectId: command.projectId,
    specId: command.specId,
    specVersion: command.specVersion,
    baselineVersion: command.baselineVersion,
    sequence: previous.sequence + 1,
    source: "regenerated",
    createdAt: occurredAt,
    previousVersionId: previous.id,
    contentRef,
  };

  return governanceOk({ event, version });
}

export function createRegenerationFailedEvent(
  state: GovernanceState,
  command: RecordRegenerationFailedCommand,
  ports: GovernancePorts,
): GovernanceResult<ScreenRegenerationFailedEvent> {
  const versionResult = validateCurrentVersion(
    state,
    command.screenId,
    command.expectedScreenVersionId,
  );
  if (!versionResult.ok) {
    return versionResult;
  }

  const failureCode = command.failureCode.trim();
  const message = command.message.trim();
  if (failureCode.length === 0 || message.length === 0) {
    return governanceErr(
      "INVALID_COMMAND",
      "failureCode and message are required.",
    );
  }
  if (failureCode.length > GOVERNANCE_LIMITS.maxFailureCodeLength) {
    return governanceErr(
      "INVALID_COMMAND",
      `failureCode exceeds ${GOVERNANCE_LIMITS.maxFailureCodeLength} characters.`,
    );
  }
  if (message.length > GOVERNANCE_LIMITS.maxFailureMessageLength) {
    return governanceErr(
      "INVALID_COMMAND",
      `message exceeds ${GOVERNANCE_LIMITS.maxFailureMessageLength} characters.`,
    );
  }

  const metadata = createEventMetadata({
    id: ports.idGenerator.next("evt"),
    projectId: command.projectId,
    specId: command.specId,
    specVersion: command.specVersion,
    baselineVersion: command.baselineVersion,
    screenId: command.screenId,
    screenVersionId: command.expectedScreenVersionId,
    actor: command.actor,
    occurredAt: ports.clock.now(),
  });

  return governanceOk({
    ...metadata,
    type: "screen.regeneration_failed",
    payload: { failureCode, message },
  });
}
