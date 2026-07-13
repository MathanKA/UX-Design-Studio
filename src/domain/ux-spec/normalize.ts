import type { ComponentNode, ScreenSpec, UXSpec } from "./model";

function freezeDeep<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      freezeDeep(item);
    }
    return Object.freeze(value);
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    freezeDeep(nested);
  }
  return Object.freeze(value);
}

function normalizeNode(node: ComponentNode): ComponentNode {
  return {
    id: node.id,
    type: node.type,
    ...(node.props ? { props: { ...node.props } } : {}),
    ...(node.children
      ? { children: node.children.map((child) => normalizeNode(child)) }
      : { children: [] }),
    ...(node.visibleWhen ? { visibleWhen: { ...node.visibleWhen } } : {}),
    ...(node.accessibility
      ? { accessibility: node.accessibility.map((item) => ({ ...item })) }
      : { accessibility: [] }),
  };
}

function normalizeScreen(screen: ScreenSpec): ScreenSpec {
  return {
    id: screen.id,
    name: screen.name,
    routeKey: screen.routeKey,
    ...(screen.description ? { description: screen.description } : {}),
    root: normalizeNode(screen.root),
    personaTouchpoints: (screen.personaTouchpoints ?? []).map((touchpoint) => ({
      ...touchpoint,
      goals: [...(touchpoint.goals ?? [])],
      frustrations: [...(touchpoint.frustrations ?? [])],
    })),
    responsive: screen.responsive
      ? {
          ...(screen.responsive.mobile ? { mobile: { ...screen.responsive.mobile } } : {}),
          ...(screen.responsive.tablet ? { tablet: { ...screen.responsive.tablet } } : {}),
          ...(screen.responsive.desktop ? { desktop: { ...screen.responsive.desktop } } : {}),
        }
      : {
          mobile: {},
          tablet: {},
          desktop: {},
        },
    accessibility: (screen.accessibility ?? []).map((item) => ({ ...item })),
  };
}

/**
 * Apply explicit safe defaults and return a deeply frozen UXSpec.
 * Does not invent governance fields.
 */
export function normalizeUXSpec(spec: UXSpec): UXSpec {
  const normalized: UXSpec = {
    id: spec.id,
    projectId: spec.projectId,
    version: spec.version,
    baselineVersion: spec.baselineVersion,
    title: spec.title,
    ...(spec.description ? { description: spec.description } : {}),
    personas: spec.personas.map((persona) => ({
      ...persona,
      goals: [...persona.goals],
      frustrations: [...persona.frustrations],
      devicePreferences: [...(persona.devicePreferences ?? [])],
    })),
    journeys: spec.journeys.map((journey) => ({
      ...journey,
      steps: journey.steps.map((step) => ({ ...step })),
    })),
    screens: spec.screens.map((screen) => normalizeScreen(screen)),
    navigation: {
      desktop: {
        placement: "sidebar",
        items: spec.navigation.desktop.items.map((item) => ({ ...item })),
      },
      mobile: {
        placement: "compact",
        items: spec.navigation.mobile.items.map((item) => ({ ...item })),
      },
    },
    designTokens: {
      color: { ...spec.designTokens.color },
      typography: { ...spec.designTokens.typography },
      spacing: { ...spec.designTokens.spacing },
      radius: { ...spec.designTokens.radius },
    },
    accessibilityRequirements: spec.accessibilityRequirements.map((item) => ({ ...item })),
    performanceConsiderations: [...spec.performanceConsiderations],
  };

  return freezeDeep(normalized);
}
