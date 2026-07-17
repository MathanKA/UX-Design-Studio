import {
  selectChronologicalEvents,
  selectCurrentScreenVersion,
  type GovernanceEvent,
  type GovernanceState,
  type ScreenId,
  type ScreenReviewStatus,
  type ScreenVersionId,
  type ScreenVersionRecord,
} from "../../domain/governance";
import {
  collectScreenNodeIds,
  type ComponentNode,
  type ScreenSpec,
  type UXSpec,
} from "../../domain/ux-spec";
import {
  resolveScreenVersionContent,
  type ScreenContentResolver,
} from "../../application/screen-version-content";

const MAX_CHANGE_SUMMARIES = 12;
const PROP_KEYS_OF_INTEREST = [
  "content",
  "label",
  "title",
  "placeholder",
  "helperText",
  "variant",
] as const;

export type VersionApprovalTone = "current" | "historical" | "none";

export type VersionHistoryEntry = {
  version: ScreenVersionRecord;
  isCurrent: boolean;
  status: ScreenReviewStatus;
  approvalTone: VersionApprovalTone;
  regeneratedEvent?: Extract<GovernanceEvent, { type: "screen.regenerated" }>;
  triggeringRevision?: Extract<
    GovernanceEvent,
    { type: "screen.revision_requested" }
  >;
  screen: ScreenSpec | null;
  resolveFailureReason?: string;
};

export type VersionComparison = {
  priorVersionId: ScreenVersionId;
  currentVersionId: ScreenVersionId;
  priorNodeCount: number;
  currentNodeCount: number;
  nodeCountDelta: number;
  addedNodeIds: readonly string[];
  removedNodeIds: readonly string[];
  changeSummaries: readonly string[];
  providerExplanation: readonly string[] | null;
  providerRequestId?: string;
};

export type VersionHistoryContext = {
  screenId: ScreenId;
  screenName: string;
  entries: readonly VersionHistoryEntry[];
  current: VersionHistoryEntry | null;
  prior: VersionHistoryEntry | null;
  comparison: VersionComparison | null;
  isBaselineOnly: boolean;
};

function compareVersions(
  a: ScreenVersionRecord,
  b: ScreenVersionRecord,
): number {
  if (a.sequence !== b.sequence) {
    return a.sequence - b.sequence;
  }
  return a.id.localeCompare(b.id);
}

function eventsForVersion(
  state: GovernanceState,
  screenId: ScreenId,
  screenVersionId: ScreenVersionId,
): readonly GovernanceEvent[] {
  return selectChronologicalEvents(state).filter(
    (event) =>
      event.screenId === screenId && event.screenVersionId === screenVersionId,
  );
}

/**
 * Status fold for any screen version (current or historical).
 * Mirrors current-version fold rules in domain selectors.
 */
export function selectScreenVersionStatus(
  state: GovernanceState,
  screenId: ScreenId,
  version: ScreenVersionRecord,
): ScreenReviewStatus {
  const versionEvents = eventsForVersion(state, screenId, version.id);
  let status: ScreenReviewStatus =
    version.source === "regenerated" ? "ready_for_review" : "not_reviewed";
  let statusBeforeRegeneration: ScreenReviewStatus = status;

  for (const event of versionEvents) {
    switch (event.type) {
      case "screen.approved":
        status = "approved";
        break;
      case "screen.revision_requested":
        status = "changes_requested";
        statusBeforeRegeneration = "changes_requested";
        break;
      case "screen.regeneration_started":
        if (status !== "regenerating") {
          statusBeforeRegeneration =
            status === "approved"
              ? version.source === "regenerated"
                ? "ready_for_review"
                : "not_reviewed"
              : status;
        }
        status = "regenerating";
        break;
      case "screen.regeneration_failed":
        status = statusBeforeRegeneration;
        break;
      case "screen.regenerated":
        break;
      default: {
        const _exhaustive: never = event;
        void _exhaustive;
        break;
      }
    }
  }

  return status;
}

function findRegeneratedEventForVersion(
  state: GovernanceState,
  screenId: ScreenId,
  versionId: ScreenVersionId,
): Extract<GovernanceEvent, { type: "screen.regenerated" }> | undefined {
  return selectChronologicalEvents(state).find(
    (event): event is Extract<GovernanceEvent, { type: "screen.regenerated" }> =>
      event.type === "screen.regenerated" &&
      event.screenId === screenId &&
      event.payload.newVersionId === versionId,
  );
}

function findRevisionById(
  state: GovernanceState,
  revisionEventId: string,
): Extract<GovernanceEvent, { type: "screen.revision_requested" }> | undefined {
  const event = state.events.find((entry) => entry.id === revisionEventId);
  if (event?.type === "screen.revision_requested") {
    return event;
  }
  return undefined;
}

function walkNodes(
  node: ComponentNode,
  visit: (node: ComponentNode) => void,
): void {
  visit(node);
  for (const child of node.children ?? []) {
    walkNodes(child, visit);
  }
}

function indexNodesById(
  root: ComponentNode,
): Map<string, ComponentNode> {
  const map = new Map<string, ComponentNode>();
  walkNodes(root, (node) => {
    map.set(node.id, node);
  });
  return map;
}

function summarizePropChanges(
  prior: ComponentNode,
  current: ComponentNode,
): string[] {
  const summaries: string[] = [];
  const priorProps = prior.props ?? {};
  const currentProps = current.props ?? {};

  for (const key of PROP_KEYS_OF_INTEREST) {
    const before = priorProps[key];
    const after = currentProps[key];
    if (before === after) {
      continue;
    }
    if (typeof before === "string" || typeof after === "string") {
      summaries.push(
        `${current.id}.${key}: "${String(before ?? "")}" → "${String(after ?? "")}"`,
      );
    } else if (before !== undefined || after !== undefined) {
      summaries.push(`${current.id}.${key} changed`);
    }
  }

  return summaries;
}

