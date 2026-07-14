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
  demoActorForRole,
  specGovernanceContext,
} from "../../application/governance-session";
import { requestRevision as executeRequestRevision } from "../../application/request-revision";
import {
  selectApprovalProgress,
  selectCanApprove,
  selectCanRegenerate,
  selectCanRequestRevision,
  selectCurrentScreenVersion,
  selectIsGateComplete,
  selectScreenStatus,
  type ActorSnapshot,
  type DemoRole,
  type GovernanceState,
  type RevisionCategory,
} from "../../domain/governance";
import {
  listScreenNodeOptions,
  type UXSpec,
} from "../../domain/ux-spec";
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
  type RequestRevisionArgs,
  type RequestRevisionAttemptResult,
} from "./governance-context";

export type GovernanceProviderProps = {
  children: ReactNode;
  /** Injected UXSpec; defaults to AgentPilot seed. */
  spec?: UXSpec;
  /** Initial demo actor; defaults to Approver. Role switches are ephemeral UI state. */
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

const SUBMIT_IN_PROGRESS = {
  ok: false as const,
  error: {
    code: "SUBMIT_IN_PROGRESS" as const,
    message: "A governance command is already in progress.",
  },
};

export function GovernanceProvider({
  children,
  spec = agentPilotSeed,
  actor: initialActor = DEMO_APPROVER,
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
  const [actor, setActor] = useState<ActorSnapshot>(initialActor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const switchRole = useCallback((role: DemoRole) => {
    setActor(demoActorForRole(role));
  }, []);

  const getScreen = useCallback(
    (screenId: string) => spec.screens.find((screen) => screen.id === screenId),
    [spec],
  );

  const listScreenNodes = useCallback(
    (screenId: string) => {
      const screen = spec.screens.find((entry) => entry.id === screenId);
      if (!screen) {
        return [];
      }
      return listScreenNodeOptions(screen.root);
    },
    [spec],
  );

  const approveScreen = useCallback(
    (args: ApproveScreenArgs): ApproveScreenAttemptResult => {
      if (submittingRef.current) {
        return SUBMIT_IN_PROGRESS;
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

  const requestRevision = useCallback(
    (args: RequestRevisionArgs): RequestRevisionAttemptResult => {
      if (submittingRef.current) {
        return SUBMIT_IN_PROGRESS;
      }

      const screen = getScreen(args.screenId);
      if (!screen) {
        return {
          ok: false,
          error: {
            code: "UNKNOWN_SCREEN",
            message: `Unknown screen "${args.screenId}".`,
          },
        };
      }

      const effectiveActor = args.actor ?? actor;
      submittingRef.current = true;
      setIsSubmitting(true);

      try {
        const result = executeRequestRevision(
          state,
          {
            ...specContext,
            screenId: args.screenId,
            expectedScreenVersionId: args.expectedScreenVersionId,
            actor: effectiveActor,
            affectedNodeIds: args.affectedNodeIds,
            category: args.category as RevisionCategory,
            description: args.description,
            screenRoot: screen.root,
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
    [actor, clock, getScreen, idGenerator, repository, specContext, state],
  );

  const value = useMemo<GovernanceContextValue>(
    () => ({
      state,
      actor,
      isSubmitting,
      canApprove: selectCanApprove(actor),
      canRequestRevision: selectCanRequestRevision(actor),
      canRegenerate: selectCanRegenerate(actor),
      setActor,
      switchRole,
      approveScreen,
      requestRevision,
      getScreen,
      listScreenNodes,
      getScreenStatus: (screenId) => selectScreenStatus(state, screenId),
      getCurrentScreenVersion: (screenId) =>
        selectCurrentScreenVersion(state, screenId),
      getApprovalProgress: () => selectApprovalProgress(state),
      isGateComplete: () => selectIsGateComplete(state),
    }),
    [
      actor,
      approveScreen,
      getScreen,
      isSubmitting,
      listScreenNodes,
      requestRevision,
      state,
      switchRole,
    ],
  );

  return (
    <GovernanceContext.Provider value={value}>
      {children}
    </GovernanceContext.Provider>
  );
}
