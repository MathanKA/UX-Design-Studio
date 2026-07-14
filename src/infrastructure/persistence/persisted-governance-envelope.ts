import { z } from "zod";
import {
  GOVERNANCE_LIMITS,
  governanceStateSchema,
  type GovernanceState,
} from "../../domain/governance";

const boundedId = z
  .string()
  .trim()
  .min(1)
  .max(GOVERNANCE_LIMITS.maxIdLength);

const boundedText = z
  .string()
  .trim()
  .min(1)
  .max(GOVERNANCE_LIMITS.maxStringLength);

/**
 * Versioned localStorage envelope (Architecture §17).
 * Persists only governance events + screen-version records (+ envelope metadata).
 */
export const persistedGovernanceEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    savedAt: z.string().trim().min(1).max(64),
    projectId: boundedId,
    specId: boundedId,
    specVersion: boundedText,
    baselineVersion: boundedText,
    state: governanceStateSchema,
  })
  .strict()
  .superRefine((envelope, ctx) => {
    const seenEventIds = new Set<string>();
    const versionIds = new Set<string>();

    for (const [screenId, versions] of Object.entries(
      envelope.state.screenVersions,
    )) {
      for (const version of versions) {
        if (versionIds.has(version.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate screen version id "${version.id}".`,
            path: ["state", "screenVersions", screenId],
          });
          return;
        }
        versionIds.add(version.id);

        if (version.source === "regenerated" && !version.contentRef) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Regenerated version "${version.id}" is missing contentRef.`,
            path: ["state", "screenVersions", screenId],
          });
          return;
        }
      }
    }

    for (const event of envelope.state.events) {
      if (seenEventIds.has(event.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate governance event id "${event.id}".`,
          path: ["state", "events"],
        });
        return;
      }
      seenEventIds.add(event.id);

      if (
        event.projectId !== envelope.projectId ||
        event.specId !== envelope.specId ||
        event.baselineVersion !== envelope.baselineVersion
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Event identity does not match envelope identity.",
          path: ["state", "events"],
        });
        return;
      }

      if (event.type === "screen.regenerated") {
        if (!event.payload.contentRef) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Regenerated event "${event.id}" is missing contentRef.`,
            path: ["state", "events"],
          });
          return;
        }

        if (!versionIds.has(event.payload.newVersionId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Regenerated event "${event.id}" references missing version "${event.payload.newVersionId}".`,
            path: ["state", "events"],
          });
          return;
        }

        const revision = envelope.state.events.find(
          (entry) => entry.id === event.payload.revisionEventId,
        );
        if (
          !revision ||
          revision.type !== "screen.revision_requested" ||
          revision.screenId !== event.screenId ||
          revision.screenVersionId !== event.payload.previousVersionId
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Regenerated event "${event.id}" has an invalid revisionEventId.`,
            path: ["state", "events"],
          });
          return;
        }
      }
    }
  });

export type PersistedGovernanceEnvelope = {
  schemaVersion: 1;
  savedAt: string;
  projectId: string;
  specId: string;
  specVersion: string;
  baselineVersion: string;
  state: GovernanceState;
};

export type GovernanceEnvelopeIdentity = {
  projectId: string;
  specId: string;
  specVersion: string;
  baselineVersion: string;
};

export function createPersistedGovernanceEnvelope(
  identity: GovernanceEnvelopeIdentity,
  state: GovernanceState,
  savedAt: string,
): PersistedGovernanceEnvelope {
  return {
    schemaVersion: 1,
    savedAt,
    projectId: identity.projectId,
    specId: identity.specId,
    specVersion: identity.specVersion,
    baselineVersion: identity.baselineVersion,
    state: {
      schemaVersion: 1,
      requiredScreenIds: [...state.requiredScreenIds],
      events: [...state.events],
      screenVersions: Object.fromEntries(
        Object.entries(state.screenVersions).map(([screenId, versions]) => [
          screenId,
          versions.map((entry) => ({ ...entry })),
        ]),
      ),
    },
  };
}

export function identitiesMatch(
  expected: GovernanceEnvelopeIdentity,
  actual: Pick<
    PersistedGovernanceEnvelope,
    "projectId" | "specId" | "baselineVersion"
  >,
): boolean {
  return (
    actual.projectId === expected.projectId &&
    actual.specId === expected.specId &&
    actual.baselineVersion === expected.baselineVersion
  );
}

/** Convert a Zod-validated envelope into domain GovernanceState. */
export function envelopeStateToGovernanceState(
  state: z.infer<typeof governanceStateSchema>,
): GovernanceState {
  return state as GovernanceState;
}
