import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { approveScreen as executeApproveScreen } from "../../application/approve-screen";
import {
  DEMO_APPROVER,
  createGovernanceStateFromSpec,
  specGovernanceContext,
} from "../../application/governance-session";
import {
  selectApprovalProgress,
  selectCanApprove,
  selectCurrentScreenVersion,
  selectIsGateComplete,
  selectScreenStatus,
  type ActorSnapshot,
  type GovernanceState,
} from "../../domain/governance";
import type { UXSpec } from "../../domain/ux-spec";
import { agentPilotSeed } from "../../infrastructure/seed";
import { InMemoryGovernanceRepository } from "../../infrastructure/persistence/in-memory-governance-repository";
import { createBrowserIdGenerator } from "../../infrastructure/platform/browser-id-generator";
import { createSystemClock } from "../../infrastructure/platform/system-clock";
import type { Clock } from "../../ports/clock";
import type { GovernanceRepository } from "../../ports/governance-repository";
import type { IdGenerator } from "../../ports/id-generator";
import {
  GovernanceContext,
  type ApproveScreenArgs,
  type ApproveScreenAttemptResult,
  type GovernanceContextValue,
} from "./governance-context";

export type GovernanceProviderProps = {
  children: ReactNode;
  /** Injected UXSpec; defaults to AgentPilot seed. */
  spec?: UXSpec;
  /** Demo actor; defaults to Approver. Full switcher is US-4.3. */
  actor?: ActorSnapshot;
  clock?: Clock;
  idGenerator?: IdGenerator;
  repository?: GovernanceRepository;
  /** Fixed createdAt for baseline versions (tests). */
  createdAt?: string;
};

function loadSync(
  repository: GovernanceRepository,
  fallback: GovernanceState,
): GovernanceState {
  const loaded = repository.load();
  if (
    typeof loaded === "object" &&
    loaded !== null &&
    "then" in loaded &&
    typeof (loaded as Promise<GovernanceState>).then === "function"
  ) {
    // US-4.2 wires a sync in-memory repository; async adapters arrive later.
    return fallback;
  }
  return loaded as GovernanceState;
}

export function GovernanceProvider({
  children,
  spec = agentPilotSeed,
  actor = DEMO_APPROVER,
  clock = createSystemClock(),
  idGenerator = createBrowserIdGenerator(),
  repository: repositoryProp,
  createdAt,
}: GovernanceProviderProps) {
  const specContext = useMemo(() => specGovernanceContext(spec), [spec]);
  const repositoryRef = useRef<GovernanceRepository | null>(null);

  if (repositoryRef.current === null) {
    const initial = createGovernanceStateFromSpec(
      spec,
      createdAt ?? clock.now(),
    );
    repositoryRef.current =
      repositoryProp ?? new InMemoryGovernanceRepository(initial);
  }

  const repository = repositoryRef.current;
  const [state, setState] = useState<GovernanceState>(() =>
    loadSync(
      repository,
      createGovernanceStateFromSpec(spec, createdAt ?? clock.now()),
    ),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const approveScreen = useCallback(
    (args: ApproveScreenArgs): ApproveScreenAttemptResult => {
      if (submittingRef.current) {
        return {
          ok: false,
          error: {
            code: "SUBMIT_IN_PROGRESS",
            message: "An approval is already in progress.",
          },
        };
      }

      const effectiveActor = args.actor ?? actor;
      submittingRef.current = true;
      setIsSubmitting(true);

      try {
        const result = executeApproveScreen(
          state,
          {
            ...specContext,
            screenId: args.screenId,
            expectedScreenVersionId: args.expectedScreenVersionId,
            actor: effectiveActor,
            ...(args.comment !== undefined ? { comment: args.comment } : {}),
          },
          { clock, idGenerator },
        );

        if (result.ok) {
          void repository.save(result.state);
          setState(result.state);
        }

        return result;
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [actor, clock, idGenerator, repository, specContext, state],
  );

  const value = useMemo<GovernanceContextValue>(
    () => ({
      state,
      actor,
      isSubmitting,
      canApprove: selectCanApprove(actor),
      approveScreen,
      getScreenStatus: (screenId) => selectScreenStatus(state, screenId),
      getCurrentScreenVersion: (screenId) =>
        selectCurrentScreenVersion(state, screenId),
      getApprovalProgress: () => selectApprovalProgress(state),
      isGateComplete: () => selectIsGateComplete(state),
    }),
    [actor, approveScreen, isSubmitting, state],
  );

  return (
    <GovernanceContext.Provider value={value}>
      {children}
    </GovernanceContext.Provider>
  );
}
