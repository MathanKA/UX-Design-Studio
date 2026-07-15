/**
 * US-6.1 critical React Testing Library release workflow.
 *
 * Maps overview → review → breakpoint/persona → approval → revision →
 * regeneration → reapproval → persisted reload → audit → Reviewer restriction.
 *
 * Reuses existing renderer, governance, contract, Playwright, and CI evidence
 * from #93 / PRs #94–#96; this file closes the RTL-specific acceptance gap.
 */
import {
  act,
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./error-boundary";
import { AppRoutes } from "./routes";
import { createGovernanceStateFromSpec } from "../application/governance-session";
import {
  selectChronologicalEvents,
  selectCurrentScreenVersion,
  selectIsGateComplete,
  selectLatestRevisionRequest,
  selectScreenStatus,
  type GovernanceState,
} from "../domain/governance";
import {
  countSpecComponentNodes,
  deriveUXSpecOverviewSummary,
} from "../domain/ux-spec";
import { GovernanceProvider } from "../features/governance/GovernanceProvider";
import {
  LocalStorageGovernanceRepository,
  buildGovernanceStorageKey,
} from "../infrastructure/persistence";
import { MOCK_DESIGN_AGENT_LATENCY_MS } from "../infrastructure/providers/mock-design-agent-provider";
import {
  agentPilotSeed,
  createAgentPilotContentRegistry,
} from "../infrastructure/seed";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../test/governance-ports";

const identity = {
  projectId: agentPilotSeed.projectId,
  specId: agentPilotSeed.id,
  specVersion: agentPilotSeed.version,
  baselineVersion: agentPilotSeed.baselineVersion,
};

const managedKey = buildGovernanceStorageKey({
  projectId: identity.projectId,
  specId: identity.specId,
  baselineVersion: identity.baselineVersion,
});

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

function createPersistedRepository(clockIso = "2026-07-15T03:00:00.000Z") {
  return new LocalStorageGovernanceRepository({
    identity,
    fallbackState: createGovernanceStateFromSpec(
      agentPilotSeed,
      "2026-07-15T01:00:00.000Z",
    ),
    storage: window.localStorage,
    clock: createFixedClock(clockIso),
  });
}

function renderApp(
  path: string,
  repository: LocalStorageGovernanceRepository,
  options?: { clockIso?: string; idStart?: number },
) {
  const clock = createFixedClock(options?.clockIso ?? "2026-07-15T03:00:00.000Z");
  const idGenerator = createSequentialIdGenerator(options?.idStart ?? 1);
  return render(
    <ErrorBoundary title="Application failed to render">
      <GovernanceProvider
        clock={clock}
        idGenerator={idGenerator}
        createdAt="2026-07-15T01:00:00.000Z"
        repository={repository}
        contentRegistry={createAgentPilotContentRegistry()}
      >
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </GovernanceProvider>
    </ErrorBoundary>,
  );
}

function loadState(repository: LocalStorageGovernanceRepository): GovernanceState {
  const loaded = repository.load();
  if (!loaded.ok) {
    throw new Error(`expected governance load success, got ${loaded.reason}`);
  }
  return loaded.state;
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

describe("US-6.1 critical RTL demo flow", () => {
  beforeEach(() => {
    installMatchMedia();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.localStorage.removeItem(managedKey);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.localStorage.removeItem(managedKey);
  });

  it(
    "covers overview through review, governance, persistence, audit, and Reviewer restriction",
    async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const repository = createPersistedRepository();
      const expectedOverview = deriveUXSpecOverviewSummary(agentPilotSeed);

      const firstMount = renderApp("/overview", repository);

      expect(screen.getByTestId("overview-summary")).toBeInTheDocument();
      expect(
        document.querySelector('[data-overview-field="persona-count"]'),
      ).toHaveTextContent(String(expectedOverview.personaCount));
      expect(
        document.querySelector('[data-overview-field="journey-count"]'),
      ).toHaveTextContent(String(expectedOverview.journeyCount));
      expect(
        document.querySelector('[data-overview-field="screen-count"]'),
      ).toHaveTextContent(String(agentPilotSeed.screens.length));
      expect(
        document.querySelector('[data-overview-field="component-count"]'),
      ).toHaveTextContent(String(countSpecComponentNodes(agentPilotSeed)));
      expect(screen.getByTestId("approval-progress")).toHaveTextContent(
        "0 of 5 screens approved",
      );
      expect(
        document.querySelector('[data-approval="gate-readiness"]'),
      ).toHaveAttribute("data-gate-complete", "false");
      expect(screen.getAllByTestId("role-switcher")[0]).toHaveAttribute(
        "data-active-role",
        "approver",
      );
      expect(
        document.querySelector('[data-role-demo-only="true"]'),
      ).toHaveTextContent(/not production authentication/i);

      await user.click(
        screen.getByRole("link", { name: "Open Dashboard review" }),
      );

      expect(screen.getByTestId("review-workbench")).toBeInTheDocument();
      expect(
        document.querySelector('[data-decision="status"]'),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("radio", { name: "Mobile" }));
      expect(screen.getByRole("radio", { name: "Mobile" })).toBeChecked();
      expect(
        document.querySelector("[data-preview-viewport='true']"),
      ).toHaveAttribute("data-breakpoint", "mobile");

      await user.click(screen.getByRole("radio", { name: "Taylor" }));
      expect(screen.getByRole("radio", { name: "Taylor" })).toBeChecked();
      expect(
        document.querySelector('[data-persona-context="persona-taylor"]'),
      ).not.toBeNull();
      const taylor = agentPilotSeed.personas.find(
        (persona) => persona.name === "Taylor",
      );
      expect(taylor).toBeDefined();
      expect(screen.getByText(taylor!.role)).toBeInTheDocument();

      expect(screen.getAllByTestId("role-switcher")[0]).toHaveAttribute(
        "data-active-role",
        "approver",
      );

      const baselineVersion = selectCurrentScreenVersion(
        loadState(repository),
        "screen-dashboard",
      );
      expect(baselineVersion?.source).toBe("baseline");

      await user.click(
        screen.getByRole("button", { name: /approve current version/i }),
      );
      expect(selectScreenStatus(loadState(repository), "screen-dashboard")).toBe(
        "approved",
      );

      await user.click(screen.getByRole("link", { name: "Overview" }));
      expect(screen.getByTestId("approval-progress")).toHaveTextContent(
        "1 of 5 screens approved",
      );

      await user.click(
        screen.getByRole("link", { name: "Open Dashboard review" }),
      );

      await requestDashboardRevision(user);
      const afterRevision = loadState(repository);
      const latestRevision = selectLatestRevisionRequest(
        afterRevision,
        "screen-dashboard",
      );
      expect(latestRevision).toBeDefined();
      expect(latestRevision?.payload.category).toBe("layout");
      expect(latestRevision?.payload.description).toMatch(
        /dashboard title hierarchy/i,
      );
      expect(selectScreenStatus(afterRevision, "screen-dashboard")).toBe(
        "changes_requested",
      );

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

      const afterRegen = loadState(repository);
      const regenerated = selectCurrentScreenVersion(
        afterRegen,
        "screen-dashboard",
      );
      expect(regenerated?.source).toBe("regenerated");
      expect(regenerated?.id).not.toBe(baselineVersion?.id);
      expect(selectScreenStatus(afterRegen, "screen-dashboard")).toBe(
        "ready_for_review",
      );
      expect(selectIsGateComplete(afterRegen)).toBe(false);
      expect(
        document.querySelector('[data-decision="status"]'),
      ).toHaveTextContent("Ready for review");
      expect(
        document.querySelector('[data-decision="gate-readiness"]'),
      ).toHaveAttribute("data-gate-complete", "false");

      await user.click(
        screen.getByRole("button", { name: /approve current version/i }),
      );

      const afterReapprove = loadState(repository);
      expect(selectScreenStatus(afterReapprove, "screen-dashboard")).toBe(
        "approved",
      );
      expect(
        selectCurrentScreenVersion(afterReapprove, "screen-dashboard")?.id,
      ).toBe(regenerated?.id);
      expect(
        document.querySelector('[data-decision="status"]'),
      ).toHaveTextContent("Approved");

      const eventCountBeforeAuditNav = selectChronologicalEvents(
        afterReapprove,
      ).length;
      expect(eventCountBeforeAuditNav).toBeGreaterThanOrEqual(4);

      await user.click(screen.getByRole("link", { name: /audit/i }));
      expect(
        screen.getByRole("heading", { name: /^audit$/i }),
      ).toBeInTheDocument();
      const auditEvents = screen.getAllByTestId("audit-event");
      expect(auditEvents.length).toBeGreaterThanOrEqual(4);
      expect(
        auditEvents.some(
          (row) => row.getAttribute("data-event-type") === "screen.approved",
        ),
      ).toBe(true);
      expect(
        auditEvents.some(
          (row) =>
            row.getAttribute("data-event-type") === "screen.revision_requested",
        ),
      ).toBe(true);
      expect(
        auditEvents.some(
          (row) => row.getAttribute("data-event-type") === "screen.regenerated",
        ),
      ).toBe(true);

      firstMount.unmount();

      const remountRepository = createPersistedRepository(
        "2026-07-15T04:00:00.000Z",
      );
      const remounted = loadState(remountRepository);
      expect(selectScreenStatus(remounted, "screen-dashboard")).toBe(
        "approved",
      );
      expect(
        selectCurrentScreenVersion(remounted, "screen-dashboard")?.source,
      ).toBe("regenerated");
      expect(
        selectCurrentScreenVersion(remounted, "screen-dashboard")?.id,
      ).toBe(regenerated?.id);
      expect(selectChronologicalEvents(remounted).length).toBe(
        eventCountBeforeAuditNav,
      );
      expect(selectIsGateComplete(remounted)).toBe(false);

      renderApp("/review/screen-dashboard", remountRepository, {
        clockIso: "2026-07-15T04:00:00.000Z",
        idStart: 100,
      });

      expect(
        document.querySelector('[data-decision="status"]'),
      ).toHaveTextContent("Approved");
      expect(
        within(
          document.querySelector("[data-preview-viewport='true']") as HTMLElement,
        ).getByText(/Priority operations view/i),
      ).toBeInTheDocument();

      const eventsBeforeRoleSwitch = selectChronologicalEvents(
        loadState(remountRepository),
      ).length;

      await user.click(
        screen.getAllByRole("radio", { name: /demo reviewer/i })[0]!,
      );
      expect(screen.getAllByTestId("role-switcher")[0]).toHaveAttribute(
        "data-active-role",
        "reviewer",
      );
      expect(
        document.querySelector('[data-role-demo-only="true"]'),
      ).toHaveTextContent(/POC role simulation/i);
      expect(
        document.querySelector('[data-role-demo-only="true"]'),
      ).toHaveTextContent(/not production authentication/i);

      expect(
        screen.queryByRole("button", { name: /approve current version/i }),
      ).toBeNull();
      expect(screen.queryByTestId("revision-form")).toBeNull();
      expect(screen.queryByTestId("regenerate-indicator")).toBeNull();
      expect(
        selectChronologicalEvents(loadState(remountRepository)).length,
      ).toBe(eventsBeforeRoleSwitch);

      expect(window.localStorage.getItem(managedKey)).not.toBeNull();
      expect(agentPilotSeed.screens).toHaveLength(5);
    },
    30_000,
  );
});
