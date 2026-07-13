import { z } from "zod";
import {
  ALLOWED_URL_PROTOCOLS,
  KNOWN_COMPONENT_TYPES,
  UX_SPEC_LIMITS,
} from "./model";

const nonEmpty = z
  .string()
  .trim()
  .min(1)
  .max(UX_SPEC_LIMITS.maxStringLength);

const optionalString = z
  .string()
  .trim()
  .max(UX_SPEC_LIMITS.maxStringLength)
  .optional();

const cssColor = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb(a)?\([^)]+\)|hsl(a)?\([^)]+\)|[a-zA-Z]+)$/,
    "Unsafe or unsupported color value",
  );

const cssLength = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(
    /^(\d+(\.\d+)?)(px|rem|em|%|ch|vh|vw)$|^0$/,
    "Unsafe or unsupported length value",
  );

const safeUrl = z
  .string()
  .trim()
  .max(UX_SPEC_LIMITS.maxStringLength)
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return (ALLOWED_URL_PROTOCOLS as readonly string[]).includes(parsed.protocol);
    } catch {
      return false;
    }
  }, "URL protocol is not allowlisted");

const accessibilityAnnotationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("contrast"),
    status: z.enum(["pass", "warning"]),
    ratio: z.number().positive().max(100).optional(),
  }),
  z.object({
    type: z.literal("aria"),
    role: optionalString,
    label: optionalString,
  }),
  z.object({
    type: z.literal("screenReader"),
    note: nonEmpty,
  }),
  z.object({
    type: z.literal("keyboard"),
    note: nonEmpty,
  }),
]);

const visibilityRuleSchema = z
  .object({
    breakpoint: z.enum(["mobile", "tablet", "desktop"]).optional(),
    personaId: nonEmpty.optional(),
  })
  .strict();

const personaTouchpointSchema = z
  .object({
    personaId: nonEmpty,
    goals: z.array(nonEmpty).max(20).optional(),
    frustrations: z.array(nonEmpty).max(20).optional(),
    notes: optionalString,
  })
  .strict();

const responsiveScreenSchema = z
  .object({
    mobile: z.object({ layoutHint: optionalString }).strict().optional(),
    tablet: z.object({ layoutHint: optionalString }).strict().optional(),
    desktop: z.object({ layoutHint: optionalString }).strict().optional(),
  })
  .strict();

const forbiddenExecutableKeys = new Set([
  "dangerouslySetInnerHTML",
  "__html",
  "onClick",
  "onChange",
  "onSubmit",
  "childrenAsHtml",
  "script",
  "eval",
]);

function isPlainJsonValue(value: unknown, depth = 0): boolean {
  if (depth > 6) return false;
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((item) => isPlainJsonValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).every(([key, entry]) => {
      if (forbiddenExecutableKeys.has(key)) return false;
      if (typeof entry === "function") return false;
      if (key.toLowerCase().startsWith("on") && key.length > 2) return false;
      if (
        typeof entry === "string" &&
        (key === "href" || key === "src" || key === "url") &&
        !safeUrl.safeParse(entry).success &&
        entry.length > 0
      ) {
        // Allow relative paths for in-app navigation; reject protocol URLs that fail allowlist.
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(entry)) return false;
      }
      return isPlainJsonValue(entry, depth + 1);
    });
  }
  return false;
}

const propsSchema = z
  .record(z.string(), z.unknown())
  .refine(isPlainJsonValue, "Props contain unsafe or non-JSON values")
  .optional();

export const componentNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      id: nonEmpty,
      type: z.string().trim().min(1).max(64),
      props: propsSchema,
      children: z.array(componentNodeSchema).max(UX_SPEC_LIMITS.maxChildrenPerNode).optional(),
      visibleWhen: visibilityRuleSchema.optional(),
      accessibility: z.array(accessibilityAnnotationSchema).max(20).optional(),
    })
    .strict(),
);

