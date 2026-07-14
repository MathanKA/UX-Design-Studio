import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../../app/routes";
import { ErrorBoundary } from "../../app/error-boundary";
import { createGovernanceStateFromSpec } from "../../application/governance-session";
import { selectCurrentScreenVersion } from "../../domain/governance";
import { InMemoryGovernanceRepository } from "../../infrastructure/persistence/in-memory-governance-repository";
import { MOCK_DESIGN_AGENT_LATENCY_MS } from "../../infrastructure/providers/mock-design-agent-provider";
import { agentPilotSeed } from "../../infrastructure/seed";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../../test/governance-ports";
import { GovernanceProvider } from "./GovernanceProvider";

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

function renderDashboard() {
  const clock = createFixedClock("2026-07-15T03:00:00.000Z");
  const idGenerator = createSequentialIdGenerator(1);
  const repository = new InMemoryGovernanceRepository(
    createGovernanceStateFromSpec(agentPilotSeed, "2026-07-15T01:00:00.000Z"),
  );
  return render(
    <ErrorBoundary title="Application failed to render">
      <GovernanceProvider
        clock={clock}
        idGenerator={idGenerator}
        createdAt="2026-07-15T01:00:00.000Z"
        repository={repository}
      >
        <MemoryRouter initialEntries={["/review/screen-dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
      </GovernanceProvider>
    </ErrorBoundary>,
  );
}

async function requestDashboardRevision(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    within(screen.getByTestId("revision-form")).getByLabelText(
      /dashboard-title \(text\)/i,
    ),
  );
  await user.selectOptions(screen.getByLabelText(/revision category/i), "layout");
  await user.type(
    screen.getByLabelText(/revision description/i),
    "Please revise the dashboard title hierarchy for regeneration.",
  );
  await user.click(screen.getByRole("button", { name: /request revision/i }));
}

describe("US-5.1 regenerate flow", () => {
  beforeEach(() => {
    installMatchMedia();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.localStorage.removeItem(
      `uxds:v1:${agentPilotSeed.projectId}:${agentPilotSeed.id}:${agentPilotSeed.baselineVersion}`,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it(
    "regenerates Dashboard after revision and shows variant content",
    async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { container } = renderDashboard();

      await requestDashboardRevision(user);
      expect(
        screen.getByRole("button", { name: /^regenerate$/i }),
      ).toBeEnabled();

      await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
      expect(
        screen.getByRole("button", { name: /regenerating/i }),
      ).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS);
      });
      expect(
        await screen.findByText(/regenerated to version/i),
      ).toBeInTheDocument();
      expect(
        document.querySelector('[data-decision="status"]'),
      ).toHaveTextContent("Ready for review");
      expect(container.textContent).toMatch(/Priority operations view/i);
    },
    15_000,
  );

  it("shows POC scope message on non-Dashboard screens", async () => {
    const clock = createFixedClock("2026-07-15T03:00:00.000Z");
    const idGenerator = createSequentialIdGenerator(1);
    render(
      <ErrorBoundary title="Application failed to render">
        <GovernanceProvider
          clock={clock}
          idGenerator={idGenerator}
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
          <MemoryRouter initialEntries={["/review/screen-login"]}>
            <AppRoutes />
          </MemoryRouter>
        </GovernanceProvider>
      </ErrorBoundary>,
    );

    expect(
      screen.getByText(/provider-backed regeneration in this poc targets dashboard only/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^regenerate$/i }),
    ).toBeDisabled();
  });

  it("arms controlled failure for Approver", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDashboard();
    await requestDashboardRevision(user);

    const toggle = screen.getByLabelText(/simulate controlled provider failure/i);
    await user.click(toggle);
    expect(toggle).toBeChecked();

    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS);
    });
    expect(
      await screen.findByText(/simulated controlled provider failure/i),
    ).toBeInTheDocument();
  });
});

describe("screen version content resolution", () => {
  it("keeps seed baseline until regeneration activates contentRef", () => {
    const state = createGovernanceStateFromSpec(
      agentPilotSeed,
      "2026-07-15T01:00:00.000Z",
    );
    const version = selectCurrentScreenVersion(state, "screen-dashboard");
    expect(version?.source).toBe("baseline");
    expect(version?.contentRef).toBeUndefined();
  });
});
