import { z } from "zod";
import { UX_SPEC_LIMITS } from "../../domain/ux-spec";
import type { DeclarativeAction } from "../context/render-context";
import type { PropValidationResult } from "./types";

const nonEmpty = z
  .string()
  .trim()
  .min(1)
  .max(UX_SPEC_LIMITS.maxStringLength);

const gapToken = z.enum(["xs", "sm", "md", "lg", "xl"]);

const navigateActionSchema = z
  .object({
    type: z.literal("navigate"),
    targetScreenId: nonEmpty.optional(),
    screenId: nonEmpty.optional(),
  })
  .strict();

const declarativeActionSchema = z.union([
  navigateActionSchema,
  z
    .object({
      type: z.literal("openDialog"),
      dialogId: nonEmpty,
    })
    .strict(),
  z
    .object({
      type: z.literal("submitDemoForm"),
      formId: nonEmpty,
    })
    .strict(),
  z
    .object({
      type: z.literal("noop"),
    })
    .strict(),
]);

export function normalizeDeclarativeAction(
  input: z.infer<typeof declarativeActionSchema>,
): DeclarativeAction {
  if (input.type === "navigate") {
    const targetScreenId = input.targetScreenId ?? input.screenId;
    if (!targetScreenId) {
      throw new Error("navigate action requires targetScreenId or screenId");
    }
    return {
      type: "navigate",
      targetScreenId,
    };
  }
  return input;
}

export const stackPropsSchema = z
  .object({
    gap: gapToken.optional(),
    direction: z.enum(["row", "column"]).optional(),
  })
  .strict();

export const gridPropsSchema = z
  .object({
    columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  })
  .strict();

export const panelPropsSchema = z
  .object({
    title: nonEmpty,
  })
  .strict();

export const textPropsSchema = z
  .object({
    content: nonEmpty,
    variant: z.enum(["body", "heading", "caption"]).optional(),
  })
  .strict();

export const buttonPropsSchema = z
  .object({
    label: nonEmpty,
    action: declarativeActionSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.action?.type === "navigate" &&
      !(value.action.targetScreenId ?? value.action.screenId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "navigate action requires targetScreenId or screenId",
        path: ["action"],
      });
    }
  })
  .transform((value) => ({
    label: value.label,
    action: value.action
      ? normalizeDeclarativeAction(value.action)
      : undefined,
  }));

export const inputPropsSchema = z
  .object({
    label: nonEmpty,
    name: nonEmpty,
    inputType: z.enum(["text", "email", "password"]).optional(),
  })
  .strict();

export const selectPropsSchema = z
  .object({
    label: nonEmpty,
    options: z.array(nonEmpty).min(1).max(50),
  })
  .strict();

export const navigationPropsSchema = z
  .object({
    orientation: z.enum(["horizontal", "vertical"]),
    items: z
      .array(
        z
          .object({
            label: nonEmpty,
            screenId: nonEmpty,
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

export const dataTablePropsSchema = z
  .object({
    caption: nonEmpty,
    columns: z.array(nonEmpty).min(1).max(20),
  })
  .strict();

export const statusBadgePropsSchema = z
  .object({
    label: nonEmpty,
    value: nonEmpty,
    tone: z.enum(["success", "warning", "danger", "info", "neutral"]),
  })
  .strict();

export const feedbackPropsSchema = z
  .object({
    tone: z.enum(["info", "success", "warning", "danger"]),
    message: nonEmpty,
  })
  .strict();

export const chartPropsSchema = z
  .object({
    chartType: z.enum(["sparkline", "bar"]),
    title: nonEmpty,
  })
  .strict();

export type StackProps = z.infer<typeof stackPropsSchema>;
export type GridProps = z.infer<typeof gridPropsSchema>;
export type PanelProps = z.infer<typeof panelPropsSchema>;
export type TextProps = z.infer<typeof textPropsSchema>;
export type ButtonProps = z.infer<typeof buttonPropsSchema>;
export type InputProps = z.infer<typeof inputPropsSchema>;
export type SelectProps = z.infer<typeof selectPropsSchema>;
export type NavigationProps = z.infer<typeof navigationPropsSchema>;
export type DataTableProps = z.infer<typeof dataTablePropsSchema>;
export type StatusBadgeProps = z.infer<typeof statusBadgePropsSchema>;
export type FeedbackProps = z.infer<typeof feedbackPropsSchema>;
export type ChartProps = z.infer<typeof chartPropsSchema>;

export function parseProps<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): PropValidationResult<z.infer<T>> {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    return {
      ok: false,
      message: result.error.issues.map((issue) => issue.message).join("; "),
    };
  }
  return { ok: true, props: result.data };
}
