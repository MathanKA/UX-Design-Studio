import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppRoutes } from "../../app/routes";
import { ErrorBoundary } from "../../app/error-boundary";
import { createGovernanceStateFromSpec } from "../../application/governance-session";
import {
  selectIsGateComplete,
  selectScreenStatus,
  type GovernanceState,
} from "../../domain/governance";
import { InMemoryGovernanceRepository } from "../../infrastructure/persistence/in-memory-governance-repository";
import { LocalStorageGovernanceRepository } from "../../infrastructure/persistence/local-storage-governance-repository";
import { MOCK_DESIGN_AGENT_LATENCY_MS } from "../../infrastructure/providers/mock-design-agent-provider";
import {
  agentPilotDashboardVariantV2,
  agentPilotSeed,
  createAgentPilotContentRegistry,
} from "../../infrastructure/seed";
import {
  createFixedClock,
  createSequentialIdGenerator,
} from "../../test/governance-ports";
import { GovernanceProvider } from "../governance/GovernanceProvider";
import {
  compareScreenVersions,
  deriveVersionHistory,
} from "./version-history-selectors";

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

function createMemoryRepository() {
  return new InMemoryGovernanceRepository(
    createGovernanceStateFromSpec(agentPilotSeed, "2026-07-15T01:00:00.000Z"),
  );
}

function renderWithRepo(
  path: string,
  repository: InMemoryGovernanceRepository,
) {
  const clock = createFixedClock("2026-07-15T03:00:00.000Z");
  const idGenerator = createSequentialIdGenerator(1);
  return render(
    <ErrorBoundary title="Application failed to render">
      <GovernanceProvider
        clock={clock}
        idGenerator={idGenerator}
        createdAt="2026-07-15T01:00:00.000Z"
        repository={repository}
      >
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </GovernanceProvider>
    </ErrorBoundary>,
  );
}

function loadState(repository: InMemoryGovernanceRepository): GovernanceState {
  const result = repository.load();
  if (!result.ok) {
    throw new Error("expected in-memory load success");
  }
  return result.state;
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

describe("US-5.2 version history", () => {
  beforeEach(() => {
    installMatchMedia();
    window.localStorage.removeItem(storageKey());
  });

  it("shows baseline-only empty comparison state", () => {
    renderWithRepo("/review/screen-dashboard", createMemoryRepository());
    const panel = screen.getByTestId("version-history-panel");
    expect(panel).toHaveAttribute("data-version-history-baseline-only", "true");
    expect(
      within(panel).getByText(/only the baseline version exists/i),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-version-comparison]")).toBeNull();
  });

  it("compares prior and current screen specs with node deltas and prop summaries", () => {
    const baseline = agentPilotSeed.screens.find(
      (entry) => entry.id === "screen-dashboard",
    );
    expect(baseline).toBeDefined();
    const comparison = compareScreenVersions(
      baseline!,
      agentPilotDashboardVariantV2,
      {
        providerExplanation: ["Applied structured revision"],
        providerRequestId: "provider-req-1",
      },
    );
    expect(comparison.nodeCountDelta).toBe(
      comparison.currentNodeCount - comparison.priorNodeCount,
    );
    expect(comparison.changeSummaries.length).toBeGreaterThan(0);
    expect(comparison.providerExplanation).toEqual([
      "Applied structured revision",
    ]);
    expect(comparison.providerRequestId).toBe("provider-req-1");
  });

  it("lists regenerated history with comparison, revision, and provider request", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const repository = createMemoryRepository();
    renderWithRepo("/review/screen-dashboard", repository);

    await requestDashboardRevision(user);
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS);
    });

    const panel = screen.getByTestId("version-history-panel");
    expect(panel).toHaveAttribute("data-version-history-baseline-only", "false");
    expect(panel).toHaveAttribute("data-version-count", "2");
    expect(document.querySelector("[data-version-marker='current']")).toBeTruthy();
    expect(document.querySelector("[data-version-comparison]")).toBeTruthy();
    expect(document.querySelector("[data-comparison-explanation]")).toBeTruthy();
    expect(document.querySelector("[data-version-provider-request]")).toBeTruthy();
    expect(document.querySelector("[data-version-revision]")).toHaveTextContent(
      /layout/i,
    );

    const history = deriveVersionHistory({
      state: loadState(repository),
      screenId: "screen-dashboard",
      seed: agentPilotSeed,
      contentRegistry: createAgentPilotContentRegistry(),
    });
    expect(history?.entries).toHaveLength(2);
    expect(history?.comparison?.providerExplanation?.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("includes prefers-reduced-motion rules for panel animations", () => {
    const css = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "./VersionHistoryPanel.module.css"),
      "utf8",
    );
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});

