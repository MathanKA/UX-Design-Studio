import type {
  AgileEditorNavigationContext,
  UxdsGateStatus,
} from "@uxds/host-contract";
import { selectIsGateComplete, type GovernanceState } from "../domain/governance";

export function deriveGateStatus(state: GovernanceState): UxdsGateStatus {
  return selectIsGateComplete(state) ? "approved" : "in_review";
}

export type GateEventHandlers = {
  onGateStatusChange?: (status: UxdsGateStatus) => void;
  onNavigateToAgileEditor?: (context: AgileEditorNavigationContext) => void;
};

export type GateEventTracker = {
  /** Call after hydration and after each governance state change. */
  observe: (state: GovernanceState) => void;
};

/**
 * Deduplicate gate status emissions and navigate only on a user-driven
 * transition from in_review to approved (not on already-approved hydration).
 */
export function createGateEventTracker(
  context: AgileEditorNavigationContext,
  handlers: GateEventHandlers,
): GateEventTracker {
  let lastStatus: UxdsGateStatus | null = null;
  let hydrated = false;

  return {
    observe(state) {
      const next = deriveGateStatus(state);
      const statusHandler = handlers.onGateStatusChange;
      const navigateHandler = handlers.onNavigateToAgileEditor;

      if (!hydrated) {
        hydrated = true;
        lastStatus = next;
        statusHandler?.(next);
        return;
      }

      if (lastStatus === next) {
        return;
      }

      const previous = lastStatus;
      lastStatus = next;
      statusHandler?.(next);

      if (previous === "in_review" && next === "approved") {
        navigateHandler?.(context);
      }
    },
  };
}
