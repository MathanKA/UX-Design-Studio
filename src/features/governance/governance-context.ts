import { createContext, useContext } from "react";
import type { ApproveScreenResult } from "../../application/approve-screen";
import type { RequestRevisionResult } from "../../application/request-revision";
import type {
  ActorSnapshot,
  ApprovalProgress,
  DemoRole,
  GovernanceState,
  ScreenId,
  ScreenReviewStatus,
  ScreenVersionId,
  ScreenVersionRecord,
} from "../../domain/governance";
import type { ScreenNodeOption, ScreenSpec } from "../../domain/ux-spec";

export type ApproveScreenArgs = {
  screenId: ScreenId;
  expectedScreenVersionId: ScreenVersionId;
  comment?: string;
  actor?: ActorSnapshot;
};

export type RequestRevisionArgs = {
  screenId: ScreenId;
  expectedScreenVersionId: ScreenVersionId;
  affectedNodeIds: readonly string[];
  category: string;
  description: string;
  actor?: ActorSnapshot;
};

export type ApproveScreenAttemptResult =
  | ApproveScreenResult
  | {
      ok: false;
      error: { code: "SUBMIT_IN_PROGRESS"; message: string };
    };

export type RequestRevisionAttemptResult =
  | RequestRevisionResult
  | {
      ok: false;
      error: { code: "SUBMIT_IN_PROGRESS"; message: string };
    };

export type GovernanceContextValue = {
  state: GovernanceState;
  actor: ActorSnapshot;
  isSubmitting: boolean;
  canApprove: boolean;
  canRequestRevision: boolean;
  canRegenerate: boolean;
  setActor: (actor: ActorSnapshot) => void;
  switchRole: (role: DemoRole) => void;
  approveScreen: (args: ApproveScreenArgs) => ApproveScreenAttemptResult;
  requestRevision: (args: RequestRevisionArgs) => RequestRevisionAttemptResult;
  getScreen: (screenId: ScreenId) => ScreenSpec | undefined;
  listScreenNodes: (screenId: ScreenId) => readonly ScreenNodeOption[];
  getScreenStatus: (screenId: ScreenId) => ScreenReviewStatus;
  getCurrentScreenVersion: (
    screenId: ScreenId,
  ) => ScreenVersionRecord | undefined;
  getApprovalProgress: () => ApprovalProgress;
  isGateComplete: () => boolean;
};

export const GovernanceContext = createContext<GovernanceContextValue | null>(
  null,
);

export function useGovernance(): GovernanceContextValue {
  const value = useContext(GovernanceContext);
  if (!value) {
    throw new Error("useGovernance must be used within GovernanceProvider");
  }
  return value;
}
