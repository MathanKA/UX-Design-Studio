import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../../test/governance-ports";
import {
  AGENTPILOT_DASHBOARD_V2_CONTENT_REF,
  agentPilotDashboardVariantV2,
} from "../seed/agentpilot-variants";
import { agentPilotSeed } from "../seed";
import {
  MOCK_DESIGN_AGENT_LATENCY_MS,
  MockDesignAgentProvider,
  MockDesignAgentProviderError,
} from "./mock-design-agent-provider";

const dashboard = agentPilotSeed.screens.find(
  (screen) => screen.id === "screen-dashboard",
);

describe("MockDesignAgentProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the deterministic Dashboard variant after 900ms", async () => {
    const provider = new MockDesignAgentProvider({
      clock: createFixedClock("2026-07-15T06:00:00.000Z"),
      idGenerator: createSequentialIdGenerator(1),
    });

    if (!dashboard) {
      throw new Error("missing dashboard seed");
    }

    const pending = provider.regenerateScreen({
      projectId: agentPilotSeed.projectId,
      specId: agentPilotSeed.id,
      specVersion: agentPilotSeed.version,
      baselineVersion: agentPilotSeed.baselineVersion,
      screen: dashboard,
      currentVersionId: "sv-screen-dashboard-baseline",
      revision: {
        affectedNodeIds: ["dashboard-title"],
        category: "layout",
        description: "Improve hierarchy",
      },
    });

    await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS - 1);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;
    expect(result.contentRef).toBe(AGENTPILOT_DASHBOARD_V2_CONTENT_REF);
    expect(result.screen).toEqual(agentPilotDashboardVariantV2);
    expect(result.providerRequestId).toBe("provider-req-1");
    expect(result.generatedAt).toBe("2026-07-15T06:00:00.000Z");
  });

  it("aborts when AbortSignal fires during latency", async () => {
    const provider = new MockDesignAgentProvider({
      clock: createFixedClock("2026-07-15T06:00:00.000Z"),
      idGenerator: createSequentialIdGenerator(1),
    });
    if (!dashboard) {
      throw new Error("missing dashboard seed");
    }

    const controller = new AbortController();
    const pending = provider.regenerateScreen(
      {
        projectId: agentPilotSeed.projectId,
        specId: agentPilotSeed.id,
        specVersion: agentPilotSeed.version,
        baselineVersion: agentPilotSeed.baselineVersion,
        screen: dashboard,
        currentVersionId: "sv-screen-dashboard-baseline",
        revision: {
          affectedNodeIds: [],
          category: "content",
          description: "Abort me",
        },
      },
      controller.signal,
    );

    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("simulates controlled failure for the next call only", async () => {
    const provider = new MockDesignAgentProvider({
      clock: createFixedClock("2026-07-15T06:00:00.000Z"),
      idGenerator: createSequentialIdGenerator(1),
      controlledFailure: true,
    });
    if (!dashboard) {
      throw new Error("missing dashboard seed");
    }

    const request = {
      projectId: agentPilotSeed.projectId,
      specId: agentPilotSeed.id,
      specVersion: agentPilotSeed.version,
      baselineVersion: agentPilotSeed.baselineVersion,
      screen: dashboard,
      currentVersionId: "sv-screen-dashboard-baseline",
      revision: {
        affectedNodeIds: [],
        category: "content" as const,
        description: "Fail once",
      },
    };

    const first = provider.regenerateScreen(request);
    const firstExpectation = expect(first).rejects.toBeInstanceOf(
      MockDesignAgentProviderError,
    );
    await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS);
    await firstExpectation;

    const second = provider.regenerateScreen(request);
    const secondExpectation = expect(second).resolves.toMatchObject({
      contentRef: AGENTPILOT_DASHBOARD_V2_CONTENT_REF,
    });
    await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS);
    await secondExpectation;
  });

  it("never uses network APIs", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const provider = new MockDesignAgentProvider({
      clock: createFixedClock("2026-07-15T06:00:00.000Z"),
      idGenerator: createSequentialIdGenerator(1),
    });
    if (!dashboard) {
      throw new Error("missing dashboard seed");
    }

    const pending = provider.regenerateScreen({
      projectId: agentPilotSeed.projectId,
      specId: agentPilotSeed.id,
      specVersion: agentPilotSeed.version,
      baselineVersion: agentPilotSeed.baselineVersion,
      screen: dashboard,
      currentVersionId: "sv-screen-dashboard-baseline",
      revision: {
        affectedNodeIds: [],
        category: "content",
        description: "No network",
      },
    });
    await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS);
    await pending;
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
