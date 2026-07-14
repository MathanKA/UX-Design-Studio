import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../../app/error-boundary";
import { AppRoutes } from "../../app/routes";
import {
  createGovernanceStateFromSpec,
  DEMO_APPROVER,
} from "../../application/governance-session";
import {
  appendGovernanceEvent,
  baselineScreenVersionId,
  createApproveScreenEvent,
  createRequestRevisionEvent,
  selectChronologicalEvents,
  type GovernanceEvent,
  type GovernanceState,
} from "../../domain/governance";
import { InMemoryGovernanceRepository } from "../../infrastructure/persistence/in-memory-governance-repository";
import {
  buildGovernanceStorageKey,
  LocalStorageGovernanceRepository,
} from "../../infrastructure/persistence";
import { agentPilotSeed } from "../../infrastructure/seed";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../../test/governance-ports";
import {
  GovernanceProvider,
  PERSISTENCE_RECOVERY_NOTICE,
  RESET_DEMO_ANNOUNCEMENT,
  useGovernance,
} from "../governance";

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

function createBaseline(createdAt = "2026-07-15T01:00:00.000Z"): GovernanceState {
  return createGovernanceStateFromSpec(agentPilotSeed, createdAt);
}

function appendApproval(
  state: GovernanceState,
  screenId: string,
  occurredAt: string,
  idSuffix: number,
  comment?: string,
): GovernanceState {
  const created = createApproveScreenEvent(
    state,
    {
      ...identity,
      screenId,
      expectedScreenVersionId: baselineScreenVersionId(screenId),
      actor: DEMO_APPROVER,
      ...(comment !== undefined ? { comment } : {}),
    },
    {
      clock: createFixedClock(occurredAt),
      idGenerator: createSequentialIdGenerator(idSuffix),
    },
  );
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error(created.error.message);
  const appended = appendGovernanceEvent(state, created.value);
  expect(appended.ok).toBe(true);
  if (!appended.ok) throw new Error(appended.error.message);
  return appended.state;
}

function appendRevision(
  state: GovernanceState,
  screenId: string,
  occurredAt: string,
  idSuffix: number,
): GovernanceState {
  const screen = agentPilotSeed.screens.find((entry) => entry.id === screenId);
  if (!screen) throw new Error(`missing ${screenId}`);
  const created = createRequestRevisionEvent(
    state,
    {
      ...identity,
      screenId,
      expectedScreenVersionId: baselineScreenVersionId(screenId),
      actor: DEMO_APPROVER,
      affectedNodeIds: [screen.root.id],
      category: "layout",
      description: "Please tighten spacing on the primary panel.",
    },
    {
      clock: createFixedClock(occurredAt),
      idGenerator: createSequentialIdGenerator(idSuffix),
    },
  );
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error(created.error.message);
  const appended = appendGovernanceEvent(state, created.value);
  expect(appended.ok).toBe(true);
  if (!appended.ok) throw new Error(appended.error.message);
  return appended.state;
}

function renderAudit(repository: InMemoryGovernanceRepository | LocalStorageGovernanceRepository) {
  return render(
    <ErrorBoundary title="Application failed to render">
      <GovernanceProvider
        repository={repository}
        clock={createFixedClock("2026-07-15T05:00:00.000Z")}
        idGenerator={createSequentialIdGenerator(100)}
        createdAt="2026-07-15T01:00:00.000Z"
      >
        <MemoryRouter initialEntries={["/audit"]}>
          <AppRoutes />
        </MemoryRouter>
      </GovernanceProvider>
    </ErrorBoundary>,
  );
}

function EventCountProbe() {
  const { state, isGateComplete } = useGovernance();
  return (
    <div>
      <p data-testid="event-count">{state.events.length}</p>
      <p data-testid="gate-complete">{String(isGateComplete())}</p>
    </div>
  );
}

