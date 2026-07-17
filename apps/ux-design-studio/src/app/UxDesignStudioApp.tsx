import type { ActorSnapshot } from "../domain/governance";
import type {
  AgileEditorNavigationContext,
  UxdsGateStatus,
} from "@uxds/host-contract";
import { ErrorBoundary } from "./error-boundary";
import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";
import { StudioRoutingProvider } from "./studio-routing";
import { GateEventsBridge } from "../integration/GateEventsBridge";

export type UxDesignStudioAppMode = "standalone" | "embedded";

export type UxDesignStudioAppProps = {
  mode?: UxDesignStudioAppMode;
  basePath?: string;
  actor?: ActorSnapshot;
  projectId?: string;
  baselineVersion?: string;
  onGateStatusChange?: (status: UxdsGateStatus) => void;
  onNavigateToAgileEditor?: (context: AgileEditorNavigationContext) => void;
};

/**
 * Shared application composition without React root or BrowserRouter ownership.
 */
export function UxDesignStudioApp({
  mode = "standalone",
  basePath = "",
  actor,
  projectId,
  baselineVersion,
  onGateStatusChange,
  onNavigateToAgileEditor,
}: UxDesignStudioAppProps) {
  const identityKey =
    projectId && baselineVersion
      ? `${projectId}:${baselineVersion}`
      : "standalone-default";

  return (
    <ErrorBoundary title="Application failed to render">
      <StudioRoutingProvider basePath={basePath}>
        <AppProviders key={identityKey} {...(actor ? { actor } : {})} mode={mode}>
          {projectId && baselineVersion ? (
            <GateEventsBridge
              projectId={projectId}
              baselineVersion={baselineVersion}
              {...(onGateStatusChange ? { onGateStatusChange } : {})}
              {...(onNavigateToAgileEditor ? { onNavigateToAgileEditor } : {})}
            />
          ) : null}
          <AppRoutes mode={mode} />
        </AppProviders>
      </StudioRoutingProvider>
    </ErrorBoundary>
  );
}
