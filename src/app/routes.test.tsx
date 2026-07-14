import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../app/error-boundary";
import { AppProviders } from "../app/providers";
import { AppRoutes } from "../app/routes";

function renderAt(path: string) {
  return render(
    <ErrorBoundary title="Application failed to render">
      <AppProviders>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </AppProviders>
    </ErrorBoundary>,
  );
}

describe("application routes", () => {
  it("redirects / to /overview", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("renders overview, review, and audit routes", () => {
    renderAt("/overview");
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();

    renderAt("/review/screen-dashboard");
    expect(screen.getByRole("heading", { name: "Screen review" })).toBeInTheDocument();
    expect(document.querySelector('[data-screen-id="screen-dashboard"]')).not.toBeNull();

    renderAt("/audit");
    expect(screen.getByRole("heading", { name: "Audit" })).toBeInTheDocument();
  });

  it("renders a controlled fallback for unknown routes", () => {
    renderAt("/does-not-exist");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to overview" })).toBeInTheDocument();
  });

  it("keeps the shell available after a route-level failure", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderAt("/__error-probe");

    expect(screen.getByRole("heading", { name: "UX Design Studio" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Route probe failed to render" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Controlled route failure for boundary verification.",
    );

    await user.click(screen.getByRole("link", { name: "Overview" }));
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
