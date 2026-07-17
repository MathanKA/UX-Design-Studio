import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppRoutes } from "../../app/routes";
import { ErrorBoundary } from "../../app/error-boundary";
import { createGovernanceStateFromSpec } from "../../application/governance-session";
import { InMemoryGovernanceRepository } from "../../infrastructure/persistence/in-memory-governance-repository";
import { agentPilotSeed } from "../../infrastructure/seed";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../../test/governance-ports";
import { GovernanceProvider } from "../governance/GovernanceProvider";
import {
  collectContrastAnnotations,
  deriveAccessibilityAnnotations,
} from "./accessibility-selectors";
import { activateSidePanelTab } from "../review/activate-side-panel-tab";
import { AccessibilityOverlayPanel } from "./AccessibilityOverlayPanel";
import { ContrastBadges } from "./ContrastBadges";

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

function storageKey(): string {
  return `uxds:v1:${agentPilotSeed.projectId}:${agentPilotSeed.id}:${agentPilotSeed.baselineVersion}`;
}

function renderDashboard() {
  return render(
    <ErrorBoundary title="Application failed to render">
      <GovernanceProvider
        clock={createFixedClock("2026-07-15T03:00:00.000Z")}
        idGenerator={createSequentialIdGenerator(1)}
        createdAt="2026-07-15T01:00:00.000Z"
        repository={
          new InMemoryGovernanceRepository(
            createGovernanceStateFromSpec(
              agentPilotSeed,
              "2026-07-15T01:00:00.000Z",
            ),
          )
        }
      >
        <MemoryRouter initialEntries={["/review/screen-dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
      </GovernanceProvider>
    </ErrorBoundary>,
  );
}

describe("US-5.2 accessibility overlay", () => {
  beforeEach(() => {
    installMatchMedia();
    window.localStorage.removeItem(storageKey());
  });

  it("derives contrast, ARIA, screen-reader, and keyboard annotations for Dashboard", () => {
    const dashboard = agentPilotSeed.screens.find(
      (screen) => screen.id === "screen-dashboard",
    );
    const derivation = deriveAccessibilityAnnotations({
      spec: agentPilotSeed,
      screen: dashboard,
    });
    expect(derivation.byKind.contrast).toBeGreaterThan(0);
    expect(derivation.byKind.aria).toBeGreaterThan(0);
    expect(derivation.byKind.screenReader).toBeGreaterThan(0);
    expect(derivation.byKind.keyboard).toBeGreaterThan(0);
    expect(derivation.isEmpty).toBe(false);
  });

  it("toggles overlay, opens keyboard-reachable markers, and closes details on Escape", async () => {
    const user = userEvent.setup();
    const specBefore = structuredClone(agentPilotSeed);
    renderDashboard();
    await activateSidePanelTab(user, "a11y");

    const panel = screen.getByTestId("accessibility-overlay-panel");
    const toggle = within(panel).getByRole("button", {
      name: /show accessibility overlay/i,
    });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(panel).toHaveAttribute("data-overlay-active", "true");
    expect(within(panel).getByText(/not a WCAG certification/i)).toBeTruthy();

    const markers = within(panel).getAllByRole("button", {
      name: /contrast|aria|screen reader|keyboard|requirement/i,
    });
    expect(markers.length).toBeGreaterThan(3);

    await user.click(markers[0]!);
    expect(document.querySelector("[data-overlay-details]")).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(document.querySelector("[data-overlay-details]")).toBeNull();
    expect(toggle).toHaveFocus();

    expect(agentPilotSeed).toEqual(specBefore);
  });

  it("does not mutate UXSpec when overlay interactions run", async () => {
    const user = userEvent.setup();
    const before = JSON.stringify(agentPilotSeed);
    renderDashboard();
    await activateSidePanelTab(user, "a11y");
    await user.click(
      screen.getByRole("button", { name: /show accessibility overlay/i }),
    );
    await user.click(
      screen.getAllByRole("button", { name: /contrast|aria|keyboard/i })[0]!,
    );
    expect(JSON.stringify(agentPilotSeed)).toBe(before);
  });

  it("renders resilient empty and partial metadata states", () => {
    const { rerender } = render(
      <AccessibilityOverlayPanel
        spec={{ accessibilityRequirements: [] }}
        screen={{
          id: "screen-empty",
          name: "Empty",
          routeKey: "empty",
          root: { id: "empty-root", type: "stack", children: [] },
        }}
        enabled
        onEnabledChange={() => undefined}
      />,
    );
    expect(screen.getByText(/no screen or node accessibility annotations/i)).toBeInTheDocument();

    rerender(
      <AccessibilityOverlayPanel
        spec={{ accessibilityRequirements: [] }}
        screen={{
          id: "screen-partial",
          name: "Partial",
          routeKey: "partial",
          root: { id: "partial-root", type: "stack", children: [] },
          accessibility: [{ type: "contrast", status: "pass" }],
        }}
        enabled
        onEnabledChange={() => undefined}
      />,
    );
    expect(screen.getByText(/partial accessibility metadata/i)).toBeInTheDocument();
  });

  it("keeps contrast badges independent of the overlay flag", () => {
    const dashboard = agentPilotSeed.screens.find(
      (screen) => screen.id === "screen-dashboard",
    );
    expect(collectContrastAnnotations(dashboard).length).toBeGreaterThan(0);

    render(
      <>
        <ContrastBadges screen={dashboard} />
        <AccessibilityOverlayPanel
          spec={agentPilotSeed}
          screen={dashboard}
          enabled={false}
          onEnabledChange={() => undefined}
        />
      </>,
    );

    expect(screen.getByTestId("contrast-badges")).toHaveAttribute(
      "data-contrast-count",
    );
    expect(
      screen.getByRole("button", { name: /show accessibility overlay/i }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("contrast-badges").textContent).toMatch(/Pass/i);
  });

  it("shows contrast badges in the review workbench without requiring overlay on", async () => {
    const user = userEvent.setup();
    renderDashboard();
    const badges = screen.getByTestId("contrast-badges");
    expect(badges).toHaveAttribute("data-contrast-badges", "true");
    expect(badges.textContent).toMatch(/Pass/i);
    await activateSidePanelTab(user, "a11y");
    expect(
      screen.getByRole("button", { name: /show accessibility overlay/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("includes prefers-reduced-motion rules for overlay and badge animations", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const overlayCss = readFileSync(
      resolve(dir, "./AccessibilityOverlayPanel.module.css"),
      "utf8",
    );
    const badgeCss = readFileSync(
      resolve(dir, "./ContrastBadges.module.css"),
      "utf8",
    );
    expect(overlayCss).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(badgeCss).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
