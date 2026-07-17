import { lazy, Suspense, useCallback, useState, type ComponentType } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  AgileEditorNavigationContext,
  UxDesignStudioRemoteProps,
  UxdsGateStatus,
} from "@uxds/host-contract";
import {
  DEMO_BASELINE_VERSION,
  DEMO_PROJECT_ID,
  demoActor,
} from "../app/config";
import { RemoteErrorBoundary } from "./RemoteErrorBoundary";
import { RemoteLoadingState } from "./RemoteLoadingState";
import styles from "./federation.module.css";

const RemoteApp = lazy(() => import("uxDesignStudio/App")) as unknown as ComponentType<
  UxDesignStudioRemoteProps
>;

export function FederatedUxDesignStudio() {
  const { projectId = DEMO_PROJECT_ID } = useParams();
  const navigate = useNavigate();
  const [gateStatus, setGateStatus] = useState<UxdsGateStatus>("in_review");
  const [retryKey, setRetryKey] = useState(0);

  const basePath = `/projects/${projectId}/ux-design-studio`;

  const onGateStatusChange = useCallback((status: UxdsGateStatus) => {
    setGateStatus(status);
  }, []);

  const onNavigateToAgileEditor = useCallback(
    (context: AgileEditorNavigationContext) => {
      navigate(`/projects/${context.projectId}/agile-editor`);
    },
    [navigate],
  );

  if (projectId !== DEMO_PROJECT_ID) {
    return (
      <div className={styles.panel} role="alert" data-testid="unsupported-project">
        <h2>Unsupported project</h2>
        <p>
          This simulated host only loads UX Design Studio for{" "}
          <code>{DEMO_PROJECT_ID}</code>. AgentPilot governance state is not reused
          for other project identities.
        </p>
        <p>
          <Link to={`/projects/${DEMO_PROJECT_ID}/overview`}>
            Open AgentPilot overview
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.remotePane} data-testid="federated-uxds-pane">
      <p className={styles.gateStatus} data-testid="host-gate-status">
        Gate status: {gateStatus === "approved" ? "approved" : "in review"}
      </p>
      <RemoteErrorBoundary
        key={retryKey}
        onRetry={() => setRetryKey((value) => value + 1)}
        projectId={projectId}
      >
        <Suspense fallback={<RemoteLoadingState />}>
          <RemoteApp
            projectId={DEMO_PROJECT_ID}
            baselineVersion={DEMO_BASELINE_VERSION}
            basePath={basePath}
            actor={demoActor}
            onGateStatusChange={onGateStatusChange}
            onNavigateToAgileEditor={onNavigateToAgileEditor}
          />
        </Suspense>
      </RemoteErrorBoundary>
    </div>
  );
}
