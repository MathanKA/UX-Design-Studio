import { z } from "zod";
import type { DesignTokens } from "../../domain/ux-spec";
import { designTokensSchema } from "../../domain/ux-spec";

export type UxdsCssVarName = `--uxds-${string}`;
export type UxdsCssVarMap = Readonly<Record<UxdsCssVarName, string>>;

const UNSAFE_VALUE =
  /(url\s*\(|expression\s*\(|javascript:|;|[{}]|@import|var\s*\()/i;

const cssColor = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb(a)?\([^)]+\)|hsl(a)?\([^)]+\)|[a-zA-Z]+)$/,
    "Unsafe or unsupported color value",
  )
  .refine((value) => !UNSAFE_VALUE.test(value), "Unsafe CSS value");

const cssLength = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^(\d+(\.\d+)?)(px|rem|em|%|ch|vh|vw)$|^0$/, "Unsafe length value")
  .refine((value) => !UNSAFE_VALUE.test(value), "Unsafe CSS value");

const fontFamily = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine((value) => !UNSAFE_VALUE.test(value), "Unsafe CSS value")
  .refine((value) => !/[<>]/.test(value), "Unsafe font family");

/**
 * Allowlisted preview overrides only — never arbitrary CSS property names.
 */
export const tokenOverrideSchema = z
  .object({
    color: z
      .object({
        primary: cssColor.optional(),
        primaryContrast: cssColor.optional(),
        surface: cssColor.optional(),
        surfaceMuted: cssColor.optional(),
        text: cssColor.optional(),
        textMuted: cssColor.optional(),
        border: cssColor.optional(),
        success: cssColor.optional(),
        warning: cssColor.optional(),
        danger: cssColor.optional(),
      })
      .strict()
      .optional(),
    typography: z
      .object({
        fontFamily: fontFamily.optional(),
        baseSize: cssLength.optional(),
        headingWeight: z.number().int().min(100).max(900).optional(),
        bodyWeight: z.number().int().min(100).max(900).optional(),
        lineHeight: z.number().positive().max(3).optional(),
      })
      .strict()
      .optional(),
    spacing: z
      .object({
        xs: cssLength.optional(),
        sm: cssLength.optional(),
        md: cssLength.optional(),
        lg: cssLength.optional(),
        xl: cssLength.optional(),
      })
      .strict()
      .optional(),
    radius: z
      .object({
        sm: cssLength.optional(),
        md: cssLength.optional(),
        lg: cssLength.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type TokenOverride = z.infer<typeof tokenOverrideSchema>;

export type TokenMapResult =
  | { ok: true; vars: UxdsCssVarMap; tokens: DesignTokens }
  | { ok: false; message: string };

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function mergeDesignTokens(
  base: DesignTokens,
  override: TokenOverride = {},
): DesignTokens {
  return deepFreeze({
    color: {
      primary: override.color?.primary ?? base.color.primary,
      primaryContrast:
        override.color?.primaryContrast ?? base.color.primaryContrast,
      surface: override.color?.surface ?? base.color.surface,
      surfaceMuted: override.color?.surfaceMuted ?? base.color.surfaceMuted,
      text: override.color?.text ?? base.color.text,
      textMuted: override.color?.textMuted ?? base.color.textMuted,
      border: override.color?.border ?? base.color.border,
      success: override.color?.success ?? base.color.success,
      warning: override.color?.warning ?? base.color.warning,
      danger: override.color?.danger ?? base.color.danger,
    },
    typography: {
      fontFamily: override.typography?.fontFamily ?? base.typography.fontFamily,
      baseSize: override.typography?.baseSize ?? base.typography.baseSize,
      headingWeight:
        override.typography?.headingWeight ?? base.typography.headingWeight,
      bodyWeight: override.typography?.bodyWeight ?? base.typography.bodyWeight,
      lineHeight: override.typography?.lineHeight ?? base.typography.lineHeight,
    },
    spacing: {
      xs: override.spacing?.xs ?? base.spacing.xs,
      sm: override.spacing?.sm ?? base.spacing.sm,
      md: override.spacing?.md ?? base.spacing.md,
      lg: override.spacing?.lg ?? base.spacing.lg,
      xl: override.spacing?.xl ?? base.spacing.xl,
    },
    radius: {
      sm: override.radius?.sm ?? base.radius.sm,
      md: override.radius?.md ?? base.radius.md,
      lg: override.radius?.lg ?? base.radius.lg,
    },
  });
}

export function mapDesignTokensToCssVars(tokens: DesignTokens): UxdsCssVarMap {
  return {
    "--uxds-color-primary": tokens.color.primary,
    "--uxds-color-primary-contrast": tokens.color.primaryContrast,
    "--uxds-color-surface": tokens.color.surface,
    "--uxds-color-surface-muted": tokens.color.surfaceMuted,
    "--uxds-color-text": tokens.color.text,
    "--uxds-color-text-muted": tokens.color.textMuted,
    "--uxds-color-border": tokens.color.border,
    "--uxds-color-success": tokens.color.success,
    "--uxds-color-warning": tokens.color.warning,
    "--uxds-color-danger": tokens.color.danger,
    "--uxds-font-family": tokens.typography.fontFamily,
    "--uxds-font-size-base": tokens.typography.baseSize,
    "--uxds-font-weight-heading": String(tokens.typography.headingWeight),
    "--uxds-font-weight-body": String(tokens.typography.bodyWeight),
    "--uxds-line-height": String(tokens.typography.lineHeight),
    "--uxds-space-xs": tokens.spacing.xs,
    "--uxds-space-sm": tokens.spacing.sm,
    "--uxds-space-md": tokens.spacing.md,
    "--uxds-space-lg": tokens.spacing.lg,
    "--uxds-space-xl": tokens.spacing.xl,
    "--uxds-radius-sm": tokens.radius.sm,
    "--uxds-radius-md": tokens.radius.md,
    "--uxds-radius-lg": tokens.radius.lg,
  };
}

export function createEffectiveTokenView(
  base: DesignTokens,
  overrideInput: unknown = {},
): TokenMapResult {
  const parsedBase = designTokensSchema.safeParse(base);
  if (!parsedBase.success) {
    return { ok: false, message: "Base design tokens failed validation." };
  }

  const parsedOverride = tokenOverrideSchema.safeParse(overrideInput ?? {});
  if (!parsedOverride.success) {
    return {
      ok: false,
      message: parsedOverride.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  const tokens = mergeDesignTokens(parsedBase.data, parsedOverride.data);
  const vars = mapDesignTokensToCssVars(tokens);
  for (const name of Object.keys(vars)) {
    if (!name.startsWith("--uxds-")) {
      return { ok: false, message: `Illegal CSS variable name: ${name}` };
    }
  }

  return { ok: true, vars, tokens };
}
