import { describe, expect, it, vi } from "vitest";
import { parseUxDesignStudioRemoteProps } from "./parse-contract";

const validActor = {
  id: "demo-approver",
  displayLabel: "Demo Approver",
  role: "approver" as const,
};

describe("parseUxDesignStudioRemoteProps", () => {
  it("accepts a valid AgentPilot host contract", () => {
    const onGateStatusChange = vi.fn();
    const result = parseUxDesignStudioRemoteProps({
      projectId: "project-agentpilot",
      baselineVersion: "1.0.0",
      basePath: "/projects/project-agentpilot/ux-design-studio/",
      actor: validActor,
      onGateStatusChange,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.basePath).toBe(
      "/projects/project-agentpilot/ux-design-studio",
    );
    expect(result.value.onGateStatusChange).toBe(onGateStatusChange);
  });

  it("rejects an unsupported project id", () => {
    const result = parseUxDesignStudioRemoteProps({
      projectId: "project-other",
      baselineVersion: "1.0.0",
      basePath: "/projects/project-other/ux-design-studio",
      actor: validActor,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("UNSUPPORTED_PROJECT");
  });

  it("rejects invalid actor and baseline payloads", () => {
    expect(
      parseUxDesignStudioRemoteProps({
        projectId: "project-agentpilot",
        baselineVersion: "",
        basePath: "/x",
        actor: validActor,
      }).ok,
    ).toBe(false);

    expect(
      parseUxDesignStudioRemoteProps({
        projectId: "project-agentpilot",
        baselineVersion: "1.0.0",
        basePath: "/x",
        actor: { id: "", displayLabel: "X", role: "approver" },
      }).ok,
    ).toBe(false);
  });
});
