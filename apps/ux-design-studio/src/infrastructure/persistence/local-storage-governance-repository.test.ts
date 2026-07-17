import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  appendGovernanceEvent,
  baselineScreenVersionId,
  createApproveScreenEvent,
  createInitialGovernanceState,
  createRegeneratedEvent,
  createRequestRevisionEvent,
  selectCurrentScreenVersion,
  type GovernanceState,
} from "../../domain/governance";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../../test/governance-ports";
import { buildGovernanceStorageKey } from "./governance-storage-key";
import { LocalStorageGovernanceRepository } from "./local-storage-governance-repository";
import {
  createPersistedGovernanceEnvelope,
  persistedGovernanceEnvelopeSchema,
} from "./persisted-governance-envelope";

const PROJECT_ID = "project-agentpilot";
const SPEC_ID = "spec-agentpilot";
const SPEC_VERSION = "1.0.0";
const BASELINE_VERSION = "1.0.0";
const SCREEN_A = "screen-dashboard";
const SCREEN_B = "screen-login";
const FIXED_NOW = "2026-07-15T04:00:00.000Z";

const identity = {
  projectId: PROJECT_ID,
  specId: SPEC_ID,
  specVersion: SPEC_VERSION,
  baselineVersion: BASELINE_VERSION,
};

const approver = {
  id: "demo-approver",
  role: "approver" as const,
  displayLabel: "Demo Approver",
};

function createFallback(): GovernanceState {
  return createInitialGovernanceState({
    ...identity,
    requiredScreenIds: [SCREEN_A, SCREEN_B],
    createdAt: "2026-07-15T01:00:00.000Z",
  });
}

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

function createRepo(storage: Storage | null = createMemoryStorage()) {
  return new LocalStorageGovernanceRepository({
    identity,
    fallbackState: createFallback(),
    storage,
    clock: createFixedClock(FIXED_NOW),
  });
}

function approveOnce(state: GovernanceState): GovernanceState {
  const ports = {
    clock: createFixedClock(FIXED_NOW),
    idGenerator: createSequentialIdGenerator(1),
  };
  const created = createApproveScreenEvent(
    state,
    {
      ...identity,
      screenId: SCREEN_A,
      expectedScreenVersionId: baselineScreenVersionId(SCREEN_A),
      actor: approver,
      comment: "Looks good",
    },
    ports,
  );
  expect(created.ok).toBe(true);
  if (!created.ok) {
    throw new Error(created.error.message);
  }
  const appended = appendGovernanceEvent(state, created.value);
  expect(appended.ok).toBe(true);
  if (!appended.ok) {
    throw new Error(appended.error.message);
  }
  return appended.state;
}

