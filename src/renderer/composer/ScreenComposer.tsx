import type { ScreenSpec } from "../../domain/ux-spec";
import type { ComponentRegistry } from "../registry/types";
import type { RenderContext } from "../context/render-context";
import { RecursiveComposer } from "./RecursiveComposer";

export type ScreenComposerProps = {
  screen: ScreenSpec;
  context: RenderContext;
  registry: ComponentRegistry;
};

/**
 * Single screen entry into the common recursive composer.
 * No page-specific branches.
 */
export function ScreenComposer({
  screen,
  context,
  registry,
}: ScreenComposerProps) {
  return (
    <RecursiveComposer
      node={screen.root}
      context={context}
      registry={registry}
    />
  );
}
