import type { ReactNode } from "react";
import { Component, type ErrorInfo } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "An unexpected error occurred.",
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("UX Design Studio error boundary caught an error.", error, info);
  }

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <section role="alert" aria-live="assertive">
        <h2>{this.props.title ?? "Something went wrong"}</h2>
        <p>{this.state.message}</p>
      </section>
    );
  }
}
