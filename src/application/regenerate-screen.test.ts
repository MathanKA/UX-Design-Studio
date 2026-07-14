import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendGovernanceEvent,
  baselineScreenVersionId,
  createInitialGovernanceState,
  createRequestRevisionEvent,
  selectCurrentScreenVersion,
  selectScreenStatus,
  type ActorSnapshot,
  type GovernanceState,
} from "../domain/governance";
import type { DesignAgentProvider } from "../ports/design-agent-provider";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../test/governance-ports";
import {
  AGENTPILOT_DASHBOARD_V2_CONTENT_REF,
  createAgentPilotContentRegistry,
} from "../infrastructure/seed/agentpilot-variants";
import { agentPilotSeed } from "../infrastructure/seed";
import {
  MOCK_DESIGN_AGENT_LATENCY_MS,
  MockDesignAgentProvider,
} from "../infrastructure/providers/mock-design-agent-provider";
import { DEMO_APPROVER, DEMO_REVIEWER } from "./governance-session";
import {
  regenerateScreen,
  rejectIfStaleAsyncCompletion,
  type RegenerateScreenPorts,
} from "./regenerate-screen";
import { resolveScreenVersionContent } from "./screen-version-content";

const SCREEN_ID = "screen-dashboard";

function createState(): GovernanceState {
  return createInitialGovernanceState({
    projectId: agentPilotSeed.projectId,
    specId: agentPilotSeed.id,
    specVersion: agentPilotSeed.version,
    baselineVersion: agentPilotSeed.baselineVersion,
    requiredScreenIds: agentPilotSeed.screens.map((screen) => screen.id),
    createdAt: "2026-07-15T01:00:00.000Z",
  });
}

function createPorts(
  overrides?: Partial<RegenerateScreenPorts> & {
    controlledFailure?: boolean;
  },
): RegenerateScreenPorts {
  const clock = overrides?.clock ?? createFixedClock("2026-07-15T07:00:00.000Z");
  const idGenerator =
    overrides?.idGenerator ?? createSequentialIdGenerator(1);
  return {
    clock,
    idGenerator,
    provider:
      overrides?.provider ??
      new MockDesignAgentProvider({
        clock,
        idGenerator,
        controlledFailure: overrides?.controlledFailure === true,
      }),
    seed: overrides?.seed ?? agentPilotSeed,
    contentRegistry:
      overrides?.contentRegistry ?? createAgentPilotContentRegistry(),
  };
}

function withRevision(state: GovernanceState, actor: ActorSnapshot = DEMO_APPROVER) {
  const ports = {
    clock: createFixedClock("2026-07-15T07:00:00.000Z"),
    idGenerator: createSequentialIdGenerator(100),
  };
  const revision = createRequestRevisionEvent(
    state,
    {
      projectId: agentPilotSeed.projectId,
      specId: agentPilotSeed.id,
      specVersion: agentPilotSeed.version,
      baselineVersion: agentPilotSeed.baselineVersion,
      screenId: SCREEN_ID,
      expectedScreenVersionId: baselineScreenVersionId(SCREEN_ID),
      actor,
      affectedNodeIds: ["dashboard-title"],
      category: "layout",
      description: "Please improve the dashboard hierarchy for Approvers.",
    },
    ports,
  );
  if (!revision.ok) {
    throw new Error(revision.error.message);
  }
  const appended = appendGovernanceEvent(state, revision.value);
  if (!appended.ok) {
    throw new Error(appended.error.message);
  }
  return { state: appended.state, revisionEventId: revision.value.id };
}

