import { z } from "zod";

export const uxdsRoleSchema = z.enum(["approver", "reviewer", "viewer"]);

export const uxdsActorSnapshotSchema = z
  .object({
    id: z.string().trim().min(1),
    displayLabel: z.string().trim().min(1),
    role: uxdsRoleSchema,
  })
  .strict();

export const uxDesignStudioRemoteIdentitySchema = z
  .object({
    projectId: z.string().trim().min(1),
    baselineVersion: z.string().trim().min(1),
    basePath: z.string().trim().min(1),
    actor: uxdsActorSnapshotSchema,
  })
  .strict();
