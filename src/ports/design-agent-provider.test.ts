import { describe, expect, it } from "vitest";
import type {
  DesignAgentProvider,
  RegenerateScreenRequest,
  RegenerateScreenResult,
} from "./design-agent-provider";

describe("DesignAgentProvider port", () => {
  it("exposes regenerateScreen with AbortSignal support", async () => {
    const provider: DesignAgentProvider = {
      async regenerateScreen(
        _request: RegenerateScreenRequest,
        signal?: AbortSignal,
      ): Promise<RegenerateScreenResult> {
        expect(signal).toBeUndefined();
        return {
          providerRequestId: "provider-req-1",
          generatedAt: "2026-07-15T00:00:00.000Z",
          contentRef: "agentpilot.dashboard.v2",
          screen: {
            id: "screen-dashboard",
            name: "Dashboard",
            routeKey: "dashboard",
            root: { id: "root", type: "stack", children: [] },
          },
        };
      },
    };

    const result = await provider.regenerateScreen({
      projectId: "project-agentpilot",
      specId: "spec-agentpilot",
      specVersion: "1.0.0",
      baselineVersion: "1.0.0",
      screen: {
        id: "screen-dashboard",
        name: "Dashboard",
        routeKey: "dashboard",
        root: { id: "root", type: "stack", children: [] },
      },
      currentVersionId: "sv-screen-dashboard-baseline",
      revision: {
        affectedNodeIds: [],
        category: "content",
        description: "Port contract",
      },
    });

    expect(result.contentRef).toBe("agentpilot.dashboard.v2");
  });
});
