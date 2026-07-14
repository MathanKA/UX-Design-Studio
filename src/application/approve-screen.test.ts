import { describe, expect, it } from "vitest";
import {
  baselineScreenVersionId,
  createInitialGovernanceState,
  selectIsGateComplete,
  selectScreenStatus,
  type ActorSnapshot,
} from "../domain/governance";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../test/governance-ports";
import { approveScreen } from "./approve-screen";
import { DEMO_APPROVER } from "./governance-session";

const PROJECT_ID = "project-agentpilot";
const SPEC_ID = "spec-agentpilot";
const SPEC_VERSION = "1.0.0";
const BASELINE_VERSION = "1.0.0";
const SCREEN_A = "screen-dashboard";
const SCREEN_B = "screen-login";

const reviewer: ActorSnapshot = {
  id: "demo-reviewer",
  role: "reviewer",
  displayLabel: "Demo Reviewer",
};

function createState() {
  return createInitialGovernanceState({
    projectId: PROJECT_ID,
    specId: SPEC_ID,
    specVersion: SPEC_VERSION,
    baselineVersion: BASELINE_VERSION,
    requiredScreenIds: [SCREEN_A, SCREEN_B],
    createdAt: "2026-07-15T01:00:00.000Z",
  });
}

function createPorts() {
  return {
    clock: createFixedClock("2026-07-15T02:00:00.000Z"),
    idGenerator: createSequentialIdGenerator(1),
  };
}

describe("approveScreen use case", () => {
  it("approves the current screen version and records actor metadata", () => {
    const state = createState();
    const result = approveScreen(
      state,
      {
        projectId: PROJECT_ID,
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
        screenId: SCREEN_A,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: DEMO_APPROVER,
        comment: "Looks good",
      },
      createPorts(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.event.type).toBe("screen.approved");
    expect(result.event.actor).toEqual(DEMO_APPROVER);
    expect(result.event.screenVersionId).toBe(baselineScreenVersionId(SCREEN_A));
    expect(result.event.payload.comment).toBe("Looks good");
    expect(selectScreenStatus(result.state, SCREEN_A)).toBe("approved");
    expect(selectScreenStatus(result.state, SCREEN_B)).toBe("not_reviewed");
    expect(result.state.events).toHaveLength(1);
  });

  it("rejects stale screen versions", () => {
    const state = createState();
    const result = approveScreen(
      state,
      {
        projectId: PROJECT_ID,
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
        screenId: SCREEN_A,
        expectedScreenVersionId: "sv-stale",
        actor: DEMO_APPROVER,
      },
      createPorts(),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("STALE_SCREEN_VERSION");
    expect(state.events).toHaveLength(0);
  });

  it("denies actors without screen.approve capability", () => {
    const state = createState();
    const result = approveScreen(
      state,
      {
        projectId: PROJECT_ID,
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
        screenId: SCREEN_A,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: reviewer,
      },
      createPorts(),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CAPABILITY_DENIED");
  });

  it("rejects repeat approval of an already-approved version", () => {
    const state = createState();
    const ports = createPorts();
    const input = {
      projectId: PROJECT_ID,
      specId: SPEC_ID,
      specVersion: SPEC_VERSION,
      baselineVersion: BASELINE_VERSION,
      screenId: SCREEN_A,
      expectedScreenVersionId: baselineScreenVersionId(SCREEN_A),
      actor: DEMO_APPROVER,
    };

    const first = approveScreen(state, input, ports);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = approveScreen(first.state, input, ports);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.code).toBe("INVALID_COMMAND");
    expect(first.state.events).toHaveLength(1);
    expect(selectIsGateComplete(first.state)).toBe(false);
  });
});
