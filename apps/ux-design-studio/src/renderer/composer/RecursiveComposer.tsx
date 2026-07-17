import type { ComponentNode } from "../../domain/ux-spec";
import { UX_SPEC_LIMITS } from "../../domain/ux-spec";
import type { ComponentRegistry } from "../registry/types";
import type { RenderContext } from "../context/render-context";
import { UnknownComponent } from "../fallbacks/UnknownComponent";
import { InvalidPropsFallback } from "../fallbacks/InvalidPropsFallback";
import { DepthGuardFallback } from "./DepthGuardFallback";
import { NodeErrorBoundary } from "./NodeErrorBoundary";

export type RecursiveComposerProps = {
  node: ComponentNode;
  context: RenderContext;
  registry: ComponentRegistry;
  depth?: number;
};

export function RecursiveComposer({
  node,
  context,
  registry,
  depth = 0,
}: RecursiveComposerProps) {
  if (depth > UX_SPEC_LIMITS.maxTreeDepth) {
    return (
      <DepthGuardFallback
        nodeId={node.id}
        depth={depth}
        maxDepth={UX_SPEC_LIMITS.maxTreeDepth}
      />
    );
  }

  const entry = registry.get(node.type as never);
  if (!entry) {
    return (
      <UnknownComponent nodeId={node.id} componentType={String(node.type)} />
    );
  }

  const validated = entry.validateProps(node.props ?? {});
  if (!validated.ok) {
    return (
      <InvalidPropsFallback
        nodeId={node.id}
        componentType={entry.type}
        message={validated.message}
      />
    );
  }

  const childNodes =
    entry.acceptsChildren && node.children && node.children.length > 0
      ? node.children.map((child) => (
          <RecursiveComposer
            key={child.id}
            node={child}
            context={context}
            registry={registry}
            depth={depth + 1}
          />
        ))
      : undefined;

  if (!entry.acceptsChildren && node.children && node.children.length > 0) {
    return (
      <InvalidPropsFallback
        nodeId={node.id}
        componentType={entry.type}
        message="This component type does not accept children."
      />
    );
  }

  const Component = entry.Component;

  return (
    <NodeErrorBoundary nodeId={node.id} componentType={entry.type}>
      <Component nodeId={node.id} props={validated.props} context={context}>
        {childNodes}
      </Component>
    </NodeErrorBoundary>
  );
}
