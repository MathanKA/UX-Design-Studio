import { createContext, useContext } from "react";
import type { ApproveScreenResult } from "../../application/approve-screen";
import type {
  ActorSnapshot,
  ApprovalProgress,
  GovernanceState,
  ScreenId,
  ScreenReviewStatus,
  ScreenVersionId,
  ScreenVersionRecord,
} from "../../domain/governance";

export type ApproveScreenArgs = {
  screenId: ScreenId;
  expectedScreenVersionId: ScreenVersionId;
  comment?: string;
  actor?: ActorSnapshot;
};

export type ApproveScreenAttemptResult =
  | ApproveScreenResult
  | {
      ok: false;
      error: { code: "SUBMIT_IN_PROGRESS"; message: string };
    };

export type GovernanceContextValue = {
  state: GovernanceState;
  actor: ActorSnapshot;
  isSubmitting: boolean;
  canApprove: boolean;
  approveScreen: (args: ApproveScreenArgs) => ApproveScreenAttemptResult;
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
