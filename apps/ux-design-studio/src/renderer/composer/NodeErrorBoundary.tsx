import { Component, type ReactNode } from "react";
import { cssClass } from "../styles/css-class";
import styles from "../styles/composer.module.css";

type NodeErrorBoundaryProps = {
  nodeId: string;
  componentType: string;
  children: ReactNode;
};

type NodeErrorBoundaryState = {
  hasError: boolean;
};

export class NodeErrorBoundary extends Component<
  NodeErrorBoundaryProps,
  NodeErrorBoundaryState
> {
  state: NodeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): NodeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Isolation only — do not rethrow; keep siblings and shell alive.
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className={cssClass(styles.nodeError, "nodeError")}
          role="alert"
        >
          <p className={cssClass(styles.title, "title")}>Component render error</p>
          <p className={cssClass(styles.detail, "detail")}>
            Node {this.props.nodeId} ({this.props.componentType}) failed and was
            isolated from the rest of the screen.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