describe("regenerateScreen use case", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("activates a regenerated Dashboard version with contentRef", async () => {
    const prepared = withRevision(createState());
    const ports = createPorts();
    const pending = regenerateScreen(
      prepared.state,
      {
        projectId: agentPilotSeed.projectId,
        specId: agentPilotSeed.id,
        specVersion: agentPilotSeed.version,
        baselineVersion: agentPilotSeed.baselineVersion,
        screenId: SCREEN_ID,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_ID),
        actor: DEMO_APPROVER,
      },
      ports,
    );

    await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS);
    const result = await pending;
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.outcome).toBe("activated");
    expect(result.version.source).toBe("regenerated");
    expect(result.version.contentRef).toBe(AGENTPILOT_DASHBOARD_V2_CONTENT_REF);
    expect(result.regeneratedEvent.payload.contentRef).toBe(
      AGENTPILOT_DASHBOARD_V2_CONTENT_REF,
    );
    expect(selectScreenStatus(result.state, SCREEN_ID)).toBe("ready_for_review");
    expect(selectCurrentScreenVersion(result.state, SCREEN_ID)?.id).toBe(
      result.version.id,
    );
  });

  it("requires the latest current-version revision", async () => {
    const result = await regenerateScreen(
      createState(),
      {
        projectId: agentPilotSeed.projectId,
        specId: agentPilotSeed.id,
        specVersion: agentPilotSeed.version,
        baselineVersion: agentPilotSeed.baselineVersion,
        screenId: SCREEN_ID,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_ID),
        actor: DEMO_APPROVER,
      },
      createPorts(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_REVISION_REFERENCE");
  });

  it("denies non-Approver actors", async () => {
    const prepared = withRevision(createState());
    const result = await regenerateScreen(
      prepared.state,
      {
        projectId: agentPilotSeed.projectId,
        specId: agentPilotSeed.id,
        specVersion: agentPilotSeed.version,
        baselineVersion: agentPilotSeed.baselineVersion,
        screenId: SCREEN_ID,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_ID),
        actor: DEMO_REVIEWER,
      },
      createPorts(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CAPABILITY_DENIED");
  });

  it("cancels and retains the current version", async () => {
    const prepared = withRevision(createState());
    const ports = createPorts();
    const controller = new AbortController();
    const pending = regenerateScreen(
      prepared.state,
      {
        projectId: agentPilotSeed.projectId,
        specId: agentPilotSeed.id,
        specVersion: agentPilotSeed.version,
        baselineVersion: agentPilotSeed.baselineVersion,
        screenId: SCREEN_ID,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_ID),
        actor: DEMO_APPROVER,
        signal: controller.signal,
      },
      ports,
    );

    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    const result = await pending;
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.outcome).toBe("cancelled");
    expect(selectCurrentScreenVersion(result.state, SCREEN_ID)?.id).toBe(
      baselineScreenVersionId(SCREEN_ID),
    );
    expect(selectScreenStatus(result.state, SCREEN_ID)).toBe("changes_requested");
  });

  it("records controlled provider failure and retains current version", async () => {
    const prepared = withRevision(createState());
    const ports = createPorts({ controlledFailure: true });
    const pending = regenerateScreen(
      prepared.state,
      {
        projectId: agentPilotSeed.projectId,
        specId: agentPilotSeed.id,
        specVersion: agentPilotSeed.version,
        baselineVersion: agentPilotSeed.baselineVersion,
        screenId: SCREEN_ID,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_ID),
        actor: DEMO_APPROVER,
      },
      ports,
    );
    await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS);
    const result = await pending;
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.outcome).toBe("failed");
    expect(selectCurrentScreenVersion(result.state, SCREEN_ID)?.id).toBe(
      baselineScreenVersionId(SCREEN_ID),
    );
  });

  it("rejects invalid provider output without activating", async () => {
    const prepared = withRevision(createState());
    const invalidProvider: DesignAgentProvider = {
      async regenerateScreen() {
        return {
          providerRequestId: "provider-req-bad",
          generatedAt: "2026-07-15T07:00:00.000Z",
          contentRef: AGENTPILOT_DASHBOARD_V2_CONTENT_REF,
          screen: {
            id: "screen-other",
            name: "Other",
            routeKey: "other",
            root: { id: "root", type: "stack", children: [] },
          },
        };
      },
    };
    const result = await regenerateScreen(
      prepared.state,
      {
        projectId: agentPilotSeed.projectId,
        specId: agentPilotSeed.id,
        specVersion: agentPilotSeed.version,
        baselineVersion: agentPilotSeed.baselineVersion,
        screenId: SCREEN_ID,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_ID),
        actor: DEMO_APPROVER,
      },
      createPorts({ provider: invalidProvider }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_PROVIDER_OUTPUT");
    expect(selectCurrentScreenVersion(result.state, SCREEN_ID)?.id).toBe(
      baselineScreenVersionId(SCREEN_ID),
    );
  });

  it("rejects stale async completion", () => {
    const state = createState();
    const stale = rejectIfStaleAsyncCompletion(
      state,
      SCREEN_ID,
      "sv-screen-dashboard-not-current",
    );
    expect(stale?.code).toBe("STALE_ASYNC_COMPLETION");

    const fresh = rejectIfStaleAsyncCompletion(
      state,
      SCREEN_ID,
      baselineScreenVersionId(SCREEN_ID),
    );
    expect(fresh).toBeNull();
  });

  it("resolves regenerated content after reload via contentRef registry", async () => {
    const prepared = withRevision(createState());
    const ports = createPorts();
    const pending = regenerateScreen(
      prepared.state,
      {
        projectId: agentPilotSeed.projectId,
        specId: agentPilotSeed.id,
        specVersion: agentPilotSeed.version,
        baselineVersion: agentPilotSeed.baselineVersion,
        screenId: SCREEN_ID,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_ID),
        actor: DEMO_APPROVER,
      },
      ports,
    );
    await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS);
    const result = await pending;
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const version = selectCurrentScreenVersion(result.state, SCREEN_ID);
    expect(version?.contentRef).toBe(AGENTPILOT_DASHBOARD_V2_CONTENT_REF);

    const resolved = resolveScreenVersionContent({
      version: version!,
      seed: agentPilotSeed,
      contentRegistry: createAgentPilotContentRegistry(),
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.screen.root.children?.some((node) => node.id === "dashboard-feedback")).toBe(
      true,
    );
    expect(
      agentPilotSeed.screens.find((screen) => screen.id === SCREEN_ID)?.root
        .children?.some((node) => node.id === "dashboard-feedback"),
    ).toBe(false);
  });
});
