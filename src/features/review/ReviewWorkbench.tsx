import { Link } from "react-router-dom";
import { useState, type ReactNode } from "react";
import type { PersonaId } from "../../domain/ux-spec";
import {
  defaultPersonaId,
  derivePersonaLensContext,
  listPersonas,
} from "../../domain/ux-spec/persona-lens-selectors";
import { agentPilotSeed } from "../../infrastructure/seed";
import {
  createActionResolver,
  createComponentRegistry,
  createNoopRenderContext,
  PreviewThemeRoot,
  ScreenComposer,
} from "../../renderer";
import { ErrorBoundary } from "../../app/error-boundary";
import {
  EmptyState,
  FailureState,
  InvalidRouteState,
} from "../../ui/states";
import { PersonaLensPanel } from "../persona-lens/PersonaLensPanel";
import { GeneratedNavigation } from "./GeneratedNavigation";
import { usePreviewBreakpoint } from "./usePreviewBreakpoint";
import { cssClass } from "../../renderer/styles/css-class";
import styles from "./ReviewWorkbench.module.css";

const registry = createComponentRegistry();

type ReviewWorkbenchProps = {
  screenId?: string;
  navigate: (path: string) => void;
};

export function ReviewWorkbench({ screenId, navigate }: ReviewWorkbenchProps) {
  const breakpoint = usePreviewBreakpoint();
  const screens = agentPilotSeed.screens;
  const personas = listPersonas(agentPilotSeed);
  const initialPersonaId = defaultPersonaId(agentPilotSeed) ?? "persona-alex";
  const [selectedPersonaId, setSelectedPersonaId] =
    useState<PersonaId>(initialPersonaId);
  const knownScreenIds = new Set(screens.map((screen) => screen.id));
  const lensContext = derivePersonaLensContext(
    agentPilotSeed,
    selectedPersonaId,
    screenId,
  );

  if (screens.length === 0) {
    return (
      <section aria-labelledby="review-heading" className={styles.workbench}>
        <h2 id="review-heading" className={cssClass(styles.heading, "heading")}>
          Screen review
        </h2>
        <EmptyState title="Empty UX specification">
          <p>No screens are available for review.</p>
        </EmptyState>
      </section>
    );
  }

  const screen = screens.find((entry) => entry.id === screenId);
  const actionResolver = createActionResolver(knownScreenIds, {
    navigate: (target) => {
      navigate(`/review/${target}`);
    },
  });

  const context = createNoopRenderContext({
    screenId: screen?.id ?? "screen-unknown",
    breakpoint,
    dispatchAction: (action) => actionResolver.resolve(action),
  });

  const previewContent = !screen || !screenId ? (
    <InvalidRouteState
      {...(screenId !== undefined ? { screenId } : {})}
      actions={<Link to="/overview">Return to overview</Link>}
    />
  ) : (
    <ErrorBoundary
      title="Preview failed to render"
      fallback={
        <FailureState message="The preview canvas encountered an unexpected error." />
      }
    >
      <PreviewThemeRoot tokens={agentPilotSeed.designTokens}>
        <div
          className={cssClass(styles.previewFrame, "previewFrame")}
          data-breakpoint={breakpoint}
          data-screen-id={screen.id}
          data-workbench-region="preview-canvas"
        >
          <ScreenComposer
            screen={screen}
            context={context}
            registry={registry}
          />
        </div>
      </PreviewThemeRoot>
    </ErrorBoundary>
  );

  return (
    <section aria-labelledby="review-heading" className={styles.workbench}>
      <h2 id="review-heading" className={cssClass(styles.heading, "heading")}>
        Screen review
      </h2>
      <p className={cssClass(styles.meta, "meta")}>
        Spec-driven AgentPilot preview. Navigation is generated from the seed
        UXSpec and is separate from studio chrome.
      </p>

      <div className={styles.layout} data-testid="review-workbench">
        <ScreenNavigationPanel>
          <GeneratedNavigation
            navigation={agentPilotSeed.navigation}
            activeScreenId={screen?.id ?? "screen-unknown"}
            knownScreenIds={knownScreenIds}
            mode="desktop"
            visible={breakpoint === "desktop"}
          />
          <GeneratedNavigation
            navigation={agentPilotSeed.navigation}
            activeScreenId={screen?.id ?? "screen-unknown"}
            knownScreenIds={knownScreenIds}
            mode="mobile"
            visible={breakpoint === "mobile"}
          />
        </ScreenNavigationPanel>

        <PreviewCanvas>{previewContent}</PreviewCanvas>

        <div className={styles.sidePanels}>
          <PersonaLensPanel
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            onSelectPersona={setSelectedPersonaId}
            context={lensContext}
          />
          <DecisionPanelPlaceholder />
        </div>
      </div>
    </section>
  );
}

function ScreenNavigationPanel({ children }: { children: ReactNode }) {
  return (
    <aside
      className={styles.navRegion}
      aria-labelledby="screen-nav-heading"
      data-workbench-region="screen-navigation"
    >
      <h3 id="screen-nav-heading" className={styles.regionHeading}>
        Screen navigation
      </h3>
      {children}
    </aside>
  );
}

function PreviewCanvas({ children }: { children: ReactNode }) {
  return (
    <div
      className={styles.previewRegion}
      aria-labelledby="preview-canvas-heading"
      data-workbench-region="preview-canvas-shell"
    >
      <h3 id="preview-canvas-heading" className={styles.regionHeading}>
        Preview canvas
      </h3>
      {children}
    </div>
  );
}

function DecisionPanelPlaceholder() {
  return (
    <aside
      className={styles.panel}
      aria-labelledby="decision-panel-heading"
      data-workbench-region="decision-panel"
    >
      <h3 id="decision-panel-heading" className={styles.regionHeading}>
        Decision panel
      </h3>
      <p className={styles.panelBody}>
        Approval and revision controls arrive in the governance stage. This panel
        is presentational only in E3.
      </p>
      <p className={styles.panelNote} data-decision-placeholder="true">
        No approve or revision actions are available yet.
      </p>
    </aside>
  );
}
