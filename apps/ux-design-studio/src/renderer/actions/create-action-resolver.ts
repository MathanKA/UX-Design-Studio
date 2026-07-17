import type { ScreenId } from "../../domain/ux-spec";
import type { DeclarativeAction } from "../context/render-context";

export type ActionResolverHandlers = {
  navigate: (screenId: ScreenId) => void;
  openDialog?: (dialogId: string) => void;
  submitDemoForm?: (formId: string) => void;
  onUnknownAction?: (action: unknown) => void;
};

export type ActionResolver = {
  resolve: (action: unknown) => void;
};

const ALLOWED_ACTION_TYPES = new Set([
  "navigate",
  "openDialog",
  "submitDemoForm",
  "noop",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createActionResolver(
  knownScreenIds: ReadonlySet<ScreenId>,
  handlers: ActionResolverHandlers,
): ActionResolver {
  return {
    resolve(action: unknown): void {
      if (!isRecord(action) || typeof action.type !== "string") {
        handlers.onUnknownAction?.(action);
        return;
      }

      if (!ALLOWED_ACTION_TYPES.has(action.type)) {
        handlers.onUnknownAction?.(action);
        return;
      }

      const typed = action as DeclarativeAction | { type: string };

      switch (typed.type) {
        case "noop":
          return;
        case "navigate": {
          const target =
            "targetScreenId" in typed && typeof typed.targetScreenId === "string"
              ? typed.targetScreenId
              : undefined;
          if (!target || !knownScreenIds.has(target)) {
            handlers.onUnknownAction?.(action);
            return;
          }
          handlers.navigate(target);
          return;
        }
        case "openDialog": {
          if (!("dialogId" in typed) || typeof typed.dialogId !== "string") {
            handlers.onUnknownAction?.(action);
            return;
          }
          handlers.openDialog?.(typed.dialogId);
          return;
        }
        case "submitDemoForm": {
          if (!("formId" in typed) || typeof typed.formId !== "string") {
            handlers.onUnknownAction?.(action);
            return;
          }
          handlers.submitDemoForm?.(typed.formId);
          return;
        }
        default:
          handlers.onUnknownAction?.(action);
      }
    },
  };
}
