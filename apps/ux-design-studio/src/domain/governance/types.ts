/**
 * Pure governance domain types.
 * Approval, revision, and regeneration state live here — never on UXSpec.
 */

import type { GovernanceEvent } from "./events";

export type ProjectId = string;
export type SpecId = string;
export type ScreenId = string;
export type ScreenVersionId = string;
export type AuditEventId = string;
export type ComponentNodeId = string;
export type ActorId = string;

export type DemoRole = "approver" | "reviewer" | "viewer";

/**
 * Product-review vocabulary for structured revision requests.
 * Allowlisted categories: content | layout | interaction | accessibility | data | other
 */
export type RevisionCategory =
  | "content"
  | "layout"
  | "interaction"
  | "accessibility"
  | "data"
  | "other";

export const REVISION_CATEGORIES = [
  "content",
  "layout",
  "interaction",
  "accessibility",
  "data",
  "other",
] as const satisfies readonly RevisionCategory[];

export type ScreenReviewStatus =
  | "not_reviewed"
  | "changes_requested"
  | "regenerating"
  | "ready_for_review"
  | "approved";

export type ActorSnapshot = {
  id: ActorId;
  role: DemoRole;
  displayLabel: string;
};

export type ScreenVersionSource = "baseline" | "regenerated";

export type ScreenVersionRecord = {
  id: ScreenVersionId;
  screenId: ScreenId;
  projectId: ProjectId;
  specId: SpecId;
  specVersion: string;
  baselineVersion: string;
  sequence: number;
  source: ScreenVersionSource;
  createdAt: string;
  previousVersionId?: ScreenVersionId;
  /** Required for regenerated versions; resolves content via content registry. */
  contentRef?: string;
};

export type GovernanceState = {
  schemaVersion: 1;
  requiredScreenIds: readonly ScreenId[];
  events: readonly GovernanceEvent[];
  screenVersions: Readonly<
    Record<ScreenId, readonly ScreenVersionRecord[]>
  >;
};

export const GOVERNANCE_LIMITS = {
  maxCommentLength: 500,
  maxDescriptionLength: 2_000,
  maxFailureMessageLength: 500,
  maxFailureCodeLength: 64,
  maxIdLength: 128,
  maxContentRefLength: 128,
  maxDisplayLabelLength: 120,
  maxAffectedNodes: 50,
  maxStringLength: 2_000,
} as const;

export function baselineScreenVersionId(screenId: ScreenId): ScreenVersionId {
  return `sv-${screenId}-baseline`;
}
