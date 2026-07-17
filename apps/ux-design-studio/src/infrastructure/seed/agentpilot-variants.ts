import type { ScreenSpec } from "../../domain/ux-spec";
import { loadScreenSpec } from "../../domain/ux-spec";

/** Stable content reference for the Dashboard regenerated variant. */
export const AGENTPILOT_DASHBOARD_V2_CONTENT_REF =
  "agentpilot.dashboard.v2" as const;

export const DASHBOARD_REGENERATION_TARGET_SCREEN_ID =
  "screen-dashboard" as const;

/**
 * Pre-authored Dashboard variant with visible differences from baseline:
 * copy, task priority, feedback panel, and accessibility notes.
 * Same screen id/route; allowlisted registry types only.
 */
const dashboardVariantRaw = {
  id: "screen-dashboard",
  name: "Dashboard",
  routeKey: "dashboard",
  description: "AgentPilot operational overview (regenerated v2)",
  root: {
    id: "dashboard-root",
    type: "stack",
    props: {
      gap: "md",
    },
    children: [
      {
        id: "dashboard-nav",
        type: "navigation",
        props: {
          orientation: "horizontal",
          items: [
            {
              label: "Overview",
              screenId: "screen-dashboard",
            },
            {
              label: "Tasks",
              screenId: "screen-task-detail",
            },
          ],
        },
        children: [],
      },
      {
        id: "dashboard-header",
        type: "panel",
        props: {
          title: "Priority dashboard",
        },
        children: [
          {
            id: "dashboard-title",
            type: "text",
            props: {
              content: "Priority operations view",
              variant: "heading",
            },
            children: [],
          },
          {
            id: "dashboard-subtitle",
            type: "text",
            props: {
              content:
                "Focus on blocked agents, high-priority tasks, and revision feedback.",
            },
            children: [],
          },
        ],
      },
      {
        id: "dashboard-metrics",
        type: "grid",
        props: {
          columns: 3,
        },
        children: [
          {
            id: "dashboard-metric-agents",
            type: "statusBadge",
            props: {
              label: "Blocked agents",
              value: "3",
              tone: "warning",
            },
            children: [],
          },
          {
            id: "dashboard-metric-tasks",
            type: "statusBadge",
            props: {
              label: "High-priority tasks",
              value: "8",
              tone: "danger",
            },
            children: [],
          },
          {
            id: "dashboard-metric-sla",
            type: "chart",
            props: {
              chartType: "sparkline",
              title: "Escalation trend",
            },
            children: [],
          },
        ],
      },
      {
        id: "dashboard-table",
        type: "dataTable",
        props: {
          caption: "Priority queue",
          columns: ["Task", "Owner", "Priority", "Status"],
        },
        children: [],
      },
      {
        id: "dashboard-feedback",
        type: "feedback",
        props: {
          tone: "info",
          message:
            "Revision applied: layout and priority cues refreshed from the latest structured revision request.",
        },
        children: [],
      },
      {
        id: "dashboard-cta",
        type: "button",
        props: {
          label: "Review priority task",
          action: {
            type: "navigate",
            screenId: "screen-task-detail",
          },
        },
        children: [],
      },
    ],
    accessibility: [
      {
        type: "aria",
        role: "main",
        label: "Priority dashboard",
      },
      {
        type: "screenReader",
        note: "Announces high-priority task count when the dashboard loads.",
      },
    ],
  },
  personaTouchpoints: [
    {
      personaId: "persona-alex",
      goals: ["Clear blocked work first"],
      frustrations: ["Buried priority"],
    },
    {
      personaId: "persona-jordan",
      goals: ["Confirm revised hierarchy"],
    },
  ],
  responsive: {
    mobile: {
      layoutHint: "stack-priority-metrics",
    },
    desktop: {
      layoutHint: "sidebar-content",
    },
  },
  accessibility: [
    {
      type: "keyboard",
      note: "Priority CTA and feedback panel are reachable in tab order",
    },
    {
      type: "contrast",
      status: "pass",
      ratio: 7.2,
    },
  ],
} as const;

function requireValidatedVariant(raw: unknown): ScreenSpec {
  const loaded = loadScreenSpec(raw, {
    expectedScreenId: DASHBOARD_REGENERATION_TARGET_SCREEN_ID,
  });
  if (!loaded.ok) {
    throw new Error(
      `Invalid AgentPilot dashboard variant: ${loaded.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  return loaded.screen;
}

export const agentPilotDashboardVariantV2: ScreenSpec =
  requireValidatedVariant(dashboardVariantRaw);

export type ScreenContentRegistry = {
  resolve(contentRef: string): ScreenSpec | undefined;
};

export function createAgentPilotContentRegistry(): ScreenContentRegistry {
  const entries = new Map<string, ScreenSpec>([
    [AGENTPILOT_DASHBOARD_V2_CONTENT_REF, agentPilotDashboardVariantV2],
  ]);

  return {
    resolve(contentRef: string): ScreenSpec | undefined {
      return entries.get(contentRef);
    },
  };
}
