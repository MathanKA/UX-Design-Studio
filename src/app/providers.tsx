import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Application provider seam. Persistence, design-agent, and host adapters
 * will mount here in later stories without changing route ownership.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return <>{children}</>;
}
