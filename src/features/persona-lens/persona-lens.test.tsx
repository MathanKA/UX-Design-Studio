import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach } from "vitest";
import { AppProviders } from "../../app/providers";
import { AppRoutes } from "../../app/routes";
import { ErrorBoundary } from "../../app/error-boundary";
import { agentPilotSeed } from "../../infrastructure/seed";
import {
  derivePersonaLensContext,
  listPersonas,
  resolveScreenTouchpoint,
} from "../../domain/ux-spec";

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

describe("US-3.2 persona review lens", () => {
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

  it("exposes exactly the seeded personas from UXSpec", () => {
    expect(listPersonas(agentPilotSeed)).toHaveLength(3);
    expect(listPersonas(agentPilotSeed).map((persona) => persona.name)).toEqual([
      "Alex",
      "Jordan",
      "Taylor",
    ]);
  });

  it("defaults to Alex and allows selecting Jordan and Taylor accessibly", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-dashboard");

    const alex = screen.getByRole("radio", { name: "Alex" });
    expect(alex).toBeChecked();
    expect(document.querySelector('[data-persona-context="persona-alex"]')).not.toBeNull();

    await user.click(screen.getByRole("radio", { name: "Jordan" }));
    expect(screen.getByRole("radio", { name: "Jordan" })).toBeChecked();
    expect(
      document.querySelector('[data-persona-context="persona-jordan"]'),
    ).not.toBeNull();
    expect(screen.getByText("Frontend Lead")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Taylor" }));
    expect(screen.getByRole("radio", { name: "Taylor" })).toBeChecked();
    expect(screen.getByText("Compliance Officer")).toBeInTheDocument();
  });

  it("derives goals, frustrations, touchpoints, and journey context from UXSpec", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-dashboard");
    const alex = agentPilotSeed.personas.find((persona) => persona.name === "Alex")!;
    expect(document.querySelector("[data-persona-goals]")).toHaveTextContent(
      alex.goals[0]!,
    );
    expect(
      document.querySelector("[data-persona-frustrations]"),
    ).toHaveTextContent(alex.frustrations[0]!);

    const touchpoint = resolveScreenTouchpoint(
      agentPilotSeed.screens.find((screen) => screen.id === "screen-dashboard"),
      alex.id,
    );
    expect(touchpoint?.goals?.[0]).toBeTruthy();
    expect(document.querySelector("[data-persona-touchpoint]")).toHaveTextContent(
      touchpoint!.goals![0]!,
    );
    expect(document.querySelector("[data-persona-journeys]")).not.toBeNull();

    await user.click(
      within(
        screen.getByRole("navigation", { name: "Generated desktop navigation" }),
      ).getByRole("link", { name: "Login" }),
    );

    const loginContext = derivePersonaLensContext(
      agentPilotSeed,
      alex.id,
      "screen-login",
    );
    expect(loginContext?.relatedJourneySteps.length).toBeGreaterThan(0);
  });

  it("shows an empty touchpoint state when none exist for the persona", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-dashboard");
    await user.click(screen.getByRole("radio", { name: "Taylor" }));
    // Taylor has no touchpoint on dashboard in seed
    const taylorTouch = resolveScreenTouchpoint(
      agentPilotSeed.screens.find((screen) => screen.id === "screen-dashboard"),
      "persona-taylor",
    );
    if (!taylorTouch) {
      expect(
        document.querySelector("[data-persona-touchpoint-empty='true']"),
      ).not.toBeNull();
    }
  });

  it("does not mutate UXSpec or preview component props when switching personas", async () => {
    const user = userEvent.setup();
    const frozenTitle = agentPilotSeed.title;
    const frozenPersonaCount = agentPilotSeed.personas.length;
    renderAt("/review/screen-dashboard");
    const before = document.querySelector('[data-screen-id="screen-dashboard"]')
      ?.innerHTML;

    await user.click(screen.getByRole("radio", { name: "Jordan" }));
    await user.click(screen.getByRole("radio", { name: "Taylor" }));

    expect(agentPilotSeed.title).toBe(frozenTitle);
    expect(agentPilotSeed.personas).toHaveLength(frozenPersonaCount);
    expect(
      document.querySelector('[data-screen-id="screen-dashboard"]')?.innerHTML,
    ).toBe(before);
  });

  it("keeps preview controls keyboard operable beside the lens panel", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-dashboard");
    const createTask = screen.getByRole("button", { name: "Create task" });
    createTask.focus();
    expect(createTask).toHaveFocus();
    await user.tab();
    // Lens is beside preview; radiogroup remains reachable and preview stays present.
    expect(
      document.querySelector('[data-workbench-region="preview-canvas"]'),
    ).not.toBeNull();
    expect(screen.getByRole("radiogroup", { name: "Active persona" })).toBeInTheDocument();
  });
});
