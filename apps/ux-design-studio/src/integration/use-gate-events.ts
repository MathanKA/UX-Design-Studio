import { useEffect, useRef } from "react";
import type {
  AgileEditorNavigationContext,
  UxdsGateStatus,
} from "@uxds/host-contract";
import { useGovernance } from "../features/governance";
import { createGateEventTracker } from "./gate-events";

type UseGateEventsArgs = {
  projectId: string;
  baselineVersion: string;
  onGateStatusChange?: (status: UxdsGateStatus) => void;
  onNavigateToAgileEditor?: (context: AgileEditorNavigationContext) => void;
};

export function useGateEvents({
  projectId,
  baselineVersion,
  onGateStatusChange,
  onNavigateToAgileEditor,
}: UseGateEventsArgs): void {
  const { state } = useGovernance();
  const statusRef = useRef(onGateStatusChange);
  const navigateRef = useRef(onNavigateToAgileEditor);
  statusRef.current = onGateStatusChange;
  navigateRef.current = onNavigateToAgileEditor;

  const trackerRef = useRef<ReturnType<typeof createGateEventTracker> | null>(
    null,
  );

  useEffect(() => {
    trackerRef.current = createGateEventTracker(
      { projectId, baselineVersion },
      {
        onGateStatusChange: (status) => statusRef.current?.(status),
        onNavigateToAgileEditor: (context) => navigateRef.current?.(context),
      },
    );
  }, [projectId, baselineVersion]);

  useEffect(() => {
    trackerRef.current?.observe(state);
  }, [state]);
}
