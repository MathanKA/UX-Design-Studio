import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach } from "vitest";
import { AppProviders } from "../../app/providers";
import { AppRoutes } from "../../app/routes";
import { ErrorBoundary } from "../../app/error-boundary";
import {
  DEMO_APPROVER,
  DEMO_REVIEWER,
  DEMO_VIEWER,
} from "../../application/governance-session";
import {
  hasCapability,
  selectEventsForScreen,
  selectScreenStatus,
} from "../../domain/governance";
import { listPersonas } from "../../domain/ux-spec";
import { agentPilotSeed } from "../../infrastructure/seed";
import { createGovernanceStateFromSpec } from "../../application/governance-session";
import { InMemoryGovernanceRepository } from "../../infrastructure/persistence/in-memory-governance-repository";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../../test/governance-ports";
import { GovernanceProvider } from "./GovernanceProvider";
import { useGovernance } from "./governance-context";

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

function createMemoryRepository() {
  return new InMemoryGovernanceRepository(
    createGovernanceStateFromSpec(agentPilotSeed, "2026-07-15T01:00:00.000Z"),
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
        repository={createMemoryRepository()}
      >
        <MemoryRouter initialEntries={[pathName]}>
          <AppRoutes />
        </MemoryRouter>
      </GovernanceProvider>
    </ErrorBoundary>,
  );
}

