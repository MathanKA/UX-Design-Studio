import type {
  ScreenVersionRecord,
} from "../domain/governance";
import type { ScreenSpec, UXSpec } from "../domain/ux-spec";

/**
 * Resolves baseline screen content from the immutable seed UXSpec,
 * or regenerated content via a contentRef registry.
 */
export type ScreenContentResolver = {
  resolve(contentRef: string): ScreenSpec | undefined;
};

export type ResolveScreenVersionContentInput = {
  version: ScreenVersionRecord;
  seed: UXSpec;
  contentRegistry: ScreenContentResolver;
};

export type ResolveScreenVersionContentResult =
  | { ok: true; screen: ScreenSpec }
  | { ok: false; reason: "missing_baseline" | "missing_content_ref" | "unresolved_content_ref" };

export function resolveBaselineScreen(
  seed: UXSpec,
  screenId: string,
): ScreenSpec | undefined {
  return seed.screens.find((screen) => screen.id === screenId);
}

export function resolveScreenVersionContent(
  input: ResolveScreenVersionContentInput,
): ResolveScreenVersionContentResult {
  const { version, seed, contentRegistry } = input;

  if (version.source === "baseline") {
    const screen = resolveBaselineScreen(seed, version.screenId);
    if (!screen) {
      return { ok: false, reason: "missing_baseline" };
    }
    return { ok: true, screen };
  }

  const contentRef = version.contentRef?.trim();
  if (!contentRef) {
    return { ok: false, reason: "missing_content_ref" };
  }

  const screen = contentRegistry.resolve(contentRef);
  if (!screen) {
    return { ok: false, reason: "unresolved_content_ref" };
  }

  return { ok: true, screen };
}
