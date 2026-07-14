import type { PreviewBreakpoint } from "../context/render-context";
import type { GridProps } from "../registry/prop-schemas";

/**
 * Resolve grid column count from seeded UXSpec columns and active breakpoint.
 * Does not accept arbitrary CSS from UXSpec.
 */
export function resolveGridColumns(
  seededColumns: GridProps["columns"],
  breakpoint: PreviewBreakpoint,
): GridProps["columns"] {
  if (breakpoint === "mobile") {
    return 1;
  }
  if (breakpoint === "tablet") {
    return Math.min(2, seededColumns) as 1 | 2;
  }
  return seededColumns;
}
