import { describe, expect, it, vi } from "vitest";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../test/governance-ports";
import {
  appendGovernanceEvent,
  createApproveScreenEvent,
  createInitialGovernanceState,
  selectCurrentScreenVersion,
  type GovernanceEvent,
  type GovernanceState,
} from "../domain/governance";
import { createGateEventTracker, deriveGateStatus } from "./gate-events";

const ports = {
  clock: createFixedClock("2026-01-01T00:00:00.000Z"),
  idGenerator: createSequentialIdGenerator(1),
};

function baselineState(): GovernanceState {
  return createInitialGovernanceState({
    projectId: "project-agentpilot",
    specId: "spec-agentpilot",
    specVersion: "1.0.0",
    baselineVersion: "1.0.0",
    requiredScreenIds: ["screen-a", "screen-b"],
    createdAt: "2026-01-01T00:00:00.000Z",
  });
}

function appendOk(state: GovernanceState, event: GovernanceEvent): GovernanceState {
  const result = appendGovernanceEvent(state, event);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.state;
}

function approve(state: GovernanceState, screenId: string): GovernanceState {
  const current = selectCurrentScreenVersion(state, screenId);
  if (!current) {
    throw new Error(`missing version for ${screenId}`);
  }
  const created = createApproveScreenEvent(
    state,
    {
      projectId: "project-agentpilot",
      specId: "spec-agentpilot",
      specVersion: "1.0.0",
      baselineVersion: "1.0.0",
      screenId,
      expectedScreenVersionId: current.id,
      actor: {
        id: "demo-approver",
        displayLabel: "Demo Approver",
        role: "approver",
      },
    },
    ports,
  );
  if (!created.ok) {
    throw new Error(created.error.message);
  }
  return appendOk(state, created.value);
}

describe("gate event tracker", () => {
  it("emits initial status without navigating when already approved", () => {
    let state = baselineState();
    state = approve(state, "screen-a");
    state = approve(state, "screen-b");
    expect(deriveGateStatus(state)).toBe("approved");

    const onGateStatusChange = vi.fn();
    const onNavigateToAgileEditor = vi.fn();
    const tracker = createGateEventTracker(
      { projectId: "project-agentpilot", baselineVersion: "1.0.0" },
      { onGateStatusChange, onNavigateToAgileEditor },
    );

    tracker.observe(state);
    expect(onGateStatusChange).toHaveBeenCalledTimes(1);
    expect(onGateStatusChange).toHaveBeenCalledWith("approved");
    expect(onNavigateToAgileEditor).not.toHaveBeenCalled();
  });

  it("navigates once on in_review to approved transition and deduplicates", () => {
    let state = baselineState();
    const onGateStatusChange = vi.fn();
    const onNavigateToAgileEditor = vi.fn();
    const tracker = createGateEventTracker(
      { projectId: "project-agentpilot", baselineVersion: "1.0.0" },
      { onGateStatusChange, onNavigateToAgileEditor },
    );

    tracker.observe(state);
    expect(onGateStatusChange).toHaveBeenCalledWith("in_review");
    expect(onNavigateToAgileEditor).not.toHaveBeenCalled();

    state = approve(state, "screen-a");
    tracker.observe(state);
    expect(onNavigateToAgileEditor).not.toHaveBeenCalled();

    state = approve(state, "screen-b");
    tracker.observe(state);
    tracker.observe(state);
    expect(onGateStatusChange).toHaveBeenLastCalledWith("approved");
    expect(onNavigateToAgileEditor).toHaveBeenCalledTimes(1);
  });
});
