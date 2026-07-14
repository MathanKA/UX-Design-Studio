import { z } from "zod";
import { GOVERNANCE_LIMITS, REVISION_CATEGORIES } from "./types";

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

const demoRoleSchema = z.enum(["approver", "reviewer", "viewer"]);

const actorSnapshotSchema = z
  .object({
    id: boundedId,
    role: demoRoleSchema,
    displayLabel: z
      .string()
      .trim()
      .min(1)
      .max(GOVERNANCE_LIMITS.maxDisplayLabelLength),
  })
  .strict();

const revisionCategorySchema = z.enum(REVISION_CATEGORIES);

const eventMetadataFields = {
  id: boundedId,
  projectId: boundedId,
  specId: boundedId,
  specVersion: boundedText,
  baselineVersion: boundedText,
  screenId: boundedId,
  screenVersionId: boundedId,
  actor: actorSnapshotSchema,
  occurredAt: z.string().trim().min(1).max(64),
} as const;

const screenApprovedEventSchema = z
  .object({
    ...eventMetadataFields,
    type: z.literal("screen.approved"),
    payload: z
      .object({
        comment: z
          .string()
          .trim()
          .min(1)
          .max(GOVERNANCE_LIMITS.maxCommentLength)
          .optional(),
      })
      .strict(),
  })
  .strict();

const revisionRequestedEventSchema = z
  .object({
    ...eventMetadataFields,
    type: z.literal("screen.revision_requested"),
    payload: z
      .object({
        affectedNodeIds: z
          .array(boundedId)
          .max(GOVERNANCE_LIMITS.maxAffectedNodes),
        category: revisionCategorySchema,
        description: z
          .string()
          .trim()
          .min(1)
          .max(GOVERNANCE_LIMITS.maxDescriptionLength),
      })
      .strict(),
  })
  .strict();

const regenerationStartedEventSchema = z
  .object({
    ...eventMetadataFields,
    type: z.literal("screen.regeneration_started"),
    payload: z
      .object({
        requestId: boundedId.optional(),
        correlationId: boundedId.optional(),
      })
      .strict(),
  })
  .strict();

const regeneratedEventSchema = z
  .object({
    ...eventMetadataFields,
    type: z.literal("screen.regenerated"),
    payload: z
      .object({
        previousVersionId: boundedId,
        newVersionId: boundedId,
        revisionEventId: boundedId,
        provider: z.enum(["mock", "production"]),
        contentRef: z
          .string()
          .trim()
          .min(1)
          .max(GOVERNANCE_LIMITS.maxContentRefLength),
        providerRequestId: boundedId.optional(),
      })
      .strict(),
  })
  .strict();

const regenerationFailedEventSchema = z
  .object({
    ...eventMetadataFields,
    type: z.literal("screen.regeneration_failed"),
    payload: z
      .object({
        failureCode: z
          .string()
          .trim()
          .min(1)
          .max(GOVERNANCE_LIMITS.maxFailureCodeLength),
        message: z
          .string()
          .trim()
          .min(1)
          .max(GOVERNANCE_LIMITS.maxFailureMessageLength),
      })
      .strict(),
  })
  .strict();

export const governanceEventSchema = z.discriminatedUnion("type", [
  screenApprovedEventSchema,
  revisionRequestedEventSchema,
  regenerationStartedEventSchema,
  regeneratedEventSchema,
  regenerationFailedEventSchema,
]);

export const screenVersionRecordSchema = z
  .object({
    id: boundedId,
    screenId: boundedId,
    projectId: boundedId,
    specId: boundedId,
    specVersion: boundedText,
    baselineVersion: boundedText,
    sequence: z.number().int().positive(),
    source: z.enum(["baseline", "regenerated"]),
    createdAt: z.string().trim().min(1).max(64),
    previousVersionId: boundedId.optional(),
    contentRef: z
      .string()
      .trim()
      .min(1)
      .max(GOVERNANCE_LIMITS.maxContentRefLength)
      .optional(),
  })
  .strict()
  .superRefine((version, ctx) => {
    if (version.source === "regenerated" && !version.contentRef) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Regenerated screen versions require contentRef.",
        path: ["contentRef"],
      });
    }
  });

export const governanceStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    requiredScreenIds: z.array(boundedId).max(50),
    events: z.array(governanceEventSchema),
    screenVersions: z.record(z.array(screenVersionRecordSchema)),
  })
  .strict();

export {
  demoRoleSchema,
  actorSnapshotSchema,
  revisionCategorySchema,
  screenApprovedEventSchema,
  revisionRequestedEventSchema,
  regenerationStartedEventSchema,
  regeneratedEventSchema,
  regenerationFailedEventSchema,
};
