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
    const seen = new Set<string>();
    for (const event of envelope.state.events) {
      if (seen.has(event.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate governance event id "${event.id}".`,
          path: ["state", "events"],
        });
        return;
      }
      seen.add(event.id);

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
