import { describe, expect, it } from "vitest";
import type { ComponentNode } from "./model";
import {
  countComponentNodes,
  countSpecComponentNodes,
} from "./count-component-nodes";
import {
  deriveUXSpecOverviewSummary,
  listOverviewScreens,
} from "./overview-selectors";
import { agentPilotSeed } from "../../infrastructure/seed";

function node(
  id: string,
  children: ComponentNode[] = [],
): ComponentNode {
  return { id, type: "stack", children };
}

describe("countComponentNodes", () => {
  it("counts the root alone", () => {
    expect(countComponentNodes(node("root"))).toBe(1);
  });

  it("counts nested trees recursively and deterministically", () => {
    const tree = node("root", [
      node("a", [node("a1"), node("a2")]),
      node("b"),
    ]);
    expect(countComponentNodes(tree)).toBe(5);
    expect(countComponentNodes(tree)).toBe(5);
  });
});

describe("overview selectors", () => {
  it("derives counts from the UXSpec rather than hard-coded constants", () => {
    const summary = deriveUXSpecOverviewSummary(agentPilotSeed);
    expect(summary.personaCount).toBe(agentPilotSeed.personas.length);
    expect(summary.journeyCount).toBe(agentPilotSeed.journeys.length);
    expect(summary.screenCount).toBe(agentPilotSeed.screens.length);
    expect(summary.componentNodeCount).toBe(
      countSpecComponentNodes(agentPilotSeed),
    );
    expect(summary.projectTitle).toBe(agentPilotSeed.title);
    expect(summary.baselineVersion).toBe(agentPilotSeed.baselineVersion);
    expect(summary.specificationVersion).toBe(agentPilotSeed.version);
  });

  it("summarizes design-system tokens from the UXSpec", () => {
    const summary = deriveUXSpecOverviewSummary(agentPilotSeed);
    expect(summary.designSystem.primaryColor).toBe(
      agentPilotSeed.designTokens.color.primary,
    );
    expect(summary.designSystem.fontFamily).toBe(
      agentPilotSeed.designTokens.typography.fontFamily,
    );
    expect(summary.designSystem.spacingScale).toEqual(
      agentPilotSeed.designTokens.spacing,
    );
    expect(summary.designSystem.radiusScale).toEqual(
      agentPilotSeed.designTokens.radius,
    );
  });

  it("lists every screen with a canonical review href", () => {
    const screens = listOverviewScreens(agentPilotSeed);
    expect(screens).toHaveLength(agentPilotSeed.screens.length);
    for (const screen of agentPilotSeed.screens) {
      const card = screens.find((entry) => entry.id === screen.id);
      expect(card?.reviewHref).toBe(`/review/${screen.id}`);
      expect(card?.routeKey).toBe(screen.routeKey);
    }
  });
});
