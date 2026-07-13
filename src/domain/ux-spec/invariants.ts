import type { ComponentNode, ScreenSpec, UXSpec, UXSpecValidationIssue } from "./model";
import { UX_SPEC_LIMITS } from "./model";

function issue(path: string, message: string, code: string): UXSpecValidationIssue {
  return { path, message, code };
}

function walkNodes(
  node: ComponentNode,
  screenId: string,
  depth: number,
  ids: Set<string>,
  issues: UXSpecValidationIssue[],
): number {
  let count = 1;

  if (depth > UX_SPEC_LIMITS.maxTreeDepth) {
    issues.push(
      issue(
        `screens[${screenId}].nodes[${node.id}]`,
        `Component tree depth exceeds ${UX_SPEC_LIMITS.maxTreeDepth}`,
        "max_depth",
      ),
    );
  }

  if (ids.has(node.id)) {
    issues.push(
      issue(
        `screens[${screenId}].nodes[${node.id}]`,
        `Duplicate component node id "${node.id}" within screen`,
        "duplicate_node_id",
      ),
    );
  } else {
    ids.add(node.id);
  }

  for (const child of node.children ?? []) {
    count += walkNodes(child, screenId, depth + 1, ids, issues);
  }

  return count;
}

export function collectInvariantIssues(spec: UXSpec): UXSpecValidationIssue[] {
  const issues: UXSpecValidationIssue[] = [];

  const personaIds = new Set(spec.personas.map((persona) => persona.id));
  const screenIds = new Set(spec.screens.map((screen) => screen.id));
  const screenById = new Map(spec.screens.map((screen) => [screen.id, screen]));

  if (personaIds.size !== spec.personas.length) {
    issues.push(issue("personas", "Persona IDs must be unique", "duplicate_persona_id"));
  }
  if (screenIds.size !== spec.screens.length) {
    issues.push(issue("screens", "Screen IDs must be unique", "duplicate_screen_id"));
  }

  const journeyIds = new Set(spec.journeys.map((journey) => journey.id));
  if (journeyIds.size !== spec.journeys.length) {
    issues.push(issue("journeys", "Journey IDs must be unique", "duplicate_journey_id"));
  }

  for (const journey of spec.journeys) {
    if (!personaIds.has(journey.personaId)) {
      issues.push(
        issue(
          `journeys[${journey.id}].personaId`,
          `Unknown persona reference "${journey.personaId}"`,
          "broken_persona_ref",
        ),
      );
    }

    for (const step of journey.steps) {
      if (!screenIds.has(step.screenId)) {
        issues.push(
          issue(
            `journeys[${journey.id}].steps[${step.id}].screenId`,
            `Unknown screen reference "${step.screenId}"`,
            "broken_screen_ref",
          ),
        );
        continue;
      }

      if (step.targetNodeId) {
        const screen = screenById.get(step.screenId);
        if (screen && !screenContainsNode(screen, step.targetNodeId)) {
          issues.push(
            issue(
              `journeys[${journey.id}].steps[${step.id}].targetNodeId`,
              `Unknown node reference "${step.targetNodeId}" on screen "${step.screenId}"`,
              "broken_node_ref",
            ),
          );
        }
      }
    }
  }

  for (const screen of spec.screens) {
    for (const touchpoint of screen.personaTouchpoints ?? []) {
      if (!personaIds.has(touchpoint.personaId)) {
        issues.push(
          issue(
            `screens[${screen.id}].personaTouchpoints`,
            `Unknown persona reference "${touchpoint.personaId}"`,
            "broken_persona_ref",
          ),
        );
      }
    }

    const nodeIds = new Set<string>();
    const nodeCount = walkNodes(screen.root, screen.id, 1, nodeIds, issues);
    if (nodeCount > UX_SPEC_LIMITS.maxNodesPerScreen) {
      issues.push(
        issue(
          `screens[${screen.id}]`,
          `Screen exceeds ${UX_SPEC_LIMITS.maxNodesPerScreen} composed nodes`,
          "max_nodes",
        ),
      );
    }
  }

  const navigationGroups = [
    { path: "navigation.desktop.items", items: spec.navigation.desktop.items },
    { path: "navigation.mobile.items", items: spec.navigation.mobile.items },
  ] as const;

  for (const group of navigationGroups) {
    for (const item of group.items) {
      if (!screenIds.has(item.screenId)) {
        issues.push(
          issue(
            `${group.path}[${item.id}].screenId`,
            `Unknown navigation screen reference "${item.screenId}"`,
            "broken_navigation_ref",
          ),
        );
      }
    }
  }

  return issues;
}

function screenContainsNode(screen: ScreenSpec, nodeId: string): boolean {
  const stack: ComponentNode[] = [screen.root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.id === nodeId) return true;
    if (node.children) stack.push(...node.children);
  }
  return false;
}
