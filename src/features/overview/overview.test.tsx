import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach } from "vitest";
import { AppProviders } from "../../app/providers";
import { AppRoutes } from "../../app/routes";
import { ErrorBoundary } from "../../app/error-boundary";
import { agentPilotSeed } from "../../infrastructure/seed";
import {
  countSpecComponentNodes,
  deriveUXSpecOverviewSummary,
} from "../../domain/ux-spec";
import { OverviewPage } from "./OverviewPage";
import {
  buildPlaceholderScreenStatuses,
  deriveApprovalProgressPlaceholder,
} from "./review-status-placeholder";
import { EmptyState, LoadingState, PartialDataState } from "../../ui/states";
import type { UXSpec } from "../../domain/ux-spec";

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

describe("US-3.1 specification overview", () => {
  beforeEach(() => {
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
  });

  it("derives overview counts from the loaded UXSpec", () => {
    renderAt("/overview");
    const expected = deriveUXSpecOverviewSummary(agentPilotSeed);
    expect(screen.getByTestId("overview-summary")).toBeInTheDocument();
    expect(screen.getByTestId("overview-summary")).toHaveTextContent(
      String(expected.personaCount),
    );
    expect(
      screen.getByTestId("overview-summary").querySelector(
        '[data-overview-field="persona-count"]',
      ),
    ).toHaveTextContent(String(agentPilotSeed.personas.length));
    expect(
      document.querySelector('[data-overview-field="journey-count"]'),
    ).toHaveTextContent(String(agentPilotSeed.journeys.length));
    expect(
      document.querySelector('[data-overview-field="screen-count"]'),
    ).toHaveTextContent(String(agentPilotSeed.screens.length));
    expect(
      document.querySelector('[data-overview-field="component-count"]'),
    ).toHaveTextContent(String(countSpecComponentNodes(agentPilotSeed)));
    expect(
      document.querySelector('[data-overview-field="project-name"]'),
    ).toHaveTextContent(agentPilotSeed.title);
  });

  it("shows design-system summary and five screen cards with review links", () => {
    renderAt("/overview");
    expect(screen.getByTestId("design-system-summary")).toBeInTheDocument();
    expect(document.querySelector('[data-token="primary"]')).toHaveTextContent(
      agentPilotSeed.designTokens.color.primary,
    );

    const cards = screen.getByTestId("screen-cards");
    expect(within(cards).getAllByRole("article")).toHaveLength(
      agentPilotSeed.screens.length,
    );

    for (const seedScreen of agentPilotSeed.screens) {
      const link = within(cards).getByRole("link", {
        name: `Open ${seedScreen.name} review`,
      });
      expect(link).toHaveAttribute("href", `/review/${seedScreen.id}`);
      expect(
        document.querySelector(`[data-review-status="${seedScreen.id}"]`),
      ).toHaveTextContent("Not reviewed");
    }
  });

  it("uses an honest approval progress placeholder without governance events", () => {
    renderAt("/overview");
    const progress = deriveApprovalProgressPlaceholder(agentPilotSeed);
    expect(screen.getByTestId("approval-progress-placeholder")).toHaveTextContent(
      progress.headline,
    );
    expect(screen.getByTestId("approval-progress-placeholder")).toHaveTextContent(
      progress.detail,
    );
    expect(buildPlaceholderScreenStatuses(agentPilotSeed)).toHaveLength(
      agentPilotSeed.screens.length,
    );
    expect(document.querySelector("[data-governance-event]")).toBeNull();
  });

  it("supports keyboard activation of screen review entry points", async () => {
    const user = userEvent.setup();
    renderAt("/overview");
    const first = agentPilotSeed.screens[0]!;
    const link = screen.getByRole("link", {
      name: `Open ${first.name} review`,
    });
    link.focus();
    expect(link).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "Screen review" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector(`[data-screen-id="${first.id}"]`),
    ).not.toBeNull();
  });

  it("preserves the shell for loading and empty overview states", () => {
    const { unmount } = render(
      <MemoryRouter>
        <OverviewPage loading />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    unmount();

    const emptySpec: UXSpec = {
      ...agentPilotSeed,
      screens: [],
    };
    render(
      <MemoryRouter>
        <OverviewPage spec={emptySpec} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/No screens are available/i)).toBeInTheDocument();
  });

  it("exposes reusable partial-data and loading state presentation", () => {
    const { unmount } = render(<LoadingState />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    unmount();

    render(
      <PartialDataState>
        <p>Missing root tree for demo screen.</p>
      </PartialDataState>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Missing root tree");
    expect(screen.getByRole("heading", { name: "Partial screen data" })).toBeInTheDocument();

    render(
      <EmptyState>
        <p>Nothing here</p>
      </EmptyState>,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
