import type { GovernanceState } from "../../domain/governance";
import type { Clock } from "../../ports/clock";
import type {
  GovernanceLoadResult,
  GovernanceRepository,
  GovernanceSaveResult,
} from "../../ports/governance-repository";
import { createSystemClock } from "../platform/system-clock";
import { buildGovernanceStorageKey } from "./governance-storage-key";
import {
  createPersistedGovernanceEnvelope,
  envelopeStateToGovernanceState,
  identitiesMatch,
  persistedGovernanceEnvelopeSchema,
  type GovernanceEnvelopeIdentity,
} from "./persisted-governance-envelope";

export type LocalStorageGovernanceRepositoryOptions = {
  identity: GovernanceEnvelopeIdentity;
  fallbackState: GovernanceState;
  /** Injected Storage for tests; omit to use browser localStorage. */
  storage?: Storage | null;
  clock?: Clock;
  /** Override managed key; defaults to Architecture §17 identity key. */
  managedKey?: string;
};

function probeStorage(candidate: Storage): boolean {
  const probeKey = "__uxds_governance_probe__";
  try {
    candidate.setItem(probeKey, "1");
    candidate.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function resolveBrowserStorage(): Storage | null {
  try {
    const candidate = globalThis.localStorage;
    if (!candidate || typeof candidate.getItem !== "function") {
      return null;
    }
    return probeStorage(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function cloneFallback(state: GovernanceState): GovernanceState {
  return {
    schemaVersion: 1,
    requiredScreenIds: [...state.requiredScreenIds],
    events: [...state.events],
    screenVersions: Object.fromEntries(
      Object.entries(state.screenVersions).map(([screenId, versions]) => [
        screenId,
        versions.map((entry) => ({ ...entry })),
      ]),
    ),
  };
}

/**
 * Versioned localStorage adapter for governance events and screen versions.
 *
 * Recovery rules:
 * - Corrupt / mismatched / unavailable → clean in-memory fallback
 * - Do not overwrite corrupt data until a valid save or explicit reset
 * - reset() removes only the managed key — never a full storage wipe
 */
export class LocalStorageGovernanceRepository implements GovernanceRepository {
  private readonly identity: GovernanceEnvelopeIdentity;
  private readonly fallbackState: GovernanceState;
  private readonly storage: Storage | null;
  private readonly clock: Clock;
  private readonly managedKey: string;

  constructor(options: LocalStorageGovernanceRepositoryOptions) {
    this.identity = options.identity;
    this.fallbackState = cloneFallback(options.fallbackState);
    this.clock = options.clock ?? createSystemClock();
    this.managedKey =
      options.managedKey ??
      buildGovernanceStorageKey({
        projectId: options.identity.projectId,
        specId: options.identity.specId,
        baselineVersion: options.identity.baselineVersion,
      });

    if (options.storage === undefined) {
      this.storage = resolveBrowserStorage();
    } else {
      this.storage =
        options.storage === null
          ? null
          : probeStorage(options.storage)
            ? options.storage
            : null;
    }
  }

  getManagedKey(): string {
    return this.managedKey;
  }

  load(): GovernanceLoadResult {
    const fallbackState = cloneFallback(this.fallbackState);

    if (!this.storage) {
      return { ok: false, reason: "unavailable", fallbackState };
    }

    let raw: string | null;
    try {
      raw = this.storage.getItem(this.managedKey);
    } catch {
      return { ok: false, reason: "unavailable", fallbackState };
    }

    if (raw === null) {
      return { ok: true, state: fallbackState };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return { ok: false, reason: "corrupt", fallbackState };
    }

    const envelopeResult = persistedGovernanceEnvelopeSchema.safeParse(parsed);
    if (!envelopeResult.success) {
      return { ok: false, reason: "corrupt", fallbackState };
    }

    const envelope = envelopeResult.data;
    if (!identitiesMatch(this.identity, envelope)) {
      return { ok: false, reason: "mismatch", fallbackState };
    }

    return {
      ok: true,
      state: envelopeStateToGovernanceState(envelope.state),
    };
  }

  save(state: GovernanceState): GovernanceSaveResult {
    if (!this.storage) {
      return { ok: false, reason: "unavailable" };
    }

    const envelope = createPersistedGovernanceEnvelope(
      this.identity,
      state,
      this.clock.now(),
    );

    // Ensure we never persist non-governance surfaces.
    const serialized = JSON.stringify({
      schemaVersion: envelope.schemaVersion,
      savedAt: envelope.savedAt,
      projectId: envelope.projectId,
      specId: envelope.specId,
      specVersion: envelope.specVersion,
      baselineVersion: envelope.baselineVersion,
      state: {
        schemaVersion: envelope.state.schemaVersion,
        requiredScreenIds: envelope.state.requiredScreenIds,
        events: envelope.state.events,
        screenVersions: envelope.state.screenVersions,
      },
    });

    try {
      this.storage.setItem(this.managedKey, serialized);
      return { ok: true };
    } catch {
      return { ok: false, reason: "unavailable" };
    }
  }

  reset(): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.removeItem(this.managedKey);
    } catch {
      // Degrade silently; in-memory session remains usable.
    }
  }
}
