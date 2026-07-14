import type { DesignTokens, ScreenId, UXSpec } from "./model";
import { countSpecComponentNodes } from "./count-component-nodes";

export type DesignSystemSummary = {
  primaryColor: string;
  primaryContrast: string;
  fontFamily: string;
  baseSize: string;
  headingWeight: number;
  bodyWeight: number;
  spacingScale: DesignTokens["spacing"];
  radiusScale: DesignTokens["radius"];
};

export type UXSpecOverviewSummary = {
  projectTitle: string;
  projectId: string;
  baselineVersion: string;
  specificationVersion: string;
  personaCount: number;
  journeyCount: number;
  screenCount: number;
  componentNodeCount: number;
  designSystem: DesignSystemSummary;
};

export type OverviewScreenCard = {
  id: ScreenId;
  name: string;
  description?: string;
  routeKey: string;
  reviewHref: string;
};

export function deriveDesignSystemSummary(tokens: DesignTokens): DesignSystemSummary {
  return {
    primaryColor: tokens.color.primary,
    primaryContrast: tokens.color.primaryContrast,
    fontFamily: tokens.typography.fontFamily,
    baseSize: tokens.typography.baseSize,
    headingWeight: tokens.typography.headingWeight,
    bodyWeight: tokens.typography.bodyWeight,
    spacingScale: tokens.spacing,
    radiusScale: tokens.radius,
  };
}

export function deriveUXSpecOverviewSummary(spec: UXSpec): UXSpecOverviewSummary {
  return {
    projectTitle: spec.title,
    projectId: spec.projectId,
    baselineVersion: spec.baselineVersion,
    specificationVersion: spec.version,
    personaCount: spec.personas.length,
    journeyCount: spec.journeys.length,
    screenCount: spec.screens.length,
    componentNodeCount: countSpecComponentNodes(spec),
    designSystem: deriveDesignSystemSummary(spec.designTokens),
  };
}

export function listOverviewScreens(spec: UXSpec): readonly OverviewScreenCard[] {
  return spec.screens.map((screen) => {
    const card: OverviewScreenCard = {
      id: screen.id,
      name: screen.name,
      routeKey: screen.routeKey,
      reviewHref: `/review/${screen.id}`,
    };
    if (screen.description !== undefined) {
      card.description = screen.description;
    }
    return card;
  });
}