export const screenSpecSchema = z
  .object({
    id: nonEmpty,
    name: nonEmpty,
    routeKey: nonEmpty,
    description: optionalString,
    root: componentNodeSchema,
    personaTouchpoints: z.array(personaTouchpointSchema).max(10).optional(),
    responsive: responsiveScreenSchema.optional(),
    accessibility: z.array(accessibilityAnnotationSchema).max(20).optional(),
  })
  .strict();

export const personaSchema = z
  .object({
    id: nonEmpty,
    name: nonEmpty,
    role: nonEmpty,
    technicalProficiency: optionalString,
    goals: z.array(nonEmpty).min(1).max(20),
    frustrations: z.array(nonEmpty).min(1).max(20),
    devicePreferences: z.array(nonEmpty).max(10).optional(),
  })
  .strict();

export const journeyStepSchema = z
  .object({
    id: nonEmpty,
    order: z.number().int().nonnegative(),
    screenId: nonEmpty,
    title: nonEmpty,
    description: nonEmpty,
    targetNodeId: nonEmpty.optional(),
  })
  .strict();

export const journeySchema = z
  .object({
    id: nonEmpty,
    name: nonEmpty,
    personaId: nonEmpty,
    steps: z.array(journeyStepSchema).min(1).max(50),
  })
  .strict();

const navigationItemSchema = z
  .object({
    id: nonEmpty,
    label: nonEmpty,
    screenId: nonEmpty,
    icon: optionalString,
  })
  .strict();

export const navigationSpecSchema = z
  .object({
    desktop: z
      .object({
        placement: z.literal("sidebar"),
        items: z.array(navigationItemSchema).min(1).max(30),
      })
      .strict(),
    mobile: z
      .object({
        placement: z.literal("compact"),
        items: z.array(navigationItemSchema).min(1).max(30),
      })
      .strict(),
  })
  .strict();

export const designTokensSchema = z
  .object({
    color: z
      .object({
        primary: cssColor,
        primaryContrast: cssColor,
        surface: cssColor,
        surfaceMuted: cssColor,
        text: cssColor,
        textMuted: cssColor,
        border: cssColor,
        success: cssColor,
        warning: cssColor,
        danger: cssColor,
      })
      .strict(),
    typography: z
      .object({
        fontFamily: nonEmpty,
        baseSize: cssLength,
        headingWeight: z.number().int().min(100).max(900),
        bodyWeight: z.number().int().min(100).max(900),
        lineHeight: z.number().positive().max(3),
      })
      .strict(),
    spacing: z
      .object({
        xs: cssLength,
        sm: cssLength,
        md: cssLength,
        lg: cssLength,
        xl: cssLength,
      })
      .strict(),
    radius: z
      .object({
        sm: cssLength,
        md: cssLength,
        lg: cssLength,
      })
      .strict(),
  })
  .strict();

export const accessibilityRequirementSchema = z
  .object({
    id: nonEmpty,
    description: nonEmpty,
    wcagCriteria: optionalString,
  })
  .strict();

export const uxSpecSchema = z
  .object({
    id: nonEmpty,
    projectId: nonEmpty,
    version: nonEmpty,
    baselineVersion: nonEmpty,
    title: nonEmpty,
    description: optionalString,
    personas: z.array(personaSchema).min(1).max(20),
    journeys: z.array(journeySchema).min(1).max(20),
    screens: z.array(screenSpecSchema).min(1).max(UX_SPEC_LIMITS.maxScreens),
    navigation: navigationSpecSchema,
    designTokens: designTokensSchema,
    accessibilityRequirements: z.array(accessibilityRequirementSchema).max(50),
    performanceConsiderations: z.array(nonEmpty).max(50),
  })
  .strict()
  .superRefine((value, ctx) => {
    const governanceLeakKeys = [
      "approvals",
      "approvalStatus",
      "auditEvents",
      "governance",
      "screenVersions",
    ];
    for (const key of governanceLeakKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `UXSpec must not store governance state (${key})`,
          path: [key],
        });
      }
    }
  });

export const knownComponentTypeSchema = z.enum(KNOWN_COMPONENT_TYPES);

export type RawUXSpec = z.input<typeof uxSpecSchema>;
