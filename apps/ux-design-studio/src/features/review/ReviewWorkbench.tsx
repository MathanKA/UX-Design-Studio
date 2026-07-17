import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PersonaId, ScreenId } from "../../domain/ux-spec";
import type { ScreenReviewStatus } from "../../domain/governance";
import {
  defaultPersonaId,
  derivePersonaLensContext,
  listPersonas,
} from "../../domain/ux-spec/persona-lens-selectors";
import {
  agentPilotSeed,
  createAgentPilotContentRegistry,
} from "../../infrastructure/seed";
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
import { useStudioRouting } from "../../app/studio-routing";
import {
  EmptyState,
  FailureState,
  InvalidRouteState,
} from "../../ui/states";
import {
  AccessibilityOverlayPanel,
  ContrastBadges,
} from "../accessibility-overlay";
import {
  DEFAULT_JOURNEY_ID,
  deriveJourneyWalkthrough,
  JourneyWalkthroughPanel,
} from "../journey-walkthrough";
import { PersonaLensPanel } from "../persona-lens/PersonaLensPanel";
import {
  DEFAULT_PREVIEW_BREAKPOINT,
  PreviewViewport,
  PREVIEW_BREAKPOINT_LABELS,
  PREVIEW_WIDTHS,
} from "../responsive-preview";
import { DecisionPanel, useGovernance } from "../governance";
import { screenReviewStatusLabel } from "../governance/status-labels";
import {
  deriveVersionHistory,
  VersionHistoryPanel,
} from "../version-history";
import { GeneratedNavigation } from "./GeneratedNavigation";
import { ReviewSidePanelTabs } from "./ReviewSidePanelTabs";
import { ReviewToolbar } from "./ReviewToolbar";
import { cssClass } from "../../renderer/styles/css-class";
import styles from "./ReviewWorkbench.module.css";

const registry = createComponentRegistry();
const contentRegistry = createAgentPilotContentRegistry();

type ReviewWorkbenchProps = {
  screenId?: string;
  navigate: (path: string) => void;
};

function statusTone(
  status: ScreenReviewStatus | null,
): "neutral" | "warning" | "success" | "info" {
  if (status === "approved") {
    return "success";
  }
  if (status === "changes_requested" || status === "regenerating") {
    return "warning";
  }
  if (status === "ready_for_review") {
    return "info";
  }
  return "neutral";
}

