export type UxdsRole = "approver" | "reviewer" | "viewer";

export type UxdsGateStatus = "in_review" | "approved";

export interface UxdsActorSnapshot {
  id: string;
  displayLabel: string;
  role: UxdsRole;
}

export interface AgileEditorNavigationContext {
  projectId: string;
  baselineVersion: string;
}

export interface UxDesignStudioRemoteProps {
  projectId: string;
  baselineVersion: string;
  basePath: string;
  actor: UxdsActorSnapshot;
  onGateStatusChange?: (status: UxdsGateStatus) => void;
  onNavigateToAgileEditor?: (
    context: AgileEditorNavigationContext,
  ) => void;
}

export const UXDS_HOST_CONTRACT_VERSION = "1.0.0" as const;

/** Sole project identity supported by the AgentPilot demo remote. */
export const SUPPORTED_DEMO_PROJECT_ID = "project-agentpilot" as const;
