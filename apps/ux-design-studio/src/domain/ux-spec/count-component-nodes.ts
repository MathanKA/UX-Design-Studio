import type { ComponentNode, UXSpec } from "./model";

/**
 * Recursively counts component nodes, including the root.
 * Deterministic for a given immutable ComponentNode tree.
 */
export function countComponentNodes(node: ComponentNode): number {
  const children = node.children ?? [];
  return 1 + children.reduce((total, child) => total + countComponentNodes(child), 0);
}

/**
 * Counts every component node across all screens in a UXSpec.
 */
export function countSpecComponentNodes(spec: UXSpec): number {
  return spec.screens.reduce(
    (total, screen) => total + countComponentNodes(screen.root),
    0,
  );
}
