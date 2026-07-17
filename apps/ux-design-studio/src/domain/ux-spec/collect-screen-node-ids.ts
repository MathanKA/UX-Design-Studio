import type { ComponentNode, ComponentNodeId } from "./model";

/**
 * Recursively collect every component node ID from a screen root tree.
 */
export function collectScreenNodeIds(root: ComponentNode): Set<ComponentNodeId> {
  const ids = new Set<ComponentNodeId>();

  function walk(node: ComponentNode): void {
    ids.add(node.id);
    for (const child of node.children ?? []) {
      walk(child);
    }
  }

  walk(root);
  return ids;
}

export type ScreenNodeOption = {
  id: ComponentNodeId;
  type: string;
  label: string;
};

/**
 * Depth-first list of screen nodes for revision multi-select labels.
 */
export function listScreenNodeOptions(
  root: ComponentNode,
): readonly ScreenNodeOption[] {
  const options: ScreenNodeOption[] = [];

  function walk(node: ComponentNode): void {
    options.push({
      id: node.id,
      type: String(node.type),
      label: `${node.id} (${String(node.type)})`,
    });
    for (const child of node.children ?? []) {
      walk(child);
    }
  }

  walk(root);
  return options;
}
