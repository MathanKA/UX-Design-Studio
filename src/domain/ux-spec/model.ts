/**
 * Framework-independent UXSpec domain models.
 * Governance/approval state must not be stored on these types.
 */

export type ProjectId = string;
export type SpecId = string;
export type ScreenId = string;
export type PersonaId = string;
export type JourneyId = string;
export type ComponentNodeId = string;

export const KNOWN_COMPONENT_TYPES = [
  "stack",
  "grid",
  "panel",
  "text",
  "button",
  "input",
  "select",
  "navigation",
  "dataTable",
  "statusBadge",
  "feedback",
  "chart",
] as const;

export type ComponentType = (typeof KNOWN_COMPONENT_TYPES)[number];

export type AccessibilityAnnotation =
  | { type: "contrast"; status: "pass" | "warning"; ratio?: number }
  | { type: "aria"; role?: string; label?: string }
  | { type: "screenReader"; note: string }
  | { type: "keyboard"; note: string };

export type VisibilityRule = {
  breakpoint?: "mobile" | "tablet" | "desktop";
  personaId?: PersonaId;
};

export type PersonaTouchpoint = {
  personaId: PersonaId;
  goals?: string[];
  frustrations?: string[];
  notes?: string;
};

export type ResponsiveScreenSpec = {
  mobile?: { layoutHint?: string };
  tablet?: { layoutHint?: string };
  desktop?: { layoutHint?: string };
};

export type ComponentNode = {
  id: ComponentNodeId;
  type: ComponentType | string;
  props?: Readonly<Record<string, unknown>>;
  children?: readonly ComponentNode[];
  visibleWhen?: VisibilityRule;
  accessibility?: readonly AccessibilityAnnotation[];
};

export type ScreenSpec = {
  id: ScreenId;
  name: string;
  routeKey: string;
  description?: string;
  root: ComponentNode;
  personaTouchpoints?: readonly PersonaTouchpoint[];
  responsive?: ResponsiveScreenSpec;
  accessibility?: readonly AccessibilityAnnotation[];
};

export type Persona = {
  id: PersonaId;
  name: string;
  role: string;
  technicalProficiency?: string;
  goals: readonly string[];
  frustrations: readonly string[];
  devicePreferences?: readonly string[];
};

export type JourneyStep = {
  id: string;
  order: number;
  screenId: ScreenId;
  title: string;
  description: string;
  targetNodeId?: ComponentNodeId;
};

export type Journey = {
  id: JourneyId;
  name: string;
  personaId: PersonaId;
  steps: readonly JourneyStep[];
};

export type NavigationItem = {
  id: string;
  label: string;
  screenId: ScreenId;
  icon?: string;
};

export type NavigationSpec = {
  desktop: {
    placement: "sidebar";
    items: readonly NavigationItem[];
  };
  mobile: {
    placement: "compact";
    items: readonly NavigationItem[];
  };
};

export type DesignTokens = {
  color: {
    primary: string;
    primaryContrast: string;
    surface: string;
    surfaceMuted: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
  };
  typography: {
    fontFamily: string;
    baseSize: string;
    headingWeight: number;
    bodyWeight: number;
    lineHeight: number;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
};

export type AccessibilityRequirement = {
  id: string;
  description: string;
  wcagCriteria?: string;
};

export type UXSpec = {
  readonly id: SpecId;
  readonly projectId: ProjectId;
  readonly version: string;
  readonly baselineVersion: string;
  readonly title: string;
  readonly description?: string;
  readonly personas: readonly Persona[];
  readonly journeys: readonly Journey[];
  readonly screens: readonly ScreenSpec[];
  readonly navigation: NavigationSpec;
  readonly designTokens: DesignTokens;
  readonly accessibilityRequirements: readonly AccessibilityRequirement[];
  readonly performanceConsiderations: readonly string[];
};

export type UXSpecValidationIssue = {
  path: string;
  message: string;
  code: string;
};

export type UXSpecLoadResult =
  | { ok: true; spec: UXSpec }
  | { ok: false; issues: readonly UXSpecValidationIssue[] };

export const UX_SPEC_LIMITS = {
  maxStringLength: 2_000,
  maxTreeDepth: 12,
  maxChildrenPerNode: 50,
  maxScreens: 50,
  maxNodesPerScreen: 200,
} as const;

export const ALLOWED_URL_PROTOCOLS = ["https:", "http:", "mailto:"] as const;