describe("LocalStorageGovernanceRepository (US-4.4)", () => {
  it("round-trips a versioned envelope with schemaVersion 1", () => {
    const storage = createMemoryStorage();
    const repo = createRepo(storage);
    const state = approveOnce(createFallback());

    expect(repo.save(state).ok).toBe(true);

    const key = buildGovernanceStorageKey({
      projectId: PROJECT_ID,
      specId: SPEC_ID,
      baselineVersion: BASELINE_VERSION,
    });
    const raw = storage.getItem(key);
    expect(raw).not.toBeNull();
    const parsed = persistedGovernanceEnvelopeSchema.parse(
      JSON.parse(raw as string),
    );
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.savedAt).toBe(FIXED_NOW);
    expect(parsed.projectId).toBe(PROJECT_ID);
    expect(parsed.specId).toBe(SPEC_ID);
    expect(parsed.baselineVersion).toBe(BASELINE_VERSION);
    expect(parsed.state.events).toHaveLength(1);

    const loaded = repo.load();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.events).toHaveLength(1);
    expect(loaded.state.events[0]?.type).toBe("screen.approved");
  });

  it("rejects identity mismatch without overwriting corrupt/mismatched data", () => {
    const storage = createMemoryStorage();
    const key = buildGovernanceStorageKey({
      projectId: PROJECT_ID,
      specId: SPEC_ID,
      baselineVersion: BASELINE_VERSION,
    });
    const mismatched = createPersistedGovernanceEnvelope(
      {
        projectId: "other-project",
        specId: SPEC_ID,
        specVersion: SPEC_VERSION,
        baselineVersion: BASELINE_VERSION,
      },
      createFallback(),
      FIXED_NOW,
    );
    storage.setItem(key, JSON.stringify(mismatched));

    const repo = createRepo(storage);
    const loaded = repo.load();
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.reason).toBe("mismatch");
    expect(loaded.fallbackState.events).toHaveLength(0);
    expect(storage.getItem(key)).toBe(JSON.stringify(mismatched));
  });

  it("rejects corrupt JSON and malformed events without overwriting storage", () => {
    const storage = createMemoryStorage();
    const key = buildGovernanceStorageKey({
      projectId: PROJECT_ID,
      specId: SPEC_ID,
      baselineVersion: BASELINE_VERSION,
    });
    storage.setItem(key, "{not-json");

    const corruptRepo = createRepo(storage);
    const corruptLoad = corruptRepo.load();
    expect(corruptLoad.ok).toBe(false);
    if (corruptLoad.ok) return;
    expect(corruptLoad.reason).toBe("corrupt");
    expect(storage.getItem(key)).toBe("{not-json");

    const malformedEnvelope = createPersistedGovernanceEnvelope(
      identity,
      createFallback(),
      FIXED_NOW,
    );
    const malformed = {
      ...malformedEnvelope,
      state: {
        ...malformedEnvelope.state,
        events: [
          {
            id: "evt-1",
            type: "screen.approved",
            projectId: PROJECT_ID,
            specId: SPEC_ID,
            specVersion: SPEC_VERSION,
            baselineVersion: BASELINE_VERSION,
            screenId: SCREEN_A,
            screenVersionId: baselineScreenVersionId(SCREEN_A),
            actor: approver,
            occurredAt: FIXED_NOW,
            payload: { comment: 123 },
          },
        ],
      },
    };
    storage.setItem(key, JSON.stringify(malformed));
    const malformedLoad = createRepo(storage).load();
    expect(malformedLoad.ok).toBe(false);
    if (malformedLoad.ok) return;
    expect(malformedLoad.reason).toBe("corrupt");
    expect(storage.getItem(key)).toContain("evt-1");
  });

  it("rejects duplicate event ids", () => {
    const storage = createMemoryStorage();
    const key = buildGovernanceStorageKey({
      projectId: PROJECT_ID,
      specId: SPEC_ID,
      baselineVersion: BASELINE_VERSION,
    });
    const state = approveOnce(createFallback());
    const event = state.events[0];
    if (!event) throw new Error("expected event");
    const duplicateState: GovernanceState = {
      ...state,
      events: [event, { ...event }],
    };
    const envelope = createPersistedGovernanceEnvelope(
      identity,
      duplicateState,
      FIXED_NOW,
    );
    storage.setItem(key, JSON.stringify(envelope));

    const loaded = createRepo(storage).load();
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.reason).toBe("corrupt");
    expect(storage.getItem(key)).not.toBeNull();
  });

  it("degrades when storage is unavailable and when writes fail", () => {
    const unavailable = createRepo(null);
    const loadResult = unavailable.load();
    expect(loadResult.ok).toBe(false);
    if (loadResult.ok) return;
    expect(loadResult.reason).toBe("unavailable");
    expect(loadResult.fallbackState.events).toHaveLength(0);

    const failingStorage: Storage = {
      length: 0,
      clear() {},
      getItem() {
        return null;
      },
      key() {
        return null;
      },
      removeItem() {},
      setItem() {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      },
    };
    const failingRepo = createRepo(failingStorage);
    const saveResult = failingRepo.save(approveOnce(createFallback()));
    expect(saveResult.ok).toBe(false);
    if (saveResult.ok) return;
    expect(saveResult.reason).toBe("unavailable");
  });

  it("persists only governance events and screen-version records", () => {
    const storage = createMemoryStorage();
    const repo = createRepo(storage);
    const state = approveOnce(createFallback());
    expect(repo.save(state).ok).toBe(true);

    const raw = storage.getItem(repo.getManagedKey());
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "baselineVersion",
        "projectId",
        "savedAt",
        "schemaVersion",
        "specId",
        "specVersion",
        "state",
      ].sort(),
    );
    const persistedState = parsed.state as Record<string, unknown>;
    expect(Object.keys(persistedState).sort()).toEqual(
      ["events", "requiredScreenIds", "schemaVersion", "screenVersions"].sort(),
    );
    expect(parsed).not.toHaveProperty("personas");
    expect(parsed).not.toHaveProperty("journeys");
    expect(parsed).not.toHaveProperty("tokens");
    expect(parsed).not.toHaveProperty("featureFlags");
    expect(parsed).not.toHaveProperty("uxSpec");
    expect(parsed).not.toHaveProperty("role");
  });

  it("reset removes only the managed key", () => {
    const storage = createMemoryStorage();
    const unrelatedKey = "unrelated-demo-key";
    storage.setItem(unrelatedKey, "keep-me");
    const repo = createRepo(storage);
    expect(repo.save(approveOnce(createFallback())).ok).toBe(true);
    expect(storage.getItem(repo.getManagedKey())).not.toBeNull();

    const clearSpy = vi.spyOn(storage, "clear");
    repo.reset();
    expect(storage.getItem(repo.getManagedKey())).toBeNull();
    expect(storage.getItem(unrelatedKey)).toBe("keep-me");
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it("survives reload by rehydrating approvals and revisions", () => {
    const storage = createMemoryStorage();
    const first = createRepo(storage);
    let state = createFallback();
    const ports = {
      clock: createFixedClock(FIXED_NOW),
      idGenerator: createSequentialIdGenerator(1),
    };

    const approved = createApproveScreenEvent(
      state,
      {
        ...identity,
        screenId: SCREEN_A,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: approver,
      },
      ports,
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const appendedApproval = appendGovernanceEvent(state, approved.value);
    expect(appendedApproval.ok).toBe(true);
    if (!appendedApproval.ok) return;
    state = appendedApproval.state;

    const revision = createRequestRevisionEvent(
      state,
      {
        ...identity,
        screenId: SCREEN_B,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_B),
        actor: approver,
        affectedNodeIds: ["node-a"],
        category: "content",
        description: "Please refine the login helper copy.",
      },
      ports,
    );
    expect(revision.ok).toBe(true);
    if (!revision.ok) return;
    const appendedRevision = appendGovernanceEvent(state, revision.value);
    expect(appendedRevision.ok).toBe(true);
    if (!appendedRevision.ok) return;
    state = appendedRevision.state;

    expect(first.save(state).ok).toBe(true);

    const reloaded = createRepo(storage).load();
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    expect(reloaded.state.events).toHaveLength(2);
    expect(reloaded.state.events.map((event) => event.type)).toEqual([
      "screen.approved",
      "screen.revision_requested",
    ]);
  });

  it("rehydrates regenerated versions with contentRef", () => {
    const storage = createMemoryStorage();
    const first = createRepo(storage);
    let state = createFallback();
    const ports = {
      clock: createFixedClock(FIXED_NOW),
      idGenerator: createSequentialIdGenerator(1),
    };

    const revision = createRequestRevisionEvent(
      state,
      {
        ...identity,
        screenId: SCREEN_A,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: approver,
        affectedNodeIds: ["dashboard-title"],
        category: "layout",
        description: "Please refine the dashboard hierarchy.",
      },
      ports,
    );
    expect(revision.ok).toBe(true);
    if (!revision.ok) return;
    const appendedRevision = appendGovernanceEvent(state, revision.value);
    expect(appendedRevision.ok).toBe(true);
    if (!appendedRevision.ok) return;
    state = appendedRevision.state;

    const regenerated = createRegeneratedEvent(
      state,
      {
        ...identity,
        screenId: SCREEN_A,
        expectedScreenVersionId: baselineScreenVersionId(SCREEN_A),
        actor: approver,
        revisionEventId: revision.value.id,
        provider: "mock",
        contentRef: "agentpilot.dashboard.v2",
        providerRequestId: "provider-req-1",
      },
      ports,
    );
    expect(regenerated.ok).toBe(true);
    if (!regenerated.ok) return;
    const appendedRegen = appendGovernanceEvent(state, regenerated.value.event);
    expect(appendedRegen.ok).toBe(true);
    if (!appendedRegen.ok) return;
    state = appendedRegen.state;

    expect(first.save(state).ok).toBe(true);

    const reloaded = createRepo(storage).load();
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;

    const current = selectCurrentScreenVersion(reloaded.state, SCREEN_A);
    expect(current?.source).toBe("regenerated");
    expect(current?.contentRef).toBe("agentpilot.dashboard.v2");
    expect(
      reloaded.state.events.find((event) => event.type === "screen.regenerated")
        ?.payload,
    ).toMatchObject({
      contentRef: "agentpilot.dashboard.v2",
      providerRequestId: "provider-req-1",
    });
  });
});

describe("US-4.4 source guard", () => {
  it("never calls localStorage.clear in application source", () => {
    const root = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );
    const srcRoot = join(root, "src");
    const files: string[] = [];

    function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
          files.push(full);
        }
      }
    }

    walk(srcRoot);
    expect(files.length).toBeGreaterThan(10);

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toMatch(/localStorage\.clear\s*\(/);
    }
  });
});
