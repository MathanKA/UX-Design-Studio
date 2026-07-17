import type {
  AgileEditorNavigationContext,
  UxdsGateStatus,
} from "@uxds/host-contract";
import { useGateEvents } from "./use-gate-events";

type GateEventsBridgeProps = {
  projectId: string;
  baselineVersion: string;
  onGateStatusChange?: (status: UxdsGateStatus) => void;
  onNavigateToAgileEditor?: (context: AgileEditorNavigationContext) => void;
};

/** Mounts gate observation inside GovernanceProvider. */
export function GateEventsBridge(props: GateEventsBridgeProps) {
  useGateEvents(props);
  return null;
}
