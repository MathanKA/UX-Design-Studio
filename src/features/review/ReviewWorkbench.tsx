import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
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
  type PreviewBreakpoint,
} from "../../renderer";
import { appConfig } from "../../app/config";
import { ErrorBoundary } from "../../app/error-boundary";
import {
  EmptyState,
  FailureState,
  InvalidRouteState,
} from "../../ui/states";
import {
  DEFAULT_JOURNEY_ID,
  deriveJourneyWalkthrough,
  JourneyWalkthroughPanel,
} from "../journey-walkthrough";
import { PersonaLensPanel } from "../persona-lens/PersonaLensPanel";
import {
  DEFAULT_PREVIEW_BREAKPOINT,
  PreviewBreakpointControls,
  PreviewViewport,
  PREVIEW_BREAKPOINT_LABELS,
  PREVIEW_WIDTHS,
} from "../responsive-preview";
import { DecisionPanel } from "../governance";
import { GeneratedNavigation } from "./GeneratedNavigation";
import { cssClass } from "../../renderer/styles/css-class";
import styles from "./ReviewWorkbench.module.css";

const registry = createComponentRegistry();

type ReviewWorkbenchProps = {
  screenId?: string;
  navigate: (path: string) => void;
};

export function ReviewWorkbench({ screenId, navigate }: ReviewWorkbenchProps) {
  const [breakpoint, setBreakpoint] = useState<PreviewBreakpoint>(
    DEFAULT_PREVIEW_BREAKPOINT,
  );
  const screens = agentPilotSeed.screens;
  const personas = listPersonas(agentPilotSeed);
  const initialPersonaId = defaultPersonaId(agentPilotSeed) ?? "persona-alex";
  const [selectedPersonaId, setSelectedPersonaId] =
    useState<PersonaId>(initialPersonaId);
  const [journeyStepIndex, setJourneyStepIndex] = useState(0);
  const [journeyAnnouncement, setJourneyAnnouncement] = useState("");
  const knownScreenIds = new Set(screens.map((screen) => screen.id));
  const lensContext = derivePersonaLensContext(
    agentPilotSeed,
    selectedPersonaId,
    screenId,
  );
  const journeyContext = appConfig.enableJourneyWalkthrough
    ? deriveJourneyWalkthrough(
        agentPilotSeed,
        DEFAULT_JOURNEY_ID,
        journeyStepIndex,
      )
    : null;

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

  const showDesktopNav = breakpoint === "desktop" || breakpoint === "tablet";
  const showMobileNav = breakpoint === "mobile";

  const goToJourneyStep = (nextIndex: number, announce: string) => {
    const next = deriveJourneyWalkthrough(
      agentPilotSeed,
      DEFAULT_JOURNEY_ID,
      nextIndex,
    );
    if (!next) {
      setJourneyAnnouncement("Journey could not be resolved.");
      return;
    }
    setJourneyStepIndex(next.current.index);
    setJourneyAnnouncement(announce);
    navigate(`/review/${next.current.step.screenId}`);
  };

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
        <PreviewViewport breakpoint={breakpoint} screenId={screen.id}>
          <ScreenComposer
            screen={screen}
            context={context}
            registry={registry}
          />
        </PreviewViewport>
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
            visible={showDesktopNav}
          />
          <GeneratedNavigation
            navigation={agentPilotSeed.navigation}
            activeScreenId={screen?.id ?? "screen-unknown"}
            knownScreenIds={knownScreenIds}
            mode="mobile"
            visible={showMobileNav}
          />
        </ScreenNavigationPanel>

        <PreviewCanvas>
          <PreviewBreakpointControls
            value={breakpoint}
            onChange={setBreakpoint}
            enableTabletPreview={appConfig.enableTabletPreview}
          />
          <p className={styles.breakpointMeta} data-preview-active-width="true">
            Active preview: {PREVIEW_BREAKPOINT_LABELS[breakpoint]} (
            {PREVIEW_WIDTHS[breakpoint]}px)
          </p>
          {previewContent}
        </PreviewCanvas>

        <div className={styles.sidePanels}>
          <PersonaLensPanel
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            onSelectPersona={setSelectedPersonaId}
            context={lensContext}
          />
          {appConfig.enableJourneyWalkthrough ? (
            <JourneyWalkthroughPanel
              context={journeyContext}
              announcement={journeyAnnouncement}
              onPrevious={() => {
                if (!journeyContext || journeyContext.current.isFirst) {
                  return;
                }
                goToJourneyStep(
                  journeyContext.current.index - 1,
                  `Journey step ${journeyContext.current.index} of ${journeyContext.current.total}`,
                );
              }}
              onNext={() => {
                if (!journeyContext || journeyContext.current.isLast) {
                  return;
                }
                goToJourneyStep(
                  journeyContext.current.index + 1,
                  `Journey step ${journeyContext.current.index + 2} of ${journeyContext.current.total}`,
                );
              }}
              onFinish={() => {
                setJourneyAnnouncement("Journey finished.");
              }}
              onRestart={() => {
                goToJourneyStep(0, "Journey restarted at step 1.");
              }}
            />
          ) : null}
          <DecisionPanel
            {...(screen
              ? { screenId: screen.id, screenName: screen.name }
              : screenId
                ? { screenId }
                : {})}
          />
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
