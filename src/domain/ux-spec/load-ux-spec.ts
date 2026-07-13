import { collectInvariantIssues } from "./invariants";
import type { UXSpec, UXSpecLoadResult, UXSpecValidationIssue } from "./model";
import { normalizeUXSpec } from "./normalize";
import { uxSpecSchema } from "./schemas";

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
 * Single application boundary for untrusted UXSpec input.
 * Validates schema, normalizes defaults, enforces cross-reference invariants,
 * and returns a readonly frozen document.
 */
export function loadUXSpec(raw: unknown): UXSpecLoadResult {
  const parsed = uxSpecSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, issues: toIssues(parsed.error) };
  }

  const normalized = normalizeUXSpec(parsed.data as UXSpec);
  const invariantIssues = collectInvariantIssues(normalized);
  if (invariantIssues.length > 0) {
    return { ok: false, issues: invariantIssues };
  }

  return { ok: true, spec: normalized };
}
