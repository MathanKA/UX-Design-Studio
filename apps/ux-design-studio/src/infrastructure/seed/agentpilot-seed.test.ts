import { describe, expect, it } from "vitest";
import {
  KNOWN_COMPONENT_TYPES,
  loadUXSpec,
  type ComponentNode,
} from "../../domain/ux-spec";
import { agentPilotSeed, loadAgentPilotSeed } from "./load-agentpilot-seed";

function countNodes(node: ComponentNode): number {
  return 1 + (node.children ?? []).reduce((sum, child) => sum + countNodes(child), 0);
}

function collectTypes(node: ComponentNode, types: Set<string>): void {
  types.add(node.type);
  for (const child of node.children ?? []) {
    collectTypes(child, types);
  }
}

describe("AgentPilot seed baseline", () => {
  it("passes the shared runtime validation boundary", () => {
    const loaded = loadAgentPilotSeed();
    expect(loaded.id).toBe("spec-agentpilot");
    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(agentPilotSeed)).toBe(true);
    expect(agentPilotSeed.title).toBe("AgentPilot");
  });

  it("contains required personas, journeys, screens, navigation, tokens, and a11y metadata", () => {
    expect(agentPilotSeed.personas.map((persona) => persona.name)).toEqual([
      "Alex",
      "Jordan",
      "Taylor",
    ]);
    expect(agentPilotSeed.journeys).toHaveLength(3);
    expect(agentPilotSeed.screens.map((screen) => screen.name)).toEqual([
      "Dashboard",
      "Login",
      "Task Detail",
      "Workflow Templates",
      "Reports Export",
    ]);
    expect(agentPilotSeed.navigation.desktop.placement).toBe("sidebar");
    expect(agentPilotSeed.navigation.mobile.placement).toBe("compact");
    expect(agentPilotSeed.designTokens.color.primary).toBe("#C8102E");
    expect(agentPilotSeed.accessibilityRequirements.length).toBeGreaterThan(0);
    expect(agentPilotSeed.version).toBe("1.0.0");
    expect(agentPilotSeed.baselineVersion).toBe("1.0.0");
  });

  it("contains approximately 30 composed nodes with unique IDs per screen", () => {
    const total = agentPilotSeed.screens.reduce(
      (sum, screen) => sum + countNodes(screen.root),
      0,
    );
    expect(total).toBeGreaterThanOrEqual(25);
    expect(total).toBeLessThanOrEqual(50);

    for (const screen of agentPilotSeed.screens) {
      const ids = new Set<string>();
      const walk = (node: ComponentNode) => {
        expect(ids.has(node.id)).toBe(false);
        ids.add(node.id);
        for (const child of node.children ?? []) walk(child);
      };
      walk(screen.root);
    }
  });

  it("uses only planned registry-relevant node types as data", () => {
    const types = new Set<string>();
    for (const screen of agentPilotSeed.screens) {
      collectTypes(screen.root, types);
    }

    for (const type of types) {
      expect(KNOWN_COMPONENT_TYPES).toContain(type);
    }

    // Representative coverage across layout, content, form, navigation, data, feedback, chart.
    for (const required of [
      "stack",
      "panel",
      "text",
      "button",
      "input",
      "navigation",
      "dataTable",
      "feedback",
      "chart",
    ] as const) {
      expect(types.has(required)).toBe(true);
    }
  });

  it("has no page-specific React screen modules for AgentPilot", async () => {
    // Seed is data-only; this contract guards against introducing hard-coded screen components.
    const modules = import.meta.glob("../../features/**/*Screen*.tsx");
    expect(Object.keys(modules)).toEqual([]);

    const reloaded = loadUXSpec(
      JSON.parse(JSON.stringify(agentPilotSeed)) as unknown,
    );
    expect(reloaded.ok).toBe(true);
  });
});
