import type { ScreenReviewStatus } from "../../domain/governance";

export const SCREEN_REVIEW_STATUS_LABELS: Record<ScreenReviewStatus, string> = {
  not_reviewed: "Not reviewed",
  changes_requested: "Changes requested",
  regenerating: "Regenerating",
  ready_for_review: "Ready for review",
  approved: "Approved",
};

export function screenReviewStatusLabel(status: ScreenReviewStatus): string {
  return SCREEN_REVIEW_STATUS_LABELS[status];
}
