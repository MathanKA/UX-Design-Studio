import type { ReactNode } from "react";
import { GovernanceProvider } from "../features/governance";

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Application provider seam. Governance session mounts here; persistence,
 * design-agent, and host adapters will join in later stories.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return <GovernanceProvider>{children}</GovernanceProvider>;
}
