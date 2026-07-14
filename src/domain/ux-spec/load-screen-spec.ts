import { collectScreenInvariantIssues } from "./invariants";
import type { ScreenSpec, UXSpecValidationIssue } from "./model";
import { normalizeScreenSpec } from "./normalize";
import { screenSpecSchema } from "./schemas";

export type LoadScreenSpecContext = {
  /** When set, provider output must keep the same screen identity. */
  expectedScreenId?: string;
  /** Optional persona allowlist for touchpoint checks. */
  knownPersonaIds?: ReadonlySet<string>;
};

export type ScreenSpecLoadResult =
  | { ok: true; screen: ScreenSpec }
  | { ok: false; issues: UXSpecValidationIssue[] };

function toIssues(error: {
  issues: Array<{ path: PropertyKey[]; message: string; code: string | number }>;
}): UXSpecValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    message: issue.message,
    code: String(issue.code),
  }));
}

/**
 * Shared runtime ScreenSpec validation used by seed load and provider activation.
 * Reuses screenSpecSchema + screen-local invariants (unique node IDs, depth, safe types).
 */
export function loadScreenSpec(
  raw: unknown,
  context: LoadScreenSpecContext = {},
): ScreenSpecLoadResult {
  const parsed = screenSpecSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, issues: toIssues(parsed.error) };
  }

  const normalized = normalizeScreenSpec(parsed.data as ScreenSpec);

  if (
    context.expectedScreenId !== undefined &&
    normalized.id !== context.expectedScreenId
  ) {
    return {
      ok: false,
      issues: [
        {
          path: "id",
          message: `Expected screen id "${context.expectedScreenId}" but received "${normalized.id}".`,
          code: "screen_id_mismatch",
        },
      ],
    };
  }

  const invariantIssues = collectScreenInvariantIssues(
    normalized,
    context.knownPersonaIds
      ? { knownPersonaIds: context.knownPersonaIds }
      : undefined,
  );  if (invariantIssues.length > 0) {
    return { ok: false, issues: invariantIssues };
  }

  return { ok: true, screen: normalized };
}
