import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./federation.module.css";

type RemoteErrorBoundaryProps = {
  children: ReactNode;
  onRetry: () => void;
  projectId: string;
};

type RemoteErrorBoundaryState = {
  hasError: boolean;
};

export class RemoteErrorBoundary extends Component<
  RemoteErrorBoundaryProps,
  RemoteErrorBoundaryState
> {
  state: RemoteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RemoteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // Isolated diagnostics only — never rendered to users.
      console.error("[simulated-host] remote failure", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.panel} role="alert" data-testid="remote-failure">
          <h2>UX Design Studio unavailable</h2>
          <p>
            The federated remote could not be loaded. The simulated host shell remains
            available so you can continue navigating other project pages.
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={this.props.onRetry}>
              Retry
            </button>
            <Link to={`/projects/${this.props.projectId}/overview`}>
              Back to Overview
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
