import type { ReactNode } from "react";
import { ShellStatePanel } from "./ShellStatePanel";

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({
  message = "Loading UX specification…",
}: LoadingStateProps) {
  return (
    <ShellStatePanel title="Loading" role="status" busy tone="info">
      <p>{message}</p>
    </ShellStatePanel>
  );
}

type EmptyStateProps = {
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
};

export function EmptyState({
  title = "No specification data",
  children = <p>The loaded UXSpec has no screens to review.</p>,
  actions,
}: EmptyStateProps) {
  return (
    <ShellStatePanel title={title} role="status" tone="info" actions={actions}>
      {children}
    </ShellStatePanel>
  );
}

type PartialDataStateProps = {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function PartialDataState({
  title = "Partial screen data",
  children,
  actions,
}: PartialDataStateProps) {
  return (
    <ShellStatePanel title={title} role="alert" tone="warning" actions={actions}>
      {children}
    </ShellStatePanel>
  );
}

type InvalidRouteStateProps = {
  screenId?: string;
  actions?: ReactNode;
};

export function InvalidRouteState({ screenId, actions }: InvalidRouteStateProps) {
  return (
    <ShellStatePanel
      title="Unknown screen"
      role="alert"
      tone="warning"
      actions={actions}
    >
      <p>
        No AgentPilot screen matches route identity “{screenId ?? "missing"}”.
        Use a canonical ScreenSpec.id such as screen-dashboard.
      </p>
    </ShellStatePanel>
  );
}

type FailureStateProps = {
  title?: string;
  message: string;
  actions?: ReactNode;
};

export function FailureState({
  title = "Preview failed to render",
  message,
  actions,
}: FailureStateProps) {
  return (
    <ShellStatePanel title={title} role="alert" tone="danger" actions={actions}>
      <p>{message}</p>
    </ShellStatePanel>
  );
}
