import { describe, expect, it } from "vitest";
import {
  baselineScreenVersionId,
  createInitialGovernanceState,
  hasCapability,
  selectIsScreenApproved,
  selectScreenStatus,
  type ActorSnapshot,
  type ComponentNodeId,
} from "../domain/governance";
import type { ComponentNode } from "../domain/ux-spec";
import { agentPilotSeed } from "../infrastructure/seed";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../test/governance-ports";
import { approveScreen } from "./approve-screen";
import {
  DEMO_APPROVER,
  DEMO_REVIEWER,
  DEMO_VIEWER,
} from "./governance-session";
import {
  MIN_REVISION_DESCRIPTION_LENGTH,
  requestRevision,
} from "./request-revision";

const PROJECT_ID = "project-agentpilot";
const SPEC_ID = "spec-agentpilot";
const SPEC_VERSION = "1.0.0";
const BASELINE_VERSION = "1.0.0";
const SCREEN_A = "screen-dashboard";
const SCREEN_B = "screen-login";

const dashboardRoot =
  agentPilotSeed.screens.find((screen) => screen.id === SCREEN_A)?.root ??
  ({
    id: "dashboard-root",
    type: "stack",
    children: [{ id: "dashboard-title", type: "text" }],
  } satisfies ComponentNode);

const loginRoot =
  agentPilotSeed.screens.find((screen) => screen.id === SCREEN_B)?.root ??
  ({
    id: "login-root",
    type: "stack",
    children: [{ id: "login-title", type: "text" }],
  } satisfies ComponentNode);

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

function revisionInput(
  overrides: Partial<{
    actor: ActorSnapshot;
    affectedNodeIds: readonly ComponentNodeId[];
    category: string;
    description: string;
    expectedScreenVersionId: string;
    screenRoot: ComponentNode;
    screenId: string;
  }> = {},
) {
  return {
    projectId: PROJECT_ID,
    specId: SPEC_ID,
    specVersion: SPEC_VERSION,
    baselineVersion: BASELINE_VERSION,
    screenId: overrides.screenId ?? SCREEN_A,
    expectedScreenVersionId:
      overrides.expectedScreenVersionId ?? baselineScreenVersionId(SCREEN_A),
    actor: overrides.actor ?? DEMO_APPROVER,
    affectedNodeIds: overrides.affectedNodeIds ?? ["dashboard-title"],
    category: (overrides.category ?? "content") as "content",
    description:
      overrides.description ?? "Please tighten the dashboard title copy.",
    screenRoot: overrides.screenRoot ?? dashboardRoot,
  };
}

