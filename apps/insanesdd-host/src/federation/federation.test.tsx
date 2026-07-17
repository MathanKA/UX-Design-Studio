import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProjectShell } from "../shell/ProjectShell";
import { RemoteErrorBoundary } from "./RemoteErrorBoundary";
import { RemoteLoadingState } from "./RemoteLoadingState";
import { AgileEditorPage } from "../placeholders/AgileEditorPage";

vi.mock("uxDesignStudio/App", () => ({
  default: () => <div data-testid="mock-remote">Mock remote</div>,
}));

describe("simulated host shell", () => {
  it("renders the left project menu without an InsaneSDD header", () => {
    render(
      <MemoryRouter initialEntries={["/projects/project-agentpilot/overview"]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectShell />}>
            <Route path="overview" element={<div>Overview body</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("host-project-shell")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Project sections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "UX Design" })).toBeInTheDocument();
    expect(screen.getByText("Simulated integration host")).toBeInTheDocument();
    expect(screen.queryByText(/InsaneSDD/i)).not.toBeInTheDocument();
  });

  it("renders remote loading and failure fallbacks accessibly", () => {
    render(<RemoteLoadingState />);
    expect(screen.getByRole("status")).toHaveTextContent(/Loading UX Design Studio/i);

    render(
      <MemoryRouter>
        <RemoteErrorBoundary
          projectId="project-agentpilot"
          onRetry={() => undefined}
        >
          <ThrowingChild />
        </RemoteErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/UX Design Studio unavailable/i);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows Agile Editor readiness copy", () => {
    render(
      <MemoryRouter>
        <AgileEditorPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("agile-editor-page")).toHaveTextContent(
      /UX Design approved/i,
    );
    expect(screen.getByText(/Ready for Agile plan generation/i)).toBeInTheDocument();
  });
});

function ThrowingChild(): never {
  throw new Error("remote boom");
}