describe("US-4.4 audit view and demo reset", () => {
  beforeEach(() => {
    installMatchMedia();
    window.localStorage.removeItem(managedKey);
  });

  it("lists chronological events with timestamp tie-break and required metadata", () => {
    let state = createBaseline();
    const sameTs = "2026-07-15T03:00:00.000Z";
    state = appendApproval(state, "screen-login", sameTs, 2, "Login ready");
    state = appendApproval(state, "screen-dashboard", sameTs, 1);
    state = appendRevision(
      state,
      "screen-task-detail",
      "2026-07-15T02:00:00.000Z",
      3,
    );

    const ordered = selectChronologicalEvents(state);
    expect(ordered[0]?.screenId).toBe("screen-task-detail");
    expect(ordered[0]?.occurredAt).toBe("2026-07-15T02:00:00.000Z");
    // Same timestamp: lower event id first
    const sameStamp = ordered.filter((event) => event.occurredAt === sameTs);
    expect(sameStamp.map((event) => event.id)).toEqual(
      [...sameStamp].sort((a, b) => a.id.localeCompare(b.id)).map((e) => e.id),
    );

    const repository = new InMemoryGovernanceRepository(state);
    renderAudit(repository);

    const rows = screen.getAllByTestId("audit-event");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveAttribute("data-screen-id", "screen-task-detail");
    expect(rows[0]).toHaveAttribute(
      "data-event-type",
      "screen.revision_requested",
    );

    const approvalRow =
      rows.find((row) => row.getAttribute("data-screen-id") === "screen-login") ??
      rows[0];
    expect(approvalRow).toBeDefined();
    expect(
      within(approvalRow as HTMLElement).getByText("Approved"),
    ).toBeInTheDocument();
    expect(
      within(approvalRow as HTMLElement).getByText("Demo Approver"),
    ).toBeInTheDocument();
    expect(
      within(approvalRow as HTMLElement).getByText("approver"),
    ).toBeInTheDocument();
    expect(
      within(approvalRow as HTMLElement).getByText("Login", {
        selector: '[data-field="screen"]',
      }),
    ).toBeInTheDocument();
    expect(
      within(approvalRow as HTMLElement).getByText(
        baselineScreenVersionId("screen-login"),
      ),
    ).toBeInTheDocument();
    expect(
      within(approvalRow as HTMLElement).getByText("1.0.0", {
        selector: '[data-field="spec-version"]',
      }),
    ).toBeInTheDocument();
    expect(
      within(approvalRow as HTMLElement).getByText("1.0.0", {
        selector: '[data-field="baseline"]',
      }),
    ).toBeInTheDocument();
    expect(
      within(approvalRow as HTMLElement).getByText(/Comment: Login ready/),
    ).toBeInTheDocument();

    const revisionRow = rows.find(
      (row) => row.getAttribute("data-event-type") === "screen.revision_requested",
    );
    expect(revisionRow).toBeDefined();
    expect(
      within(revisionRow as HTMLElement).getByText(/Category: layout/),
    ).toBeInTheDocument();
    expect(
      within(revisionRow as HTMLElement).getByText(/Affected nodes:/),
    ).toBeInTheDocument();
    expect(
      within(revisionRow as HTMLElement).getByText(
        /Please tighten spacing on the primary panel/,
      ),
    ).toBeInTheDocument();
  });

  it("filters by screen without mutating history and shows empty states", async () => {
    const user = userEvent.setup();
    let state = createBaseline();
    state = appendApproval(state, "screen-dashboard", "2026-07-15T02:00:00.000Z", 1);
    state = appendApproval(state, "screen-login", "2026-07-15T03:00:00.000Z", 2);
    const before = state.events.map((event: GovernanceEvent) => event.id);

    renderAudit(new InMemoryGovernanceRepository(state));

    expect(screen.getAllByTestId("audit-event")).toHaveLength(2);
    await user.selectOptions(screen.getByTestId("audit-screen-filter"), "screen-login");
    expect(screen.getAllByTestId("audit-event")).toHaveLength(1);
    expect(screen.getByTestId("audit-event")).toHaveAttribute(
      "data-screen-id",
      "screen-login",
    );

    await user.selectOptions(
      screen.getByTestId("audit-screen-filter"),
      "screen-workflow-templates",
    );
    expect(screen.queryByTestId("audit-event")).not.toBeInTheDocument();
    expect(
      screen.getByText(/No governance events match the selected screen filter/),
    ).toBeInTheDocument();

    // Filtering must not mutate the underlying event log.
    expect(state.events.map((event) => event.id)).toEqual(before);
  });

  it("shows an empty state when the audit log has no events", () => {
    renderAudit(new InMemoryGovernanceRepository(createBaseline()));
    expect(screen.getByText(/No governance events yet/)).toBeInTheDocument();
  });

  it("requires confirmation before reset and preserves unrelated storage plus seed surfaces", async () => {
    const user = userEvent.setup();
    const unrelatedKey = "unrelated-keep-me";
    window.localStorage.setItem(unrelatedKey, "preserve");

    let state = createBaseline();
    state = appendApproval(state, "screen-dashboard", "2026-07-15T02:00:00.000Z", 1);
    const repository = new LocalStorageGovernanceRepository({
      identity,
      fallbackState: createBaseline(),
      storage: window.localStorage,
      clock: createFixedClock("2026-07-15T05:00:00.000Z"),
    });
    expect(repository.save(state).ok).toBe(true);
    expect(window.localStorage.getItem(managedKey)).not.toBeNull();

    const clearSpy = vi.spyOn(Storage.prototype, "clear");

    const personasBefore = structuredClone(agentPilotSeed.personas);
    const journeysBefore = structuredClone(agentPilotSeed.journeys);
    const tokensBefore = structuredClone(agentPilotSeed.designTokens);

    render(
      <ErrorBoundary title="Application failed to render">
        <GovernanceProvider
          repository={repository}
          clock={createFixedClock("2026-07-15T05:00:00.000Z")}
          idGenerator={createSequentialIdGenerator(100)}
          createdAt="2026-07-15T01:00:00.000Z"
        >
          <MemoryRouter initialEntries={["/audit"]}>
            <AppRoutes />
            <EventCountProbe />
          </MemoryRouter>
        </GovernanceProvider>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("event-count")).toHaveTextContent("1");
    expect(screen.getAllByTestId("audit-event")).toHaveLength(1);

    await user.click(screen.getByTestId("reset-demo-open"));
    expect(screen.getByTestId("reset-confirm-dialog")).toBeInTheDocument();
    await user.click(screen.getByTestId("reset-confirm-cancel"));
    expect(screen.queryByTestId("reset-confirm-dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("event-count")).toHaveTextContent("1");
    expect(window.localStorage.getItem(managedKey)).not.toBeNull();

    await user.click(screen.getByTestId("reset-demo-open"));
    await user.click(screen.getByTestId("reset-confirm-submit"));

    expect(screen.getByTestId("event-count")).toHaveTextContent("0");
    expect(screen.queryByTestId("audit-event")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(managedKey)).toBeNull();
    expect(window.localStorage.getItem(unrelatedKey)).toBe("preserve");
    expect(clearSpy).not.toHaveBeenCalled();
    expect(screen.getByText(RESET_DEMO_ANNOUNCEMENT)).toBeInTheDocument();

    expect(agentPilotSeed.personas).toEqual(personasBefore);
    expect(agentPilotSeed.journeys).toEqual(journeysBefore);
    expect(agentPilotSeed.designTokens).toEqual(tokensBefore);

    clearSpy.mockRestore();
    window.localStorage.removeItem(unrelatedKey);
  });

  it("rehydrates approvals across remount and shows recovery notice on corrupt storage", () => {
    let state = createBaseline();
    agentPilotSeed.screens.forEach((screen, index) => {
      state = appendApproval(
        state,
        screen.id,
        `2026-07-15T02:0${index}:00.000Z`,
        index + 1,
      );
    });

    const repository = new LocalStorageGovernanceRepository({
      identity,
      fallbackState: createBaseline(),
      storage: window.localStorage,
      clock: createFixedClock("2026-07-15T05:00:00.000Z"),
    });
    expect(repository.save(state).ok).toBe(true);

    const first = render(
      <ErrorBoundary title="Application failed to render">
        <GovernanceProvider
          repository={repository}
          createdAt="2026-07-15T01:00:00.000Z"
        >
          <MemoryRouter initialEntries={["/audit"]}>
            <AppRoutes />
            <EventCountProbe />
          </MemoryRouter>
        </GovernanceProvider>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("event-count")).toHaveTextContent("5");
    expect(screen.getByTestId("gate-complete")).toHaveTextContent("true");
    first.unmount();

    render(
      <ErrorBoundary title="Application failed to render">
        <GovernanceProvider
          repository={
            new LocalStorageGovernanceRepository({
              identity,
              fallbackState: createBaseline(),
              storage: window.localStorage,
              clock: createFixedClock("2026-07-15T05:00:00.000Z"),
            })
          }
          createdAt="2026-07-15T01:00:00.000Z"
        >
          <MemoryRouter initialEntries={["/audit"]}>
            <AppRoutes />
            <EventCountProbe />
          </MemoryRouter>
        </GovernanceProvider>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("event-count")).toHaveTextContent("5");
    expect(screen.getAllByTestId("audit-event")).toHaveLength(5);

    window.localStorage.setItem(managedKey, "{bad-json");
    render(
      <ErrorBoundary title="Application failed to render">
        <GovernanceProvider
          repository={
            new LocalStorageGovernanceRepository({
              identity,
              fallbackState: createBaseline(),
              storage: window.localStorage,
              clock: createFixedClock("2026-07-15T05:00:00.000Z"),
            })
          }
          createdAt="2026-07-15T01:00:00.000Z"
        >
          <MemoryRouter initialEntries={["/overview"]}>
            <AppRoutes />
          </MemoryRouter>
        </GovernanceProvider>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("persistence-notice")).toHaveTextContent(
      PERSISTENCE_RECOVERY_NOTICE,
    );
    expect(window.localStorage.getItem(managedKey)).toBe("{bad-json");
  });
});
