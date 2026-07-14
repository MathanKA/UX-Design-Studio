import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppProviders } from "../../app/providers";
import { AppRoutes } from "../../app/routes";
import { agentPilotSeed } from "../../infrastructure/seed";
import { ErrorBoundary } from "../../app/error-boundary";

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

describe("US-2.4 five-screen review rendering", () => {
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

  it("renders all five canonical screen routes through the common composer", () => {
    expect(agentPilotSeed.screens).toHaveLength(5);
    for (const seedScreen of agentPilotSeed.screens) {
      const { unmount } = renderAt(`/review/${seedScreen.id}`);
      expect(
        screen.getByRole("heading", { name: "Screen review" }),
      ).toBeInTheDocument();
      expect(
        document.querySelector(`[data-screen-id="${seedScreen.id}"]`),
      ).not.toBeNull();
      expect(
        document.querySelector("[data-uxds-preview-root='true']"),
      ).not.toBeNull();
      unmount();
    }
  });

  it("marks the active generated navigation destination", () => {
    renderAt("/review/screen-login");
    const desktop = screen.getByRole("navigation", {
      name: "Generated desktop navigation",
    });
    const active = within(desktop).getByRole("link", {
      name: "Login",
      current: "page",
    });
    expect(active).toHaveAttribute("href", "/review/screen-login");
  });

  it("supports desktop and mobile generated navigation models", () => {
    renderAt("/review/screen-dashboard");
    expect(
      document.querySelector('[data-nav-mode="desktop"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-nav-mode="mobile"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("navigation", { name: "Generated desktop navigation" }),
    ).toHaveAttribute("data-nav-visible", "true");

    for (const item of agentPilotSeed.navigation.desktop.items) {
      expect(
        within(
          screen.getByRole("navigation", {
            name: "Generated desktop navigation",
          }),
        ).getByRole("link", { name: item.label }),
      ).toHaveAttribute("href", `/review/${item.screenId}`);
    }
  });

  it("switches screens client-side without a full document reload", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-dashboard");
    expect(
      document.querySelector('[data-screen-id="screen-dashboard"]'),
    ).not.toBeNull();

    await user.click(
      within(
        screen.getByRole("navigation", { name: "Generated desktop navigation" }),
      ).getByRole("link", { name: "Login" }),
    );

    expect(
      document.querySelector('[data-screen-id="screen-login"]'),
    ).not.toBeNull();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows a controlled fallback for invalid screen ids", () => {
    renderAt("/review/not-a-real-screen");
    expect(screen.getByRole("alert")).toHaveTextContent("Unknown screen");
    expect(screen.getByRole("alert")).toHaveTextContent("not-a-real-screen");
    expect(screen.getByRole("heading", { name: "UX Design Studio" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Studio" }),
    ).toBeInTheDocument();
  });

  it("separates workbench regions and exposes version-bound approval controls", () => {
    renderAt("/review/screen-dashboard");
    expect(
      document.querySelector('[data-workbench-region="screen-navigation"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-workbench-region="preview-canvas"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-workbench-region="lens-controls"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-workbench-region="decision-panel"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /approve current version/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request revision/i }),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-decision-placeholder='true']")).toBeNull();
    expect(document.querySelector('[data-decision="screen-version"]')).toHaveTextContent(
      "sv-screen-dashboard-baseline",
    );
  });

  it("renders required data, form, feedback, and chart nodes on representative screens", () => {
    const first = renderAt("/review/screen-dashboard");
    expect(screen.getByRole("table", { name: "Recent tasks" })).toBeInTheDocument();
    expect(screen.getByLabelText("SLA trend")).toBeInTheDocument();
    first.unmount();

    renderAt("/review/screen-login");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByText("Use your organization credentials."),
    ).toBeInTheDocument();
  });

  it("does not introduce page-specific screen React modules", () => {
    const featuresRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
    );
    const screenModules = readdirSync(featuresRoot, { recursive: true })
      .map(String)
      .filter((name) => /Screen\.tsx$/.test(name));
    expect(screenModules).toEqual([]);

    const reviewSource = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "ReviewPage.tsx"),
      "utf8",
    );
    const workbenchSource = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "ReviewWorkbench.tsx",
      ),
      "utf8",
    );
    expect(reviewSource).not.toMatch(/switch\s*\(\s*screenId|if\s*\(\s*screenId\s*===/);
    expect(workbenchSource).not.toMatch(
      /switch\s*\(\s*screenId|if\s*\(\s*screenId\s*===/,
    );
  });
});
