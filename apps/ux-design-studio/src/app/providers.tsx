import { useMemo, type ReactNode } from "react";
import type { ActorSnapshot } from "../domain/governance";
import { GovernanceProvider } from "../features/governance";
import { createBrowserIdGenerator } from "../infrastructure/platform/browser-id-generator";
import { createSystemClock } from "../infrastructure/platform/system-clock";
import { createDefaultGovernanceDeps } from "../infrastructure/providers/create-default-governance-deps";
import type { UxDesignStudioAppMode } from "./UxDesignStudioApp";

type AppProvidersProps = {
  children: ReactNode;
  actor?: ActorSnapshot;
  mode?: UxDesignStudioAppMode;
};

/**
 * Application provider seam.
 * Governance defaults to LocalStorageGovernanceRepository; tests may inject memory.
 * DesignAgentProvider is wired here so feature views never import the mock adapter.
 */
export function AppProviders({
  children,
  actor,
  mode = "standalone",
}: AppProvidersProps) {
  const deps = useMemo(() => {
    const clock = createSystemClock();
    const idGenerator = createBrowserIdGenerator();
    const { designAgentProvider, contentRegistry } = createDefaultGovernanceDeps(
      {
        clock,
        idGenerator,
      },
    );
    return { clock, idGenerator, designAgentProvider, contentRegistry };
  }, []);

  return (
    <GovernanceProvider
      {...(actor ? { actor } : {})}
      clock={deps.clock}
      idGenerator={deps.idGenerator}
      designAgentProvider={deps.designAgentProvider}
      contentRegistry={deps.contentRegistry}
    >
      <div data-uxds-mode={mode}>{children}</div>
    </GovernanceProvider>
  );
}
