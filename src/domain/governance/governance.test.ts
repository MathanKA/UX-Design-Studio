import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../../test/governance-ports";
import {
  appendGovernanceEvent,
  assertCapability,
  baselineScreenVersionId,
  createApproveScreenEvent,
  createBeginRegenerationEvent,
  createEventMetadata,
  createInitialGovernanceState,
  createRegeneratedEvent,
  createRegenerationFailedEvent,
  createRequestRevisionEvent,
  foldGovernanceEvents,
  governanceEventSchema,
  hasCapability,
  reduceGovernance,
  selectApprovalProgress,
  selectCanApprove,
  selectCanRegenerate,
  selectCanRequestRevision,
  selectChronologicalEvents,
  selectCurrentScreenVersion,
  selectEventsForScreen,
  selectIsGateComplete,
  selectScreenStatus,
  type ActorSnapshot,
  type GovernanceEvent,
  type GovernanceState,
} from "./index";

const PROJECT_ID = "project-agentpilot";
const SPEC_ID = "spec-agentpilot";
const SPEC_VERSION = "1.0.0";
const BASELINE_VERSION = "1.0.0";
const SCREEN_A = "screen-dashboard";
const SCREEN_B = "screen-login";
const SCREEN_C = "screen-task-detail";
const REQUIRED = [SCREEN_A, SCREEN_B, SCREEN_C] as const;

const approver: ActorSnapshot = {
  id: "actor-approver",
  role: "approver",
  displayLabel: "Demo Approver",
};

const reviewer: ActorSnapshot = {
  id: "actor-reviewer",
  role: "reviewer",
  displayLabel: "Demo Reviewer",
};

const fixedNow = "2026-07-15T01:00:00.000Z";

function createPorts() {
  return {
    clock: createFixedClock(fixedNow),
    idGenerator: createSequentialIdGenerator(1),
  };
}

function createState(
  screenIds: readonly string[] = REQUIRED,
): GovernanceState {
  return createInitialGovernanceState({
    projectId: PROJECT_ID,
    specId: SPEC_ID,
    specVersion: SPEC_VERSION,
    baselineVersion: BASELINE_VERSION,
    requiredScreenIds: screenIds,
    createdAt: fixedNow,
  });
}

function baseCommand(screenId: string, state: GovernanceState) {
  const current = selectCurrentScreenVersion(state, screenId);
  if (!current) {
    throw new Error(`missing version for ${screenId}`);
  }
  return {
    projectId: PROJECT_ID,
    specId: SPEC_ID,
    specVersion: SPEC_VERSION,
    baselineVersion: BASELINE_VERSION,
    screenId,
    expectedScreenVersionId: current.id,
    actor: approver,
  };
}

function appendOk(
  state: GovernanceState,
  event: GovernanceEvent,
): GovernanceState {
  const result = appendGovernanceEvent(state, event);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.state;
}

