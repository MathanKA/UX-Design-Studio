import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  armControlledProviderFailure,
  createDefaultGovernanceDeps,
} from "../../infrastructure/providers/create-default-governance-deps";
import { approveScreen as executeApproveScreen } from "../../application/approve-screen";
import {
  DEMO_APPROVER,
  createGovernanceStateFromSpec,
  specGovernanceContext,
} from "../../application/governance-session";
import { regenerateScreen as executeRegenerateScreen } from "../../application/regenerate-screen";
import { requestRevision as executeRequestRevision } from "../../application/request-revision";
import {
  resolveScreenVersionContent,
  type ScreenContentResolver,
} from "../../application/screen-version-content";
import {
  reduceGovernance,
  selectApprovalProgress,
  selectCanApprove,
  selectCanRegenerate,
  selectCanRequestRevision,
  selectCurrentScreenVersion,
  selectIsGateComplete,
  selectLatestRevisionRequest,
  selectScreenStatus,
  type ActorSnapshot,
  type GovernanceState,
  type RevisionCategory,
} from "../../domain/governance";
import {
  listScreenNodeOptions,
  type UXSpec,
} from "../../domain/ux-spec";
import { LocalStorageGovernanceRepository } from "../../infrastructure/persistence/local-storage-governance-repository";
import { createBrowserIdGenerator } from "../../infrastructure/platform/browser-id-generator";
import { createSystemClock } from "../../infrastructure/platform/system-clock";
import { agentPilotSeed } from "../../infrastructure/seed";
import type { Clock } from "../../ports/clock";
import type { DesignAgentProvider } from "../../ports/design-agent-provider";
import type {
  GovernanceLoadResult,
  GovernanceRepository,
} from "../../ports/governance-repository";
import type { IdGenerator } from "../../ports/id-generator";
import {
  GovernanceContext,
  type ApproveScreenArgs,
  type ApproveScreenAttemptResult,
  type GovernanceContextValue,
  type RegenerateScreenArgs,
  type RegenerateScreenAttemptResult,
  type RequestRevisionArgs,
  type RequestRevisionAttemptResult,
} from "./governance-context";

export const PERSISTENCE_RECOVERY_NOTICE =
  "Persisted demo decisions could not be restored.";

export const PERSISTENCE_SAVE_NOTICE =
  "Demo decisions could not be saved to browser storage. The session continues in memory.";

export const RESET_DEMO_ANNOUNCEMENT =
  "Demo governance state was reset. Approvals, revisions, and audit history were cleared.";

export type GovernanceProviderProps = {
  children: ReactNode;
  /** Injected UXSpec; defaults to AgentPilot seed. */
  spec?: UXSpec;
  /** Injected actor for authorization tests; product composition defaults to Approver. */
  actor?: ActorSnapshot;
  clock?: Clock;
  idGenerator?: IdGenerator;
  /** Injected repository; defaults to LocalStorageGovernanceRepository. */
  repository?: GovernanceRepository;
  /**
   * Injected DesignAgentProvider. When omitted, app composition defaults are used.
   * Feature UI must never import the mock adapter directly.
   */
  designAgentProvider?: DesignAgentProvider;
  /** Content registry for regenerated screen contentRefs. */
  contentRegistry?: ScreenContentResolver;
  /** Fixed createdAt for baseline versions (tests). */
  createdAt?: string;
};

function isThenable<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as Promise<T>).then === "function"
  );
}

function loadSync(
  repository: GovernanceRepository,
  fallback: GovernanceState,
): GovernanceLoadResult {
  const loaded = repository.load();
  if (isThenable(loaded)) {
    return { ok: false, reason: "unavailable", fallbackState: fallback };
  }
  return loaded;
}

function persistState(
  repository: GovernanceRepository,
  state: GovernanceState,
): boolean {
  const result = repository.save(state);
  if (isThenable(result)) {
    void result;
    return true;
  }
  return result.ok;
}

const SUBMIT_IN_PROGRESS = {
  ok: false as const,
  error: {
    code: "SUBMIT_IN_PROGRESS" as const,
    message: "A governance command is already in progress.",
  },
};

