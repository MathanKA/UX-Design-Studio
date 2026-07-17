import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppProviders } from "../../app/providers";
import { AppRoutes } from "../../app/routes";
import { ErrorBoundary } from "../../app/error-boundary";
import { appConfig } from "../../app/config";
import { agentPilotSeed } from "../../infrastructure/seed";
import { activateSidePanelTab } from "../review/activate-side-panel-tab";
import {
  DEFAULT_JOURNEY_ID,
  deriveJourneyWalkthrough,
  findJourney,
} from "./index";

function renderAt(pathName: string) {
  return render(
    <ErrorBoundary title="Application failed to render">
      <AppProviders>
        <MemoryRouter initialEntries={[pathName]}>
          <AppRoutes />
        </MemoryRouter>
      </AppProviders>
    </ErrorBoundary>,
  );
}

describe("US-3.3 journey walkthrough", () => {
  it("enables the isolated journey module via feature flag", () => {
    expect(appConfig.enableJourneyWalkthrough).toBe(true);
    expect(DEFAULT_JOURNEY_ID).toBe("journey-onboarding");
    expect(findJourney(agentPilotSeed, DEFAULT_JOURNEY_ID)?.name).toBe(
      "Sign in and land on dashboard",
    );
  });

  it("derives ordered steps and fails safely for an invalid journey", () => {
    const context = deriveJourneyWalkthrough(
      agentPilotSeed,
      DEFAULT_JOURNEY_ID,
      0,
    );
    expect(context).not.toBeNull();
    expect(context!.steps).toHaveLength(2);
    expect(context!.current.step.screenId).toBe("screen-login");
    expect(context!.current.isFirst).toBe(true);
    expect(context!.current.isLast).toBe(false);

    const last = deriveJourneyWalkthrough(
      agentPilotSeed,
      DEFAULT_JOURNEY_ID,
      1,
    );
    expect(last!.current.step.screenId).toBe("screen-dashboard");
    expect(last!.current.isLast).toBe(true);

    expect(
      deriveJourneyWalkthrough(agentPilotSeed, "journey-missing", 0),
    ).toBeNull();
  });

  it("renders journey controls below the persona lens with step metadata", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-login");
    await activateSidePanelTab(user, "journey");

    const panel = document.querySelector("[data-journey-walkthrough='true']");
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("data-journey-id", "journey-onboarding");
    expect(document.querySelector("[data-journey-name='true']")).toHaveTextContent(
      "Sign in and land on dashboard",
    );
    expect(
      document.querySelector("[data-journey-persona='true']"),
    ).toHaveTextContent("Alex");
    expect(
      document.querySelector("[data-journey-progress='true']"),
    ).toHaveTextContent("Step 1 of 2");
    expect(
      document.querySelector("[data-journey-step-title='true']"),
    ).toHaveTextContent("Authenticate");
    expect(
      document.querySelector("[data-journey-step-description='true']"),
    ).toHaveTextContent("Sign in with organization credentials");
    expect(
      document.querySelector("[data-journey-related-screen='true']"),
    ).toHaveTextContent("screen-login");

    const lens = document.querySelector("[data-persona-lens='true']");
    expect(lens).not.toBeNull();
    expect(
      lens!.compareDocumentPosition(panel!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("navigates forward and backward while preserving persona and breakpoint", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-login");

    await activateSidePanelTab(user, "persona");
    await user.click(screen.getByRole("radio", { name: "Jordan" }));
    expect(screen.getByRole("radio", { name: "Jordan" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Mobile" }));
    expect(screen.getByRole("radio", { name: "Mobile" })).toBeChecked();

    await activateSidePanelTab(user, "journey");
    const previous = screen.getByRole("button", { name: "Previous" });
    expect(previous).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      document.querySelector('[data-screen-id="screen-dashboard"]'),
    ).not.toBeNull();
    expect(
      document.querySelector("[data-journey-progress='true']"),
    ).toHaveTextContent("Step 2 of 2");
    expect(
      document.querySelector('[data-persona-option="persona-jordan"]'),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: "Mobile" })).toBeChecked();
    expect(
      document.querySelector("[data-preview-viewport='true']"),
    ).toHaveAttribute("data-breakpoint", "mobile");
    expect(screen.getByRole("button", { name: "Finish" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(
      document.querySelector('[data-screen-id="screen-login"]'),
    ).not.toBeNull();
    expect(
      document.querySelector("[data-journey-progress='true']"),
    ).toHaveTextContent("Step 1 of 2");
    expect(
      document.querySelector('[data-persona-option="persona-jordan"]'),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: "Mobile" })).toBeChecked();
  });

  it("restarts to step 1 and announces step changes", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-login");
    await activateSidePanelTab(user, "journey");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      document.querySelector("[data-journey-progress='true']"),
    ).toHaveTextContent("Step 2 of 2");

    const live = document.querySelector("[data-journey-walkthrough='true'] [aria-live='polite']");
    expect(live).toHaveTextContent(/Journey step 2 of 2/);

    await user.click(screen.getByRole("button", { name: "Restart" }));
    expect(
      document.querySelector('[data-screen-id="screen-login"]'),
    ).not.toBeNull();
    expect(
      document.querySelector("[data-journey-progress='true']"),
    ).toHaveTextContent("Step 1 of 2");
    expect(live).toHaveTextContent(/Journey restarted/);
  });

  it("finishes on the last step without leaving the workbench", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-login");
    await activateSidePanelTab(user, "journey");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));

    expect(
      document.querySelector('[data-screen-id="screen-dashboard"]'),
    ).not.toBeNull();
    const live = document.querySelector(
      "[data-journey-walkthrough='true'] [aria-live='polite']",
    );
    expect(live).toHaveTextContent(/Journey finished/);
  });

  it("stays outside the composer registry and governance decision controls", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-dashboard");
    await activateSidePanelTab(user, "journey");
    expect(
      document.querySelector("[data-journey-walkthrough='true']"),
    ).not.toBeNull();
    expect(
      document.querySelector(
        "[data-uxds-preview-root='true'] [data-journey-walkthrough='true']",
      ),
    ).toBeNull();
    expect(
      document.querySelector(
        "[data-journey-walkthrough='true'] [data-decision='approve']",
      ),
    ).toBeNull();
    await activateSidePanelTab(user, "decision");
    expect(
      document.querySelector(
        '[data-workbench-region="decision-panel"] [data-decision="approve"]',
      ),
    ).not.toBeNull();
  });
});
