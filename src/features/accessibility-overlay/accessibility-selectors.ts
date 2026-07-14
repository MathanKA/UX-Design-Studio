import type {
  AccessibilityAnnotation,
  AccessibilityRequirement,
  ComponentNode,
  ScreenSpec,
  UXSpec,
} from "../../domain/ux-spec";

export type AccessibilityAnnotationKind =
  | "contrast"
  | "aria"
  | "screenReader"
  | "keyboard"
  | "requirement";

export type DerivedAccessibilityAnnotation = {
  id: string;
  kind: AccessibilityAnnotationKind;
  source: "requirement" | "screen" | "node";
  sourceLabel: string;
  nodeId?: string;
  summary: string;
  detail: string;
  contrastStatus?: "pass" | "warning";
  contrastRatio?: number;
  annotation: AccessibilityAnnotation | AccessibilityRequirement;
};

export type AccessibilityOverlayDerivation = {
  annotations: readonly DerivedAccessibilityAnnotation[];
  contrastAnnotations: readonly DerivedAccessibilityAnnotation[];
  byKind: Record<
    Exclude<AccessibilityAnnotationKind, "requirement">,
    number
  >;
  hasPartialMetadata: boolean;
  isEmpty: boolean;
};

function summarizeAnnotation(
  annotation: AccessibilityAnnotation,
): { summary: string; detail: string } {
  switch (annotation.type) {
    case "contrast": {
      const ratio =
        typeof annotation.ratio === "number"
          ? ` ratio ${annotation.ratio.toFixed(1)}`
          : "";
      return {
        summary: `Contrast ${annotation.status}${ratio}`,
        detail: `Design-review contrast evidence: ${annotation.status}${ratio || " (ratio not recorded)"}.`,
      };
    }
    case "aria": {
      const parts = [
        annotation.role ? `role ${annotation.role}` : null,
        annotation.label ? `label “${annotation.label}”` : null,
      ].filter(Boolean);
      const summary =
        parts.length > 0 ? `ARIA ${parts.join(", ")}` : "ARIA annotation";
      return {
        summary,
        detail: `ARIA design-review note${parts.length > 0 ? `: ${parts.join("; ")}` : " with partial metadata"}.`,
      };
    }
    case "screenReader":
      return {
        summary: "Screen reader note",
        detail: annotation.note,
      };
    case "keyboard":
      return {
        summary: "Keyboard note",
        detail: annotation.note,
      };
    default: {
      const _exhaustive: never = annotation;
      void _exhaustive;
      return { summary: "Annotation", detail: "Unknown annotation" };
    }
  }
}

function walkNodes(
  node: ComponentNode,
  visit: (node: ComponentNode) => void,
): void {
  visit(node);
  for (const child of node.children ?? []) {
    walkNodes(child, visit);
  }
}

function isPartialAnnotation(annotation: AccessibilityAnnotation): boolean {
  switch (annotation.type) {
    case "contrast":
      return annotation.ratio === undefined;
    case "aria":
      return !annotation.role && !annotation.label;
    case "screenReader":
    case "keyboard":
      return annotation.note.trim().length === 0;
    default:
      return false;
  }
}

function fromScreenAnnotation(
  id: string,
  source: "screen" | "node",
  sourceLabel: string,
  annotation: AccessibilityAnnotation,
  nodeId?: string,
): DerivedAccessibilityAnnotation {
  const { summary, detail } = summarizeAnnotation(annotation);
  return {
    id,
    kind: annotation.type,
    source,
    sourceLabel,
    summary,
    detail,
    annotation,
    ...(nodeId !== undefined ? { nodeId } : {}),
    ...(annotation.type === "contrast"
      ? {
          contrastStatus: annotation.status,
          ...(annotation.ratio !== undefined
            ? { contrastRatio: annotation.ratio }
            : {}),
        }
      : {}),
  };
}

export function deriveAccessibilityAnnotations(input: {
  spec: Pick<UXSpec, "accessibilityRequirements">;
  screen: ScreenSpec | null | undefined;
}): AccessibilityOverlayDerivation {
  const annotations: DerivedAccessibilityAnnotation[] = [];
  let hasPartialMetadata = false;
  const byKind: Record<
    Exclude<AccessibilityAnnotationKind, "requirement">,
    number
  > = {
    contrast: 0,
    aria: 0,
    screenReader: 0,
    keyboard: 0,
  };

  const screen = input.screen;
  if (screen?.accessibility) {
    screen.accessibility.forEach((annotation, index) => {
      if (isPartialAnnotation(annotation)) {
        hasPartialMetadata = true;
      }
      byKind[annotation.type] += 1;
      annotations.push(
        fromScreenAnnotation(
          `screen:${screen.id}:${annotation.type}:${index}`,
          "screen",
          `Screen ${screen.name}`,
          annotation,
        ),
      );
    });
  }

  if (screen?.root) {
    walkNodes(screen.root, (node) => {
      node.accessibility?.forEach((annotation, index) => {
        if (isPartialAnnotation(annotation)) {
          hasPartialMetadata = true;
        }
        byKind[annotation.type] += 1;
        annotations.push(
          fromScreenAnnotation(
            `node:${node.id}:${annotation.type}:${index}`,
            "node",
            `Node ${node.id}`,
            annotation,
            node.id,
          ),
        );
      });
    });
  }

  const typedCount = annotations.length;

  for (const requirement of input.spec.accessibilityRequirements) {
    annotations.push({
      id: `requirement:${requirement.id}`,
      kind: "requirement",
      source: "requirement",
      sourceLabel: "UXSpec requirement",
      summary: requirement.description,
      detail: requirement.wcagCriteria
        ? `${requirement.description} (related criterion ${requirement.wcagCriteria}). Design-review evidence only — not a WCAG certification.`
        : `${requirement.description}. Design-review evidence only — not a WCAG certification.`,
      annotation: requirement,
    });
  }

  const contrastAnnotations = annotations.filter(
    (entry) => entry.kind === "contrast",
  );

  return {
    annotations,
    contrastAnnotations,
    byKind,
    hasPartialMetadata,
    isEmpty: typedCount === 0,
  };
}

export function collectContrastAnnotations(
  screen: ScreenSpec | null | undefined,
): readonly DerivedAccessibilityAnnotation[] {
  return deriveAccessibilityAnnotations({
    spec: { accessibilityRequirements: [] },
    screen,
  }).contrastAnnotations;
}
