import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach } from "vitest";
import { AppProviders } from "../../app/providers";
import { AppRoutes } from "../../app/routes";
import { ErrorBoundary } from "../../app/error-boundary";
import {
  baselineScreenVersionId,
  selectEventsForScreen,
  selectScreenStatus,
} from "../../domain/governance";
import { agentPilotSeed } from "../../infrastructure/seed";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../../test/governance-ports";
import { GovernanceProvider } from "./GovernanceProvider";
import { useGovernance } from "./governance-context";
import { DEMO_APPROVER } from "../../application/governance-session";

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

function renderApp(pathName: string) {
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

function renderWithDeterministicGovernance(pathName: string) {
  const clock = createFixedClock("2026-07-15T03:00:00.000Z");
  const idGenerator = createSequentialIdGenerator(1);
  return render(
    <ErrorBoundary title="Application failed to render">
      <GovernanceProvider
        clock={clock}
        idGenerator={idGenerator}
        createdAt="2026-07-15T01:00:00.000Z"
      >
        <MemoryRouter initialEntries={[pathName]}>
          <AppRoutes />
        </MemoryRouter>
      </GovernanceProvider>
    </ErrorBoundary>,
  );
}

function StaleApprovalProbe() {
  const { approveScreen, state } = useGovernance();
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const result = approveScreen({
            screenId: "screen-dashboard",
            expectedScreenVersionId: "sv-stale-version",
          });
          const target = document.querySelector("[data-stale-result]");
          if (target) {
            target.textContent = result.ok
              ? "ok"
              : `${result.error.code}:${result.error.message}`;
          }
        }}
      >
        Attempt stale approval
      </button>
      <p data-stale-result="" />
      <p data-event-count={String(state.events.length)} />
    </div>
  );
}