export function ReviewWorkbench({ screenId, navigate }: ReviewWorkbenchProps) {
  const { toStudio } = useStudioRouting();
  const {
    getScreen,
    state,
    getScreenStatus,
    getCurrentScreenVersion,
    getApprovalProgress,
  } = useGovernance();
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
  const [accessibilityOverlayEnabled, setAccessibilityOverlayEnabled] =
    useState(false);
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

  const baselineScreen = screens.find((entry) => entry.id === screenId);
  const screen =
    (screenId ? getScreen(screenId) : undefined) ?? baselineScreen;

  const versionHistoryContext =
    appConfig.enableVersionHistory && screenId
      ? deriveVersionHistory({
          state,
          screenId,
          ...(screen?.name ? { screenName: screen.name } : {}),
          seed: agentPilotSeed,
          contentRegistry,
        })
      : null;

  const screenStatuses = (() => {
    const map = new Map<ScreenId, ScreenReviewStatus>();
    for (const entry of screens) {
      map.set(entry.id, getScreenStatus(entry.id));
    }
    return map;
  })();

  const approvalProgress = getApprovalProgress();
  const currentVersion = screenId
    ? getCurrentScreenVersion(screenId)
    : undefined;
  const reviewStatus = screenId ? getScreenStatus(screenId) : null;

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

  const actionResolver = createActionResolver(knownScreenIds, {
    navigate: (target) => {
      navigate(toStudio(`review/${target}`));
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
    navigate(toStudio(`review/${next.current.step.screenId}`));
  };

  const previewContent = !screen || !screenId ? (
    <InvalidRouteState
      {...(screenId !== undefined ? { screenId } : {})}
      actions={<Link to={toStudio("overview")}>Return to overview</Link>}
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

  const sideTabs = [
    {
      id: "decision" as const,
      label: "Decision",
      panel: (
        <DecisionPanel
          {...(screen
            ? { screenId: screen.id, screenName: screen.name }
            : screenId
              ? { screenId }
              : {})}
        />
      ),
    },
    {
      id: "persona" as const,
      label: "Persona",
      panel: (
        <PersonaLensPanel
          personas={personas}
          selectedPersonaId={selectedPersonaId}
          onSelectPersona={setSelectedPersonaId}
          context={lensContext}
        />
      ),
    },
    ...(appConfig.enableJourneyWalkthrough
      ? [
          {
            id: "journey" as const,
            label: "Journey",
            panel: (
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
            ),
          },
        ]
      : []),
    ...(appConfig.enableVersionHistory
      ? [
          {
            id: "history" as const,
            label: "History",
            panel: <VersionHistoryPanel context={versionHistoryContext} />,
          },
        ]
      : []),
    ...(appConfig.enableAccessibilityOverlay
      ? [
          {
            id: "a11y" as const,
            label: "A11y",
            panel: (
              <AccessibilityOverlayPanel
                spec={agentPilotSeed}
                screen={screen}
                enabled={accessibilityOverlayEnabled}
                onEnabledChange={setAccessibilityOverlayEnabled}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <section aria-labelledby="review-heading" className={styles.workbench}>
      <ReviewToolbar
        headingId="review-heading"
        screenName={screen?.name ?? screenId ?? "Unknown screen"}
        {...(currentVersion?.id
          ? { screenVersionId: currentVersion.id }
          : {})}
        reviewStatusLabel={
          reviewStatus ? screenReviewStatusLabel(reviewStatus) : "Not reviewed"
        }
        reviewStatusTone={statusTone(reviewStatus)}
        breakpoint={breakpoint}
        onBreakpointChange={setBreakpoint}
        enableTabletPreview={appConfig.enableTabletPreview}
      />

      <div className={styles.layout} data-testid="review-workbench">
        <ScreenNavigationPanel>
          <GeneratedNavigation
            navigation={agentPilotSeed.navigation}
            activeScreenId={screen?.id ?? "screen-unknown"}
            knownScreenIds={knownScreenIds}
            mode="desktop"
            visible={showDesktopNav}
            screenStatuses={screenStatuses}
            approvalProgress={approvalProgress}
          />
          <GeneratedNavigation
            navigation={agentPilotSeed.navigation}
            activeScreenId={screen?.id ?? "screen-unknown"}
            knownScreenIds={knownScreenIds}
            mode="mobile"
            visible={showMobileNav}
            screenStatuses={screenStatuses}
          />
        </ScreenNavigationPanel>

        <PreviewCanvas>
          <p className={styles.breakpointMeta} data-preview-active-width="true">
            Active preview: {PREVIEW_BREAKPOINT_LABELS[breakpoint]} (
            {PREVIEW_WIDTHS[breakpoint]}px)
          </p>
          <div
            className={styles.previewStack}
            data-accessibility-overlay-active={
              appConfig.enableAccessibilityOverlay &&
              accessibilityOverlayEnabled
                ? "true"
                : "false"
            }
          >
            {previewContent}
          </div>
          {appConfig.enableContrastBadges ? (
            <div className={styles.badgesSlot}>
              <ContrastBadges screen={screen} />
            </div>
          ) : null}
        </PreviewCanvas>

        <div className={styles.sidePanels}>
          <ReviewSidePanelTabs tabs={sideTabs} defaultTabId="decision" />
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
        Screens
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
      <h3 id="preview-canvas-heading" className={styles.srOnly}>
        Preview canvas
      </h3>
      {children}
    </div>
  );
}
