import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { agentPilotSeed } from "../../infrastructure/seed";
import {
  createActionResolver,
  createComponentRegistry,
  createNoopRenderContext,
  PreviewThemeRoot,
  ScreenComposer,
} from "../../renderer";
import { GeneratedNavigation } from "./GeneratedNavigation";
import { usePreviewBreakpoint } from "./usePreviewBreakpoint";
import { cssClass } from "../../renderer/styles/css-class";
import styles from "./ReviewPage.module.css";

const registry = createComponentRegistry();

export function ReviewPage() {
  const { screenId } = useParams<{ screenId: string }>();
  const navigate = useNavigate();
  const breakpoint = usePreviewBreakpoint();
  const knownScreenIds = useMemo(
    () => new Set(agentPilotSeed.screens.map((screen) => screen.id)),
    [],
  );

  const screen = agentPilotSeed.screens.find((entry) => entry.id === screenId);

  const actionResolver = useMemo(
    () =>
      createActionResolver(knownScreenIds, {
        navigate: (target) => {
          navigate(`/review/${target}`);
        },
      }),
    [knownScreenIds, navigate],
  );

  const context = createNoopRenderContext({
    screenId: screen?.id ?? "screen-unknown",
    breakpoint,
    dispatchAction: (action) => actionResolver.resolve(action),
  });

  return (
    <section aria-labelledby="review-heading">
      <h2 id="review-heading" className={cssClass(styles.heading, "heading")}>
        Screen review
      </h2>
      <p className={cssClass(styles.meta, "meta")}>
        Spec-driven AgentPilot preview. Navigation is generated from the seed
        UXSpec and is separate from studio chrome.
      </p>

      <div className={cssClass(styles.layout, "layout")}>
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

        <div>
          {!screen || !screenId ? (
            <div className={cssClass(styles.fallback, "fallback")} role="alert">
              <p className={cssClass(styles.fallbackTitle, "fallbackTitle")}>
                Unknown screen
              </p>
              <p className={cssClass(styles.fallbackBody, "fallbackBody")}>
                No AgentPilot screen matches route identity “{screenId ?? "missing"}”.
                Use a canonical ScreenSpec.id such as screen-dashboard.
              </p>
            </div>
          ) : (
            <PreviewThemeRoot tokens={agentPilotSeed.designTokens}>
              <div
                className={cssClass(styles.previewFrame, "previewFrame")}
                data-breakpoint={breakpoint}
                data-screen-id={screen.id}
              >
                <ScreenComposer
                  screen={screen}
                  context={context}
                  registry={registry}
                />
              </div>
            </PreviewThemeRoot>
          )}
        </div>
      </div>
    </section>
  );
}