describe("US-4.2 version-bound approval and UX gate", () => {
  beforeEach(() => {
    installMatchMedia();
  });

  it("initializes baseline screen versions for all five AgentPilot screens", () => {
    expect(agentPilotSeed.screens).toHaveLength(5);

    for (const seedScreen of agentPilotSeed.screens) {
      const { unmount } = renderWithDeterministicGovernance(
        `/review/${seedScreen.id}`,
      );
      expect(
        document.querySelector('[data-decision="screen-version"]'),
      ).toHaveTextContent(baselineScreenVersionId(seedScreen.id));
      expect(
        document.querySelector('[data-decision="status"]'),
      ).toHaveTextContent("Not reviewed");
      unmount();
    }
  });

  it("approves the active screen current version with actor metadata and optional comment", async () => {
    const user = userEvent.setup();
    const specBefore = structuredClone(agentPilotSeed);
    renderWithDeterministicGovernance("/review/screen-dashboard");

    expect(
      document.querySelector('[data-decision="actor"]'),
    ).toHaveTextContent(`${DEMO_APPROVER.displayLabel} (${DEMO_APPROVER.role})`);

    await user.type(
      screen.getByLabelText(/approval comment/i),
      "Dashboard accepted",
    );
    await user.click(
      screen.getByRole("button", { name: /approve current version/i }),
    );

    expect(document.querySelector('[data-decision="status"]')).toHaveTextContent(
      "Approved",
    );
    expect(screen.getByRole("button", { name: /current version approved/i })).toBeDisabled();
    expect(document.querySelector('[data-decision="feedback"]')).toHaveTextContent(
      /approved/i,
    );
    expect(document.querySelector('[data-decision="progress"]')).toHaveTextContent(
      "1 of 5 screens approved",
    );
    expect(document.querySelector('[data-decision="remaining"]')).toHaveTextContent(
      "4 remaining",
    );
    expect(
      document.querySelector('[data-decision="gate-readiness"]'),
    ).toHaveAttribute("data-gate-complete", "false");
    expect(agentPilotSeed).toEqual(specBefore);
  });

  it("rejects stale version approval without appending an event", async () => {
    const user = userEvent.setup();
    render(
      <GovernanceProvider
        clock={createFixedClock("2026-07-15T03:00:00.000Z")}
        idGenerator={createSequentialIdGenerator(1)}
        createdAt="2026-07-15T01:00:00.000Z"
      >
        <StaleApprovalProbe />
      </GovernanceProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /attempt stale approval/i }),
    );
    expect(document.querySelector("[data-stale-result]")).toHaveTextContent(
      /STALE_SCREEN_VERSION/,
    );
    expect(document.querySelector("[data-event-count]")).toHaveAttribute(
      "data-event-count",
      "0",
    );
  });

  it("appends a single approval event and ignores repeat submit", async () => {
    const user = userEvent.setup();
    let capturedStateEvents = 0;

    function EventCountProbe() {
      const { state } = useGovernance();
      capturedStateEvents = state.events.length;
      const dashboardEvents = selectEventsForScreen(state, "screen-dashboard");
      return (
        <p data-testid="event-probe">
          {state.events.length}:{dashboardEvents.length}:
          {selectScreenStatus(state, "screen-dashboard")}
        </p>
      );
    }

    render(
      <GovernanceProvider
        clock={createFixedClock("2026-07-15T03:00:00.000Z")}
        idGenerator={createSequentialIdGenerator(1)}
        createdAt="2026-07-15T01:00:00.000Z"
      >
        <MemoryRouter initialEntries={["/review/screen-dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
        <EventCountProbe />
      </GovernanceProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /approve current version/i }),
    );
    expect(screen.getByTestId("event-probe")).toHaveTextContent(
      "1:1:approved",
    );

    const approveButton = screen.getByRole("button", {
      name: /current version approved/i,
    });
    expect(approveButton).toBeDisabled();
    await user.click(approveButton);
    expect(screen.getByTestId("event-probe")).toHaveTextContent(
      "1:1:approved",
    );
    expect(capturedStateEvents).toBe(1);
  });

  it("updates overview and workbench from the same selectors within one session", async () => {
    const user = userEvent.setup();
    render(
      <GovernanceProvider
        clock={createFixedClock("2026-07-15T03:00:00.000Z")}
        idGenerator={createSequentialIdGenerator(1)}
        createdAt="2026-07-15T01:00:00.000Z"
      >
        <MemoryRouter initialEntries={["/review/screen-dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
      </GovernanceProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /approve current version/i }),
    );
    expect(document.querySelector('[data-decision="status"]')).toHaveTextContent(
      "Approved",
    );

    await user.click(screen.getByRole("link", { name: "Overview" }));
    expect(screen.getByTestId("approval-progress")).toHaveTextContent(
      "1 of 5 screens approved",
    );
    expect(screen.getByTestId("approval-progress")).toHaveTextContent(
      "4 remaining",
    );
    expect(
      document.querySelector('[data-review-status="screen-dashboard"]'),
    ).toHaveTextContent("Approved");
    expect(
      document.querySelector('[data-review-status="screen-login"]'),
    ).toHaveTextContent("Not reviewed");
    expect(
      document.querySelector('[data-approval="gate-readiness"]'),
    ).toHaveAttribute("data-gate-complete", "false");
  });

  it("keeps the gate unavailable until all five screens are approved, then announces readiness", async () => {
    const user = userEvent.setup();
    const specBefore = JSON.stringify(agentPilotSeed);

    render(
      <GovernanceProvider
        clock={createFixedClock("2026-07-15T03:00:00.000Z")}
        idGenerator={createSequentialIdGenerator(1)}
        createdAt="2026-07-15T01:00:00.000Z"
      >
        <MemoryRouter initialEntries={["/overview"]}>
          <AppRoutes />
        </MemoryRouter>
      </GovernanceProvider>,
    );

    expect(screen.getByTestId("approval-progress")).toHaveTextContent(
      "0 of 5 screens approved",
    );
    expect(
      document.querySelector('[data-approval="gate-readiness"]'),
    ).toHaveTextContent(/unavailable/i);

    for (const [index, seedScreen] of agentPilotSeed.screens.entries()) {
      await user.click(
        screen.getByRole("link", {
          name: `Open ${seedScreen.name} review`,
        }),
      );
      await user.click(
        screen.getByRole("button", { name: /approve current version/i }),
      );

      const remaining = 5 - (index + 1);
      if (remaining > 0) {
        expect(
          document.querySelector('[data-decision="gate-readiness"]'),
        ).toHaveAttribute("data-gate-complete", "false");
        expect(
          document.querySelector('[data-decision="feedback"]'),
        ).toHaveTextContent(`${remaining} screen`);
        await user.click(screen.getByRole("link", { name: "Overview" }));
      }
    }

    expect(document.querySelector('[data-decision="gate-readiness"]')).toHaveAttribute(
      "data-gate-complete",
      "true",
    );
    expect(document.querySelector('[data-decision="feedback"]')).toHaveTextContent(
      /Ready for Agile plan generation/i,
    );
    expect(document.querySelector('[data-decision="feedback"]')).toHaveAttribute(
      "aria-live",
      "polite",
    );

    await user.click(screen.getByRole("link", { name: "Overview" }));
    expect(screen.getByTestId("approval-progress")).toHaveTextContent(
      "5 of 5 screens approved",
    );
    expect(screen.getByTestId("approval-progress")).toHaveTextContent(
      "No screens remaining",
    );
    expect(
      document.querySelector('[data-approval="gate-readiness"]'),
    ).toHaveTextContent("Ready for Agile plan generation");
    expect(
      document.querySelector('[data-approval="gate-readiness"]'),
    ).toHaveAttribute("data-gate-complete", "true");

    for (const seedScreen of agentPilotSeed.screens) {
      expect(
        document.querySelector(`[data-review-status="${seedScreen.id}"]`),
      ).toHaveTextContent("Approved");
    }

    expect(JSON.stringify(agentPilotSeed)).toBe(specBefore);
    expect(screen.queryByText(/generating agile plan/i)).toBeNull();
    expect(document.querySelector("[data-agile-plan]")).toBeNull();
  });

  it("renders decision panel through the default AppProviders path", () => {
    renderApp("/review/screen-task-detail");
    expect(screen.getByTestId("decision-panel")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("decision-panel")).getByRole("button", {
        name: /approve current version/i,
      }),
    ).toBeEnabled();
  });
});
