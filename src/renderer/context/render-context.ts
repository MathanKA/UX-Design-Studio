import type { ReactNode } from "react";
import type { ComponentNodeId, ScreenId } from "../../domain/ux-spec";

export type PreviewBreakpoint = "mobile" | "tablet" | "desktop";

export type DeclarativeAction =
  | { type: "navigate"; targetScreenId: ScreenId }
  | { type: "openDialog"; dialogId: string }
  | { type: "submitDemoForm"; formId: string }
  | { type: "noop" };

/**
 * Typed render context for registry primitives.
 * Approval and audit state must not appear here.
 */
export type RenderContext = {
  screenId: ScreenId;
  breakpoint: PreviewBreakpoint;
  dispatchAction: (action: DeclarativeAction) => void;
  getThemeVar: (name: `--uxds-${string}`) => string | undefined;
};

export type RegisteredComponentProps<P extends object> = {
  nodeId: ComponentNodeId;
  props: P;
  children?: ReactNode;
  context: RenderContext;
};

export function createNoopRenderContext(
  overrides: Partial<RenderContext> = {},
): RenderContext {
  return {
    screenId: overrides.screenId ?? "screen-unknown",
    breakpoint: overrides.breakpoint ?? "desktop",
    dispatchAction: overrides.dispatchAction ?? (() => undefined),
    getThemeVar: overrides.getThemeVar ?? (() => undefined),
  };
}
