import type { GovernanceEvent } from "../../domain/governance";

export const GOVERNANCE_EVENT_TYPE_LABELS: Record<
  GovernanceEvent["type"],
  string
> = {
  "screen.approved": "Approved",
  "screen.revision_requested": "Revision requested",
  "screen.regeneration_started": "Regeneration started",
  "screen.regenerated": "Regenerated",
  "screen.regeneration_failed": "Regeneration failed",
};

export function formatEventType(type: GovernanceEvent["type"]): string {
  return GOVERNANCE_EVENT_TYPE_LABELS[type];
}

export function formatEventDetails(event: GovernanceEvent): string {
  switch (event.type) {
    case "screen.approved":
      return event.payload.comment
        ? `Comment: ${event.payload.comment}`
        : "No comment";
    case "screen.revision_requested":
      return [
        `Category: ${event.payload.category}`,
        `Affected nodes: ${
          event.payload.affectedNodeIds.length > 0
            ? event.payload.affectedNodeIds.join(", ")
            : "none"
        }`,
        `Description: ${event.payload.description}`,
      ].join(" · ");
    case "screen.regeneration_started": {
      const parts = ["Regeneration requested (contract event)"];
      if (event.payload.requestId) {
        parts.push(`requestId: ${event.payload.requestId}`);
      }
      if (event.payload.correlationId) {
        parts.push(`correlationId: ${event.payload.correlationId}`);
      }
      return parts.join(" · ");
    }
    case "screen.regenerated":
      return [
        `Provider: ${event.payload.provider}`,
        `Previous version: ${event.payload.previousVersionId}`,
        `New version: ${event.payload.newVersionId}`,
        `Revision event: ${event.payload.revisionEventId}`,
      ].join(" · ");
    case "screen.regeneration_failed":
      return [
        `Code: ${event.payload.failureCode}`,
        `Message: ${event.payload.message}`,
      ].join(" · ");
    default: {
      const _exhaustive: never = event;
      return String(_exhaustive);
    }
  }
}