describe("governance domain", () => {
  describe("event creation and shared metadata", () => {
    it("creates every event variant with shared baseline metadata", () => {
      const state = createState();
      const ports = createPorts();
      const command = baseCommand(SCREEN_A, state);

      const approved = createApproveScreenEvent(
        state,
        { ...command, comment: "Looks good" },
        ports,
      );
      expect(approved.ok).toBe(true);
      if (!approved.ok) return;
      expect(approved.value.type).toBe("screen.approved");
      expect(approved.value.projectId).toBe(PROJECT_ID);
      expect(approved.value.specId).toBe(SPEC_ID);
      expect(approved.value.specVersion).toBe(SPEC_VERSION);
      expect(approved.value.baselineVersion).toBe(BASELINE_VERSION);
      expect(approved.value.screenId).toBe(SCREEN_A);
      expect(approved.value.screenVersionId).toBe(
        baselineScreenVersionId(SCREEN_A),
      );
      expect(approved.value.actor).toEqual(approver);
      expect(approved.value.occurredAt).toBe(fixedNow);
      expect(approved.value.id).toBe("evt-1");
      expect(approved.value.payload.comment).toBe("Looks good");

      const revision = createRequestRevisionEvent(
        state,
        {
          ...command,
          affectedNodeIds: ["node-1"],
          category: "layout",
          description: "Tighten spacing",
        },
        ports,
      );
      expect(revision.ok).toBe(true);
      if (!revision.ok) return;
      expect(revision.value.type).toBe("screen.revision_requested");
      expect(revision.value.payload.category).toBe("layout");
      expect(revision.value.occurredAt).toBe(fixedNow);
      expect(revision.value.id).toBe("evt-2");

      const started = createBeginRegenerationEvent(
        state,
        { ...command, requestId: "req-1", correlationId: "corr-1" },
        ports,
      );
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      expect(started.value.type).toBe("screen.regeneration_started");
      expect(started.value.payload.requestId).toBe("req-1");
      expect(started.value.id).toBe("evt-3");

      const regenerated = createRegeneratedEvent(
        state,
        {
          ...command,
          revisionEventId: revision.value.id,
          provider: "mock",
        },
        ports,
      );
      expect(regenerated.ok).toBe(true);
      if (!regenerated.ok) return;
      expect(regenerated.value.event.type).toBe("screen.regenerated");
      expect(regenerated.value.event.payload.provider).toBe("mock");
      expect(regenerated.value.event.payload.previousVersionId).toBe(
        baselineScreenVersionId(SCREEN_A),
      );
      expect(regenerated.value.version.source).toBe("regenerated");
      expect(regenerated.value.version.sequence).toBe(2);
      expect(regenerated.value.event.id).toBe("evt-5");
      expect(regenerated.value.version.id).toBe(`sv-${SCREEN_A}-4`);

      const failed = createRegenerationFailedEvent(
        state,
        {
          ...command,
          failureCode: "PROVIDER_TIMEOUT",
          message: "Mock provider timed out",
        },
        ports,
      );
      expect(failed.ok).toBe(true);
      if (!failed.ok) return;
      expect(failed.value.type).toBe("screen.regeneration_failed");
      expect(failed.value.payload.failureCode).toBe("PROVIDER_TIMEOUT");
      expect(failed.value.id).toBe("evt-6");
    });

    it("uses injected clock and ID generator deterministically", () => {
      const metadata = createEventMetadata({
        id: "evt-fixed",
        projectId: PROJECT_ID,
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
        screenId: SCREEN_A,
        screenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: approver,
        occurredAt: fixedNow,
      });
      expect(metadata.occurredAt).toBe(fixedNow);
      expect(metadata.id).toBe("evt-fixed");

      const ports = createPorts();
      expect(ports.clock.now()).toBe(fixedNow);
      expect(ports.idGenerator.next("x")).toBe("x-1");
      expect(ports.idGenerator.next("x")).toBe("x-2");
    });
  });

  describe("reducer", () => {
    it("appends immutably and leaves the original state unchanged", () => {
      const state = createState();
      const originalEvents = state.events;
      const originalVersions = state.screenVersions[SCREEN_A];
      const ports = createPorts();
      const created = createApproveScreenEvent(
        state,
        baseCommand(SCREEN_A, state),
        ports,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const next = appendGovernanceEvent(state, created.value);
      expect(next.ok).toBe(true);
      if (!next.ok) return;

      expect(state.events).toBe(originalEvents);
      expect(state.events).toHaveLength(0);
      expect(state.screenVersions[SCREEN_A]).toBe(originalVersions);
      expect(next.state.events).toHaveLength(1);
      expect(next.state).not.toBe(state);
    });

    it("rejects duplicate event IDs and appends exactly once", () => {
      const state = createState();
      const ports = createPorts();
      const created = createApproveScreenEvent(
        state,
        baseCommand(SCREEN_A, state),
        ports,
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const first = appendGovernanceEvent(state, created.value);
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      const duplicate = appendGovernanceEvent(first.state, created.value);
      expect(duplicate.ok).toBe(false);
      if (duplicate.ok) return;
      expect(duplicate.error.code).toBe("DUPLICATE_EVENT_ID");
      expect(first.state.events).toHaveLength(1);
    });

    it("changes only the targeted screen; other screens stay unchanged", () => {
      let state = createState();
      const ports = createPorts();
      const beforeB = selectCurrentScreenVersion(state, SCREEN_B);
      const beforeC = selectScreenStatus(state, SCREEN_C);

      const approved = createApproveScreenEvent(
        state,
        baseCommand(SCREEN_A, state),
        ports,
      );
      expect(approved.ok).toBe(true);
      if (!approved.ok) return;
      state = appendOk(state, approved.value);

      expect(selectScreenStatus(state, SCREEN_A)).toBe("approved");
      expect(selectScreenStatus(state, SCREEN_B)).toBe("not_reviewed");
      expect(selectScreenStatus(state, SCREEN_C)).toBe(beforeC);
      expect(selectCurrentScreenVersion(state, SCREEN_B)).toEqual(beforeB);
    });

    it("adds a screen version record when regenerating", () => {
      let state = createState();
      const ports = createPorts();
      const revision = createRequestRevisionEvent(
        state,
        {
          ...baseCommand(SCREEN_A, state),
          affectedNodeIds: ["node-title"],
          category: "content",
          description: "Update copy",
        },
        ports,
      );
      expect(revision.ok).toBe(true);
      if (!revision.ok) return;
      state = appendOk(state, revision.value);

      const regenerated = createRegeneratedEvent(
        state,
        {
          ...baseCommand(SCREEN_A, state),
          revisionEventId: revision.value.id,
          provider: "mock",
        },
        ports,
      );
      expect(regenerated.ok).toBe(true);
      if (!regenerated.ok) return;

      const next = reduceGovernance(state, {
        type: "eventAppended",
        event: regenerated.value.event,
      });
      expect(next.ok).toBe(true);
      if (!next.ok) return;

      const current = selectCurrentScreenVersion(next.state, SCREEN_A);
      expect(current?.id).toBe(regenerated.value.version.id);
      expect(current?.source).toBe("regenerated");
      expect(current?.sequence).toBe(2);
      expect(next.state.screenVersions[SCREEN_A]).toHaveLength(2);
    });

    it("supports screenVersionAdded and foldGovernanceEvents", () => {
      const state = createState();
      const ports = createPorts();
      const approved = createApproveScreenEvent(
        state,
        baseCommand(SCREEN_A, state),
        ports,
      );
      expect(approved.ok).toBe(true);
      if (!approved.ok) return;

      const folded = foldGovernanceEvents(state, [approved.value]);
      expect(folded.ok).toBe(true);
      if (!folded.ok) return;
      expect(folded.state.events).toHaveLength(1);

      const added = reduceGovernance(folded.state, {
        type: "screenVersionAdded",
        version: {
          id: "sv-extra",
          screenId: SCREEN_A,
          projectId: PROJECT_ID,
          specId: SPEC_ID,
          specVersion: SPEC_VERSION,
          baselineVersion: BASELINE_VERSION,
          sequence: 99,
          source: "regenerated",
          createdAt: fixedNow,
          previousVersionId: baselineScreenVersionId(SCREEN_A),
        },
      });
      expect(added.ok).toBe(true);
      if (!added.ok) return;
      expect(selectCurrentScreenVersion(added.state, SCREEN_A)?.id).toBe(
        "sv-extra",
      );
    });
  });

  describe("version-bound approval and invalidation", () => {
    it("approves the current version and rejects stale approvals", () => {
      const state = createState();
      const ports = createPorts();
      const ok = createApproveScreenEvent(
        state,
        baseCommand(SCREEN_A, state),
        ports,
      );
      expect(ok.ok).toBe(true);

      const stale = createApproveScreenEvent(
        state,
        {
          ...baseCommand(SCREEN_A, state),
          expectedScreenVersionId: "sv-stale",
        },
        ports,
      );
      expect(stale.ok).toBe(false);
      if (stale.ok) return;
      expect(stale.error.code).toBe("STALE_SCREEN_VERSION");
    });

    it("invalidates effective approval after a revision request", () => {
      let state = createState();
      const ports = createPorts();

      const approved = createApproveScreenEvent(
        state,
        baseCommand(SCREEN_A, state),
        ports,
      );
      expect(approved.ok).toBe(true);
      if (!approved.ok) return;
      state = appendOk(state, approved.value);
      expect(selectScreenStatus(state, SCREEN_A)).toBe("approved");

      const revision = createRequestRevisionEvent(
        state,
        {
          ...baseCommand(SCREEN_A, state),
          affectedNodeIds: ["node-1"],
          category: "interaction",
          description: "Fix CTA",
        },
        ports,
      );
      expect(revision.ok).toBe(true);
      if (!revision.ok) return;
      state = appendOk(state, revision.value);
      expect(selectScreenStatus(state, SCREEN_A)).toBe("changes_requested");
      expect(selectIsGateComplete(state)).toBe(false);
    });

    it("invalidates old approval when a new version is created", () => {
      let state = createState();
      const ports = createPorts();

      const approved = createApproveScreenEvent(
        state,
        baseCommand(SCREEN_A, state),
        ports,
      );
      expect(approved.ok).toBe(true);
      if (!approved.ok) return;
      state = appendOk(state, approved.value);

      const revision = createRequestRevisionEvent(
        state,
        {
          ...baseCommand(SCREEN_A, state),
          affectedNodeIds: ["node-1"],
          category: "other",
          description: "Regen please",
        },
        ports,
      );
      expect(revision.ok).toBe(true);
      if (!revision.ok) return;
      state = appendOk(state, revision.value);

      const regenerated = createRegeneratedEvent(
        state,
        {
          ...baseCommand(SCREEN_A, state),
          revisionEventId: revision.value.id,
          provider: "mock",
        },
        ports,
      );
      expect(regenerated.ok).toBe(true);
      if (!regenerated.ok) return;
      state = appendOk(state, regenerated.value.event);

      expect(selectScreenStatus(state, SCREEN_A)).toBe("ready_for_review");
      expect(selectCurrentScreenVersion(state, SCREEN_A)?.id).toBe(
        regenerated.value.version.id,
      );
    });
  });

  describe("regeneration status", () => {
    it("marks regenerating after regeneration_started", () => {
      let state = createState();
      const ports = createPorts();
      const started = createBeginRegenerationEvent(
        state,
        baseCommand(SCREEN_A, state),
        ports,
      );
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      state = appendOk(state, started.value);
      expect(selectScreenStatus(state, SCREEN_A)).toBe("regenerating");
    });

    it("returns to prior non-approved status after regeneration_failed", () => {
      let state = createState();
      const ports = createPorts();

      const revision = createRequestRevisionEvent(
        state,
        {
          ...baseCommand(SCREEN_A, state),
          affectedNodeIds: ["node-1"],
          category: "accessibility",
          description: "Contrast",
        },
        ports,
      );
      expect(revision.ok).toBe(true);
      if (!revision.ok) return;
      state = appendOk(state, revision.value);
      expect(selectScreenStatus(state, SCREEN_A)).toBe("changes_requested");

      const started = createBeginRegenerationEvent(
        state,
        baseCommand(SCREEN_A, state),
        ports,
      );
      expect(started.ok).toBe(true);
      if (!started.ok) return;
      state = appendOk(state, started.value);
      expect(selectScreenStatus(state, SCREEN_A)).toBe("regenerating");

      const failed = createRegenerationFailedEvent(
        state,
        {
          ...baseCommand(SCREEN_A, state),
          failureCode: "MOCK_ERROR",
          message: "Controlled failure",
        },
        ports,
      );
      expect(failed.ok).toBe(true);
      if (!failed.ok) return;
      state = appendOk(state, failed.value);

      expect(selectScreenStatus(state, SCREEN_A)).toBe("changes_requested");
      expect(selectScreenStatus(state, SCREEN_A)).not.toBe("approved");
    });
  });

  describe("selectors", () => {
    it("selects the current version by highest sequence", () => {
      const state = createState();
      const current = selectCurrentScreenVersion(state, SCREEN_A);
      expect(current?.id).toBe(baselineScreenVersionId(SCREEN_A));
      expect(current?.sequence).toBe(1);
      expect(current?.source).toBe("baseline");
    });

    it("tracks progress, remaining, and gate completion", () => {
      let state = createState();
      const ports = createPorts();

      expect(selectIsGateComplete(state)).toBe(false);
      expect(selectApprovalProgress(state)).toEqual({
        approvedCount: 0,
        totalRequired: 3,
        remainingCount: 3,
        percent: 0,
      });

      for (const screenId of [SCREEN_A, SCREEN_B]) {
        const approved = createApproveScreenEvent(
          state,
          baseCommand(screenId, state),
          ports,
        );
        expect(approved.ok).toBe(true);
        if (!approved.ok) return;
        state = appendOk(state, approved.value);
      }

      expect(selectApprovalProgress(state)).toEqual({
        approvedCount: 2,
        totalRequired: 3,
        remainingCount: 1,
        percent: 67,
      });
      expect(selectIsGateComplete(state)).toBe(false);

      const last = createApproveScreenEvent(
        state,
        baseCommand(SCREEN_C, state),
        ports,
      );
      expect(last.ok).toBe(true);
      if (!last.ok) return;
      state = appendOk(state, last.value);

      expect(selectApprovalProgress(state)).toEqual({
        approvedCount: 3,
        totalRequired: 3,
        remainingCount: 0,
        percent: 100,
      });
      expect(selectIsGateComplete(state)).toBe(true);
    });

    it("returns chronological event history sorted by occurredAt then id", () => {
      const state = createState();
      const early = createEventMetadata({
        id: "evt-b",
        projectId: PROJECT_ID,
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
        screenId: SCREEN_A,
        screenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: approver,
        occurredAt: "2026-07-15T01:00:00.000Z",
      });
      const late = createEventMetadata({
        id: "evt-a",
        projectId: PROJECT_ID,
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
        screenId: SCREEN_A,
        screenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: approver,
        occurredAt: "2026-07-15T02:00:00.000Z",
      });
      const sameTime = createEventMetadata({
        id: "evt-c",
        projectId: PROJECT_ID,
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
        screenId: SCREEN_B,
        screenVersionId: baselineScreenVersionId(SCREEN_B),
        actor: approver,
        occurredAt: "2026-07-15T01:00:00.000Z",
      });

      const events: GovernanceEvent[] = [
        { ...late, type: "screen.approved", payload: {} },
        { ...sameTime, type: "screen.approved", payload: {} },
        { ...early, type: "screen.approved", payload: {} },
      ];

      const folded = foldGovernanceEvents(state, events);
      expect(folded.ok).toBe(true);
      if (!folded.ok) return;

      expect(selectChronologicalEvents(folded.state).map((e) => e.id)).toEqual([
        "evt-b",
        "evt-c",
        "evt-a",
      ]);
      expect(selectEventsForScreen(folded.state, SCREEN_A).map((e) => e.id)).toEqual([
        "evt-b",
        "evt-a",
      ]);
    });

    it("derives capability selectors from the role policy", () => {
      expect(selectCanApprove(approver)).toBe(true);
      expect(selectCanRequestRevision(approver)).toBe(true);
      expect(selectCanRegenerate(approver)).toBe(true);
      expect(selectCanApprove(reviewer)).toBe(false);
      expect(selectCanRequestRevision(reviewer)).toBe(false);
      expect(selectCanRegenerate(reviewer)).toBe(false);
      expect(hasCapability("viewer", "audit.view")).toBe(true);
      expect(assertCapability("viewer", "screen.approve").ok).toBe(false);
    });
  });

  describe("schemas", () => {
    it("accepts known events and rejects unknown types", () => {
      const valid = governanceEventSchema.safeParse({
        id: "evt-1",
        type: "screen.approved",
        projectId: PROJECT_ID,
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
        screenId: SCREEN_A,
        screenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: approver,
        occurredAt: fixedNow,
        payload: {},
      });
      expect(valid.success).toBe(true);

      const unknown = governanceEventSchema.safeParse({
        id: "evt-1",
        type: "screen.unknown",
        projectId: PROJECT_ID,
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
        screenId: SCREEN_A,
        screenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: approver,
        occurredAt: fixedNow,
        payload: {},
      });
      expect(unknown.success).toBe(false);
    });
  });

  describe("framework isolation", () => {
    it("does not import React or localStorage in the governance domain", () => {
      const dir = dirname(fileURLToPath(import.meta.url));
      const files = readdirSync(dir).filter(
        (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
      );
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const source = readFileSync(join(dir, file), "utf8");
        expect(source).not.toMatch(/from\s+["']react(?:\/[^"']*)?["']/);
        expect(source).not.toMatch(/\blocalStorage\s*[.[]/);
        expect(source).not.toMatch(/window\s*\.\s*localStorage/);
      }
    });
  });
});