const REGENERATE_IN_PROGRESS = {
  ok: false as const,
  outcome: "failed" as const,
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
  designAgentProvider: designAgentProviderProp,
  contentRegistry: contentRegistryProp,
  createdAt,
}: GovernanceProviderProps) {
  const specContext = useMemo(() => specGovernanceContext(spec), [spec]);
  const repositoryRef = useRef<GovernanceRepository | null>(null);
  const baselineCreatedAtRef = useRef(createdAt ?? clock.now());
  const depsRef = useRef<{
    designAgentProvider: DesignAgentProvider;
    contentRegistry: ScreenContentResolver;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (depsRef.current === null) {
    const defaults = createDefaultGovernanceDeps({ clock, idGenerator });
    depsRef.current = {
      designAgentProvider:
        designAgentProviderProp ?? defaults.designAgentProvider,
      contentRegistry: contentRegistryProp ?? defaults.contentRegistry,
    };
  }

  if (repositoryRef.current === null) {
    const initial = createGovernanceStateFromSpec(
      spec,
      baselineCreatedAtRef.current,
    );
    repositoryRef.current =
      repositoryProp ??
      new LocalStorageGovernanceRepository({
        identity: specContext,
        fallbackState: initial,
        clock,
      });
  }

  const repository = repositoryRef.current;
  const { designAgentProvider, contentRegistry } = depsRef.current;
  const hydrationRef = useRef<{
    state: GovernanceState;
    notice: string | null;
  } | null>(null);
  if (hydrationRef.current === null) {
    const fallback = createGovernanceStateFromSpec(
      spec,
      baselineCreatedAtRef.current,
    );
    const result = loadSync(repository, fallback);
    hydrationRef.current = {
      state: result.ok ? result.state : result.fallbackState,
      notice: result.ok ? null : PERSISTENCE_RECOVERY_NOTICE,
    };
  }

  const [state, setState] = useState<GovernanceState>(
    () => hydrationRef.current!.state,
  );
  const [persistenceNotice, setPersistenceNotice] = useState<string | null>(
    () => hydrationRef.current!.notice,
  );
  const [resetAnnouncement, setResetAnnouncement] = useState<string | null>(
    null,
  );
  const actor = initialActor;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [controlledFailureArmed, setControlledFailureArmedState] =
    useState(false);
  const submittingRef = useRef(false);

  const dismissPersistenceNotice = useCallback(() => {
    setPersistenceNotice(null);
  }, []);

  const getScreen = useCallback(
    (screenId: string) => {
      const version = selectCurrentScreenVersion(state, screenId);
      if (!version) {
        return spec.screens.find((screen) => screen.id === screenId);
      }
      const resolved = resolveScreenVersionContent({
        version,
        seed: spec,
        contentRegistry,
      });
      if (resolved.ok) {
        return resolved.screen;
      }
      return spec.screens.find((screen) => screen.id === screenId);
    },
    [contentRegistry, spec, state],
  );

  const listScreenNodes = useCallback(
    (screenId: string) => {
      const screen = getScreen(screenId);
      if (!screen) {
        return [];
      }
      return listScreenNodeOptions(screen.root);
    },
    [getScreen],
  );

  const applyPersistedState = useCallback(
    (next: GovernanceState) => {
      const saved = persistState(repository, next);
      setState(next);
      if (!saved) {
        setPersistenceNotice(PERSISTENCE_SAVE_NOTICE);
      }
    },
    [repository],
  );

  const setControlledFailureArmed = useCallback(
    (armed: boolean) => {
      setControlledFailureArmedState(armed);
      armControlledProviderFailure(designAgentProvider, armed);
    },
    [designAgentProvider],
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
          applyPersistedState(result.state);
        }

        return result;
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [actor, applyPersistedState, clock, idGenerator, specContext, state],
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
          applyPersistedState(result.state);
        }

        return result;
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [
      actor,
      applyPersistedState,
      clock,
      getScreen,
      idGenerator,
      specContext,
      state,
    ],
  );

  const cancelRegeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const regenerateScreen = useCallback(
    async (
      args: RegenerateScreenArgs,
    ): Promise<RegenerateScreenAttemptResult> => {
      if (submittingRef.current) {
        return REGENERATE_IN_PROGRESS;
      }

      const effectiveActor = args.actor ?? actor;
      submittingRef.current = true;
      setIsSubmitting(true);
      setIsRegenerating(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await executeRegenerateScreen(
          state,
          {
            ...specContext,
            screenId: args.screenId,
            expectedScreenVersionId: args.expectedScreenVersionId,
            actor: effectiveActor,
            signal: controller.signal,
          },
          {
            clock,
            idGenerator,
            provider: designAgentProvider,
            seed: spec,
            contentRegistry,
          },
        );

        applyPersistedState(result.state);
        if (controlledFailureArmed) {
          setControlledFailureArmed(false);
        }
        return result;
      } finally {
        abortControllerRef.current = null;
        submittingRef.current = false;
        setIsSubmitting(false);
        setIsRegenerating(false);
      }
    },
    [
      actor,
      applyPersistedState,
      clock,
      contentRegistry,
      controlledFailureArmed,
      designAgentProvider,
      idGenerator,
      setControlledFailureArmed,
      spec,
      specContext,
      state,
    ],
  );

  const resetDemoState = useCallback(() => {
    abortControllerRef.current?.abort();
    void repository.reset();
    const resetResult = reduceGovernance(state, { type: "storageReset" });
    const next = resetResult.ok
      ? resetResult.state
      : createGovernanceStateFromSpec(spec, baselineCreatedAtRef.current);
    setState(next);
    setPersistenceNotice(null);
    setResetAnnouncement(RESET_DEMO_ANNOUNCEMENT);
    setControlledFailureArmed(false);
  }, [repository, setControlledFailureArmed, spec, state]);

  const value = useMemo<GovernanceContextValue>(
    () => ({
      state,
      actor,
      isSubmitting,
      isRegenerating,
      canApprove: selectCanApprove(actor),
      canRequestRevision: selectCanRequestRevision(actor),
      canRegenerate: selectCanRegenerate(actor),
      controlledFailureArmed,
      setControlledFailureArmed,
      persistenceNotice,
      dismissPersistenceNotice,
      resetAnnouncement,
      approveScreen,
      requestRevision,
      regenerateScreen,
      cancelRegeneration,
      resetDemoState,
      getScreen,
      listScreenNodes,
      getScreenStatus: (screenId) => selectScreenStatus(state, screenId),
      getCurrentScreenVersion: (screenId) =>
        selectCurrentScreenVersion(state, screenId),
      getLatestRevisionForScreen: (screenId) =>
        selectLatestRevisionRequest(state, screenId),
      getApprovalProgress: () => selectApprovalProgress(state),
      isGateComplete: () => selectIsGateComplete(state),
    }),
    [
      actor,
      approveScreen,
      cancelRegeneration,
      controlledFailureArmed,
      dismissPersistenceNotice,
      getScreen,
      isRegenerating,
      isSubmitting,
      listScreenNodes,
      persistenceNotice,
      regenerateScreen,
      requestRevision,
      resetAnnouncement,
      resetDemoState,
      setControlledFailureArmed,
      state,
    ],
  );

  return (
    <GovernanceContext.Provider value={value}>
      {children}
    </GovernanceContext.Provider>
  );
}