describe("US-4.3 structured revisions and role enforcement", () => {
  beforeEach(() => {
    installMatchMedia();
    window.localStorage.removeItem(
      `uxds:v1:${agentPilotSeed.projectId}:${agentPilotSeed.id}:${agentPilotSeed.baselineVersion}`,
    );
  });

  it("defaults to Demo Approver and labels the switcher as POC-only", () => {
    renderWithDeterministicGovernance("/overview");
    const switchers = screen.getAllByTestId("role-switcher");
    expect(switchers.length).toBeGreaterThan(0);
    expect(switchers[0]).toHaveAttribute("data-active-role", "approver");
    expect(switchers[0]).toHaveTextContent(/POC role simulation/i);
    expect(
      document.querySelector('[data-role-demo-only="true"]'),
    ).toHaveTextContent(/not production authentication/i);
    expect(
      document.querySelector('[data-role-demo-only="true"]'),
    ).toHaveTextContent(/SSO/);
    expect(
      document.querySelector('[data-role-demo-only="true"]'),
    ).toHaveTextContent(/identity verification/i);
  });

  it("exposes Approver, Reviewer, and Viewer without overlapping personas", async () => {
    const user = userEvent.setup();
    renderWithDeterministicGovernance("/overview");

    expect(screen.getAllByTestId("role-option-approver").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByTestId("role-option-reviewer").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByTestId("role-option-viewer").length).toBeGreaterThan(0);

    const personaNames = listPersonas(agentPilotSeed).map((persona) => persona.name);
    expect(personaNames).toEqual(["Alex", "Jordan", "Taylor"]);
    expect(personaNames).not.toContain(DEMO_APPROVER.displayLabel);
    expect(personaNames).not.toContain(DEMO_REVIEWER.displayLabel);
    expect(personaNames).not.toContain(DEMO_VIEWER.displayLabel);

    const reviewerInputs = screen.getAllByRole("radio", {
      name: /demo reviewer/i,
    });
    await user.click(reviewerInputs[0]!);
    expect(screen.getAllByTestId("role-switcher")[0]).toHaveAttribute(
      "data-active-role",
      "reviewer",
    );
  });

  it("lets Approver approve and request revision while owning regenerate capability", async () => {
    const user = userEvent.setup();
    renderWithDeterministicGovernance("/review/screen-dashboard");

    expect(hasCapability("approver", "screen.regenerate")).toBe(true);
    expect(
      screen.getByTestId("regenerate-indicator"),
    ).toHaveAttribute("data-regenerate-operational", "false");
    expect(
      screen.getByRole("button", { name: /regenerate \(e5\)/i }),
    ).toBeDisabled();
    expect(screen.getByText(/provider-backed regeneration is delivered in e5/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /approve current version/i }),
    );
    expect(document.querySelector('[data-decision="status"]')).toHaveTextContent(
      "Approved",
    );

    await user.click(
      within(screen.getByTestId("revision-form")).getByLabelText(
        /dashboard-title \(text\)/i,
      ),
    );
    await user.selectOptions(
      screen.getByLabelText(/revision category/i),
      "layout",
    );
    await user.type(
      screen.getByLabelText(/revision description/i),
      "Please revise the dashboard title hierarchy.",
    );
    await user.click(
      screen.getByRole("button", { name: /request revision/i }),
    );

    expect(document.querySelector('[data-decision="status"]')).toHaveTextContent(
      "Changes requested",
    );
    expect(document.querySelector('[data-decision="feedback"]')).toHaveTextContent(
      /revision requested/i,
    );
  });

  it("hides approve, revision, and regenerate controls for Reviewer and Viewer", async () => {
    const user = userEvent.setup();
    renderWithDeterministicGovernance("/review/screen-dashboard");

    for (const roleLabel of [/demo reviewer/i, /demo viewer/i]) {
      const radios = screen.getAllByRole("radio", { name: roleLabel });
      await user.click(radios[0]!);

      expect(
        screen.queryByRole("button", { name: /approve current version/i }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: /request revision/i }),
      ).toBeNull();
      expect(screen.queryByTestId("revision-form")).toBeNull();
      expect(screen.queryByTestId("regenerate-indicator")).toBeNull();
      expect(screen.getByTestId("role-restricted-message")).toBeInTheDocument();
    }
  });

  it("rejects unauthorized command bypass without appending events", async () => {
    const user = userEvent.setup();

    function ReviewerBypassProbe() {
      const { requestRevision, approveScreen, state } = useGovernance();
      return (
        <div>
          <button
            type="button"
            onClick={() => {
              const revision = requestRevision({
                screenId: "screen-dashboard",
                expectedScreenVersionId: "sv-screen-dashboard-baseline",
                affectedNodeIds: ["dashboard-title"],
                category: "content",
                description: "Unauthorized revision bypass attempt.",
                actor: DEMO_REVIEWER,
              });
              const approval = approveScreen({
                screenId: "screen-dashboard",
                expectedScreenVersionId: "sv-screen-dashboard-baseline",
                actor: DEMO_VIEWER,
              });
              const target = document.querySelector("[data-bypass-result]");
              if (target) {
                target.textContent = [
                  revision.ok ? "rev-ok" : revision.error.code,
                  approval.ok ? "apr-ok" : approval.error.code,
                ].join("|");
              }
            }}
          >
            Attempt unauthorized commands
          </button>
          <p data-bypass-result="" />
          <p data-event-count={String(state.events.length)} />
        </div>
      );
    }

    render(
      <GovernanceProvider
        clock={createFixedClock("2026-07-15T03:00:00.000Z")}
        idGenerator={createSequentialIdGenerator(1)}
        createdAt="2026-07-15T01:00:00.000Z"
        actor={DEMO_APPROVER}
        repository={createMemoryRepository()}
      >
        <ReviewerBypassProbe />
      </GovernanceProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /attempt unauthorized commands/i }),
    );
    expect(document.querySelector("[data-bypass-result]")).toHaveTextContent(
      "CAPABILITY_DENIED|CAPABILITY_DENIED",
    );
    expect(document.querySelector("[data-event-count]")).toHaveAttribute(
      "data-event-count",
      "0",
    );
  });

  it("allows all roles to view overview, preview, and audit routes", async () => {
    const user = userEvent.setup();
    renderWithDeterministicGovernance("/overview");

    for (const roleLabel of [
      /demo approver/i,
      /demo reviewer/i,
      /demo viewer/i,
    ]) {
      const radios = screen.getAllByRole("radio", { name: roleLabel });
      await user.click(radios[0]!);

      expect(screen.getByRole("heading", { name: /overview/i })).toBeInTheDocument();
      await user.click(screen.getByRole("link", { name: "Review" }));
      expect(screen.getByTestId("decision-panel")).toBeInTheDocument();
      await user.click(screen.getByRole("link", { name: "Audit" }));
      expect(
        screen.getByRole("heading", { name: "Audit", level: 2 }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("link", { name: "Overview" }));
    }
  });

  it("validates revision form fields and keeps other screens unchanged", async () => {
    const user = userEvent.setup();
    let capturedStatus = "";

    function StatusProbe() {
      const { state } = useGovernance();
      capturedStatus = [
        selectScreenStatus(state, "screen-dashboard"),
        selectScreenStatus(state, "screen-login"),
        String(selectEventsForScreen(state, "screen-dashboard").length),
        String(state.events.length),
      ].join(":");
      return <p data-testid="status-probe">{capturedStatus}</p>;
    }

    render(
      <GovernanceProvider
        clock={createFixedClock("2026-07-15T03:00:00.000Z")}
        idGenerator={createSequentialIdGenerator(1)}
        createdAt="2026-07-15T01:00:00.000Z"
        repository={createMemoryRepository()}
      >
        <MemoryRouter initialEntries={["/review/screen-dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
        <StatusProbe />
      </GovernanceProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /request revision/i }),
    );
    expect(document.querySelector('[data-decision="feedback"]')).toHaveTextContent(
      /at least one affected node/i,
    );
    expect(screen.getByTestId("status-probe")).toHaveTextContent(
      "not_reviewed:not_reviewed:0:0",
    );

    await user.click(
      within(screen.getByTestId("revision-form")).getByLabelText(
        /dashboard-title \(text\)/i,
      ),
    );
    await user.type(screen.getByLabelText(/revision description/i), "too short");
    await user.clear(screen.getByLabelText(/revision description/i));
    await user.type(screen.getByLabelText(/revision description/i), "short");
    await user.click(
      screen.getByRole("button", { name: /request revision/i }),
    );
    expect(document.querySelector('[data-decision="feedback"]')).toHaveTextContent(
      /at least 8 characters/i,
    );

    await user.clear(screen.getByLabelText(/revision description/i));
    await user.type(
      screen.getByLabelText(/revision description/i),
      "Please revise the dashboard title hierarchy.",
    );
    await user.click(
      screen.getByRole("button", { name: /request revision/i }),
    );

    expect(document.querySelector('[data-decision="status"]')).toHaveTextContent(
      "Changes requested",
    );
    expect(screen.getByTestId("status-probe")).toHaveTextContent(
      "changes_requested:not_reviewed:1:1",
    );
  });

  it("does not introduce DesignAgentProvider or regeneration results", () => {
    render(
      <AppProviders>
        <MemoryRouter initialEntries={["/review/screen-dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
      </AppProviders>,
    );

    expect(document.querySelector("[data-design-agent]")).toBeNull();
    expect(document.querySelector("[data-regeneration-result]")).toBeNull();
    expect(
      screen.getByTestId("regenerate-indicator"),
    ).toHaveAttribute("data-regenerate-operational", "false");
  });
});
