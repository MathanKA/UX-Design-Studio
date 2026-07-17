import type { UXSpec } from "../model";

export function createValidUXSpecFixture(overrides: Partial<UXSpec> = {}): UXSpec {
  const base: UXSpec = {
    id: "spec-agentpilot",
    projectId: "project-agentpilot",
    version: "1.0.0",
    baselineVersion: "1.0.0",
    title: "AgentPilot",
    description: "Fixture specification",
    personas: [
      {
        id: "persona-alex",
        name: "Alex",
        role: "Product Owner",
        goals: ["Approve screens quickly"],
        frustrations: ["Unclear status"],
      },
    ],
    journeys: [
      {
        id: "journey-review",
        name: "Review flow",
        personaId: "persona-alex",
        steps: [
          {
            id: "step-1",
            order: 1,
            screenId: "screen-dashboard",
            title: "Open dashboard",
            description: "Start from the dashboard",
            targetNodeId: "dashboard-root",
          },
        ],
      },
    ],
    screens: [
      {
        id: "screen-dashboard",
        name: "Dashboard",
        routeKey: "dashboard",
        root: {
          id: "dashboard-root",
          type: "stack",
          props: { gap: "md" },
          children: [
            {
              id: "dashboard-title",
              type: "text",
              props: { content: "Dashboard" },
              children: [],
            },
          ],
        },
      },
    ],
    navigation: {
      desktop: {
        placement: "sidebar",
        items: [
          {
            id: "nav-dashboard",
            label: "Dashboard",
            screenId: "screen-dashboard",
          },
        ],
      },
      mobile: {
        placement: "compact",
        items: [
          {
            id: "nav-dashboard-mobile",
            label: "Dashboard",
            screenId: "screen-dashboard",
          },
        ],
      },
    },
    designTokens: {
      color: {
        primary: "#C8102E",
        primaryContrast: "#FFFFFF",
        surface: "#FFFFFF",
        surfaceMuted: "#F5F5F5",
        text: "#1A1A1A",
        textMuted: "#5C5C5C",
        border: "#D0D0D0",
        success: "#0B6E4F",
        warning: "#B8860B",
        danger: "#C8102E",
      },
      typography: {
        fontFamily: "Segoe UI",
        baseSize: "16px",
        headingWeight: 600,
        bodyWeight: 400,
        lineHeight: 1.5,
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
      radius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
      },
    },
    accessibilityRequirements: [
      {
        id: "a11y-1",
        description: "Provide visible focus indicators",
        wcagCriteria: "2.4.7",
      },
    ],
    performanceConsiderations: ["Validate once at load time"],
  };

  return {
    ...base,
    ...overrides,
  };
}