describe("US-5.2 reapproval gate invalidate and restore", () => {
  beforeEach(() => {
    installMatchMedia();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.localStorage.removeItem(storageKey());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invalidates gate after regen of approved Dashboard and restores after reapproval", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const repository = createMemoryRepository();
    renderWithRepo("/overview", repository);

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
        await user.click(screen.getByRole("link", { name: "Overview" }));
      }
    }

    expect(
      document.querySelector('[data-decision="gate-readiness"]'),
    ).toHaveAttribute("data-gate-complete", "true");
    expect(selectIsGateComplete(loadState(repository))).toBe(true);

    await user.click(screen.getByRole("link", { name: "Overview" }));
    await user.click(
      screen.getByRole("link", { name: "Open Dashboard review" }),
    );

    await requestDashboardRevision(user);
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MOCK_DESIGN_AGENT_LATENCY_MS);
    });

    const afterRegen = loadState(repository);
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

    const history = deriveVersionHistory({
      state: afterRegen,
      screenId: "screen-dashboard",
      seed: agentPilotSeed,
      contentRegistry: createAgentPilotContentRegistry(),
    });
    expect(history?.entries.find((e) => e.version.source === "baseline")
      ?.approvalTone).toBe("historical");
    expect(history?.current?.status).toBe("ready_for_review");

    await user.click(
      screen.getByRole("button", { name: /approve current version/i }),
    );

    const afterReapprove = loadState(repository);
    expect(selectScreenStatus(afterReapprove, "screen-dashboard")).toBe(
      "approved",
    );
    expect(selectIsGateComplete(afterReapprove)).toBe(true);
    expect(
      document.querySelector('[data-decision="gate-readiness"]'),
    ).toHaveAttribute("data-gate-complete", "true");

    await user.click(screen.getByRole("link", { name: "Overview" }));
    expect(
      document.querySelector('[data-approval="gate-readiness"]'),
    ).toHaveAttribute("data-gate-complete", "true");

    const persisted = new LocalStorageGovernanceRepository({
      identity: {
        projectId: agentPilotSeed.projectId,
        specId: agentPilotSeed.id,
        specVersion: agentPilotSeed.version,
        baselineVersion: agentPilotSeed.baselineVersion,
      },
      fallbackState: createGovernanceStateFromSpec(
        agentPilotSeed,
        "2026-07-15T01:00:00.000Z",
      ),
      storage: window.localStorage,
      clock: createFixedClock("2026-07-15T04:00:00.000Z"),
    });
    expect(persisted.save(afterReapprove).ok).toBe(true);
    const loaded = persisted.load();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      throw new Error(`persistence reload failed: ${loaded.reason}`);
    }
    expect(selectIsGateComplete(loaded.state)).toBe(true);
    expect(selectScreenStatus(loaded.state, "screen-dashboard")).toBe(
      "approved",
    );
    const reloadedHistory = deriveVersionHistory({
      state: loaded.state,
      screenId: "screen-dashboard",
      seed: agentPilotSeed,
      contentRegistry: createAgentPilotContentRegistry(),
    });
    expect(reloadedHistory?.entries).toHaveLength(2);
    expect(reloadedHistory?.current?.approvalTone).toBe("current");
  });
});