describe("requestRevision use case", () => {
  it("appends a revision event for Approver with required metadata", () => {
    const state = createState();
    const result = requestRevision(state, revisionInput(), createPorts());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.event.type).toBe("screen.revision_requested");
    expect(result.event.actor).toEqual(DEMO_APPROVER);
    expect(result.event.screenId).toBe(SCREEN_A);
    expect(result.event.screenVersionId).toBe(baselineScreenVersionId(SCREEN_A));
    expect(result.event.specVersion).toBe(SPEC_VERSION);
    expect(result.event.baselineVersion).toBe(BASELINE_VERSION);
    expect(result.event.payload).toEqual({
      affectedNodeIds: ["dashboard-title"],
      category: "content",
      description: "Please tighten the dashboard title copy.",
    });
    expect(selectScreenStatus(result.state, SCREEN_A)).toBe("changes_requested");
    expect(selectScreenStatus(result.state, SCREEN_B)).toBe("not_reviewed");
    expect(result.state.events).toHaveLength(1);
  });

  it("invalidates prior approval for the same screen only", () => {
    const ports = createPorts();
    const approved = approveScreen(
      createState(),
      {
        projectId: PROJECT_ID,
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
        screenId: SCREEN_A,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: DEMO_APPROVER,
      },
      ports,
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(selectIsScreenApproved(approved.state, SCREEN_A)).toBe(true);

    const revised = requestRevision(approved.state, revisionInput(), ports);
    expect(revised.ok).toBe(true);
    if (!revised.ok) return;

    expect(selectScreenStatus(revised.state, SCREEN_A)).toBe("changes_requested");
    expect(selectIsScreenApproved(revised.state, SCREEN_A)).toBe(false);
    expect(selectScreenStatus(revised.state, SCREEN_B)).toBe("not_reviewed");
  });

  it("denies Reviewer and Viewer without appending events", () => {
    for (const actor of [DEMO_REVIEWER, DEMO_VIEWER]) {
      const state = createState();
      const result = requestRevision(
        state,
        revisionInput({ actor }),
        createPorts(),
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("CAPABILITY_DENIED");
      expect(state.events).toHaveLength(0);
    }
  });

  it("models screen.regenerate capability for Approver without regenerating", () => {
    expect(hasCapability(DEMO_APPROVER.role, "screen.regenerate")).toBe(true);
    expect(hasCapability(DEMO_REVIEWER.role, "screen.regenerate")).toBe(false);
    expect(hasCapability(DEMO_VIEWER.role, "screen.regenerate")).toBe(false);
  });

  it("rejects empty, short, and oversized descriptions", () => {
    const empty = requestRevision(
      createState(),
      revisionInput({ description: "   " }),
      createPorts(),
    );
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.error.code).toBe("INVALID_COMMAND");

    const short = requestRevision(
      createState(),
      revisionInput({ description: "short" }),
      createPorts(),
    );
    expect(short.ok).toBe(false);
    if (short.ok) return;
    expect(short.error.message).toContain(
      String(MIN_REVISION_DESCRIPTION_LENGTH),
    );

    const oversized = requestRevision(
      createState(),
      revisionInput({ description: "x".repeat(2001) }),
      createPorts(),
    );
    expect(oversized.ok).toBe(false);
    if (oversized.ok) return;
    expect(oversized.error.code).toBe("INVALID_COMMAND");
  });

  it("rejects empty node sets, duplicates, and cross-screen nodes", () => {
    const emptyNodes = requestRevision(
      createState(),
      revisionInput({ affectedNodeIds: [] }),
      createPorts(),
    );
    expect(emptyNodes.ok).toBe(false);
    if (emptyNodes.ok) return;
    expect(emptyNodes.error.message).toMatch(/at least one affected node/i);

    const duplicates = requestRevision(
      createState(),
      revisionInput({
        affectedNodeIds: ["dashboard-title", "dashboard-title"],
      }),
      createPorts(),
    );
    expect(duplicates.ok).toBe(false);
    if (duplicates.ok) return;
    expect(duplicates.error.message).toMatch(/duplicates/i);

    const crossScreen = requestRevision(
      createState(),
      revisionInput({
        affectedNodeIds: ["login-title"],
        screenRoot: dashboardRoot,
      }),
      createPorts(),
    );
    expect(crossScreen.ok).toBe(false);
    if (crossScreen.ok) return;
    expect(crossScreen.error.message).toMatch(/not part of the active screen/i);
    expect(createState().events).toHaveLength(0);
  });

  it("rejects non-allowlisted categories", () => {
    const result = requestRevision(
      createState(),
      {
        ...revisionInput(),
        category: "not-a-category" as "content",
      },
      createPorts(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/allowlisted/i);
  });

  it("rejects stale screen versions without appending", () => {
    const state = createState();
    const result = requestRevision(
      state,
      revisionInput({ expectedScreenVersionId: "sv-stale" }),
      createPorts(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("STALE_SCREEN_VERSION");
    expect(state.events).toHaveLength(0);
  });

  it("accepts multiple active-screen nodes from the login tree", () => {
    const result = requestRevision(
      createState(),
      revisionInput({
        screenId: SCREEN_B,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_B),
        affectedNodeIds: ["login-email", "login-password"],
        screenRoot: loginRoot,
        category: "layout",
        description: "Align login fields for denser mobile layout.",
      }),
      createPorts(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event.payload.affectedNodeIds).toEqual([
      "login-email",
      "login-password",
    ]);
    expect(result.event.payload.category).toBe("layout");
  });
});
