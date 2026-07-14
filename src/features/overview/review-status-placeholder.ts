import type { ScreenId, UXSpec } from "../../domain/ux-spec";

/**
 * E3 placeholder review status until E4 governance selectors exist.
 * Deterministic and replaceable; does not persist or invent events.
 */
export type PlaceholderReviewStatus = "not_reviewed" | "awaiting_decision";

export type ScreenReviewStatusEntry = {
  screenId: ScreenId;
  status: PlaceholderReviewStatus;
  label: string;
};

export type ApprovalProgressPlaceholder = {
  headline: string;
  detail: string;
  decisionsRecorded: number;
  requiredScreens: number;
  note: string;
};

const STATUS_LABELS: Record<PlaceholderReviewStatus, string> = {
  not_reviewed: "Not reviewed",
  awaiting_decision: "Awaiting decision",
};

export function placeholderStatusLabel(status: PlaceholderReviewStatus): string {
  return STATUS_LABELS[status];
}

export function buildPlaceholderScreenStatuses(
  spec: UXSpec,
): readonly ScreenReviewStatusEntry[] {
  return spec.screens.map((screen) => ({
    screenId: screen.id,
    status: "not_reviewed",
    label: STATUS_LABELS.not_reviewed,
  }));
}

export function deriveApprovalProgressPlaceholder(
  spec: UXSpec,
): ApprovalProgressPlaceholder {
  return {
    headline: "Approval workflow not started",
    detail: `0 of ${spec.screens.length} decisions recorded`,
    decisionsRecorded: 0,
    requiredScreens: spec.screens.length,
    note: "Decision tracking arrives in the governance stage.",
  };
}
