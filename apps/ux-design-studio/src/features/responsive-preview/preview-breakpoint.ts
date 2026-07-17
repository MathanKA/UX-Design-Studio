import type { PreviewBreakpoint } from "../../renderer";

/** Canonical reviewer-controlled preview breakpoints (architecture §21). */
export const PREVIEW_BREAKPOINTS = ["mobile", "tablet", "desktop"] as const;

export type PreviewBreakpointId = (typeof PREVIEW_BREAKPOINTS)[number];

/** Explicit preview frame widths in CSS pixels. */
export const PREVIEW_WIDTHS: Record<PreviewBreakpoint, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1280,
};

export const DEFAULT_PREVIEW_BREAKPOINT: PreviewBreakpoint = "desktop";

export const PREVIEW_BREAKPOINT_LABELS: Record<PreviewBreakpoint, string> = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
};

export function listAvailableBreakpoints(
  enableTabletPreview: boolean,
): readonly PreviewBreakpoint[] {
  if (enableTabletPreview) {
    return PREVIEW_BREAKPOINTS;
  }
  return PREVIEW_BREAKPOINTS.filter((bp) => bp !== "tablet");
}