export function compareScreenVersions(
  prior: ScreenSpec,
  current: ScreenSpec,
  options?: {
    providerExplanation?: readonly string[] | null;
    providerRequestId?: string;
  },
): VersionComparison {
  const priorIds = collectScreenNodeIds(prior.root);
  const currentIds = collectScreenNodeIds(current.root);
  const addedNodeIds = [...currentIds].filter((id) => !priorIds.has(id)).sort();
  const removedNodeIds = [...priorIds]
    .filter((id) => !currentIds.has(id))
    .sort();

  const priorNodes = indexNodesById(prior.root);
  const currentNodes = indexNodesById(current.root);
  const changeSummaries: string[] = [];

  for (const id of [...currentIds].sort()) {
    if (changeSummaries.length >= MAX_CHANGE_SUMMARIES) {
      break;
    }
    const priorNode = priorNodes.get(id);
    const currentNode = currentNodes.get(id);
    if (!priorNode || !currentNode) {
      continue;
    }
    for (const summary of summarizePropChanges(priorNode, currentNode)) {
      if (changeSummaries.length >= MAX_CHANGE_SUMMARIES) {
        break;
      }
      changeSummaries.push(summary);
    }
  }

  const priorNodeCount = priorIds.size;
  const currentNodeCount = currentIds.size;

  return {
    priorVersionId: "",
    currentVersionId: "",
    priorNodeCount,
    currentNodeCount,
    nodeCountDelta: currentNodeCount - priorNodeCount,
    addedNodeIds,
    removedNodeIds,
    changeSummaries,
    providerExplanation:
      options?.providerExplanation && options.providerExplanation.length > 0
        ? options.providerExplanation
        : null,
    ...(options?.providerRequestId !== undefined
      ? { providerRequestId: options.providerRequestId }
      : {}),
  };
}

export function listScreenVersionRecords(
  state: GovernanceState,
  screenId: ScreenId,
): readonly ScreenVersionRecord[] {
  const versions = state.screenVersions[screenId] ?? [];
  return [...versions].sort(compareVersions);
}

export function deriveVersionHistory(input: {
  state: GovernanceState;
  screenId: ScreenId;
  screenName?: string;
  seed: UXSpec;
  contentRegistry: ScreenContentResolver;
}): VersionHistoryContext | null {
  const { state, screenId, seed, contentRegistry } = input;
  const records = listScreenVersionRecords(state, screenId);
  if (records.length === 0) {
    return null;
  }

  const currentRecord = selectCurrentScreenVersion(state, screenId);
  const seedScreen = seed.screens.find((screen) => screen.id === screenId);
  const screenName = input.screenName ?? seedScreen?.name ?? screenId;

  const entries: VersionHistoryEntry[] = records.map((version) => {
    const isCurrent = version.id === currentRecord?.id;
    const status = selectScreenVersionStatus(state, screenId, version);
    const regeneratedEvent = findRegeneratedEventForVersion(
      state,
      screenId,
      version.id,
    );
    const triggeringRevision = regeneratedEvent
      ? findRevisionById(state, regeneratedEvent.payload.revisionEventId)
      : undefined;

    const resolved = resolveScreenVersionContent({
      version,
      seed,
      contentRegistry,
    });

    const versionEvents = selectChronologicalEvents(state).filter(
      (event) =>
        event.screenId === screenId && event.screenVersionId === version.id,
    );
    const wasApproved = versionEvents.some(
      (event) => event.type === "screen.approved",
    );

    let approvalTone: VersionApprovalTone = "none";
    if (status === "approved" && isCurrent) {
      approvalTone = "current";
    } else if (wasApproved && !isCurrent) {
      // Prior-version approvals remain historically visible even after later
      // revision invalidates effective approval for that version.
      approvalTone = "historical";
    }

    return {
      version,
      isCurrent,
      status,
      approvalTone,
      ...(regeneratedEvent ? { regeneratedEvent } : {}),
      ...(triggeringRevision ? { triggeringRevision } : {}),
      screen: resolved.ok ? resolved.screen : null,
      ...(resolved.ok
        ? {}
        : { resolveFailureReason: resolved.reason }),
    };
  });

  const current = entries.find((entry) => entry.isCurrent) ?? null;
  const prior =
    current && current.version.previousVersionId
      ? (entries.find(
          (entry) => entry.version.id === current.version.previousVersionId,
        ) ?? null)
      : entries.length > 1
        ? (entries[entries.length - 2] ?? null)
        : null;

  let comparison: VersionComparison | null = null;
  if (current?.screen && prior?.screen) {
    const regeneratedEvent = current.regeneratedEvent;
    const base = compareScreenVersions(prior.screen, current.screen, {
      providerExplanation: regeneratedEvent?.payload.explanation ?? null,
      ...(regeneratedEvent?.payload.providerRequestId !== undefined
        ? { providerRequestId: regeneratedEvent.payload.providerRequestId }
        : {}),
    });
    comparison = {
      ...base,
      priorVersionId: prior.version.id,
      currentVersionId: current.version.id,
    };
  }

  return {
    screenId,
    screenName,
    entries,
    current,
    prior,
    comparison,
    isBaselineOnly: entries.length === 1 && entries[0]?.version.source === "baseline",
  };
}
