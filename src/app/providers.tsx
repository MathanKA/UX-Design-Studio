import type { ReactNode } from "react";
import { GovernanceProvider } from "../features/governance";

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Application provider seam.
 * Governance defaults to LocalStorageGovernanceRepository; tests may inject memory.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return <GovernanceProvider>{children}</GovernanceProvider>;
}
