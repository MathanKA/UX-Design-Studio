import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import UxDesignStudioRemote from "./UxDesignStudioRemote";
import { UxDesignStudioApp } from "../app/UxDesignStudioApp";

describe("federated remote integration", () => {
  it("renders an accessible integration error for unsupported project ids", () => {
    render(
      <UxDesignStudioRemote
        projectId="project-other"
        baselineVersion="1.0.0"
        basePath="/projects/project-other/ux-design-studio"
        actor={{
          id: "demo-approver",
          displayLabel: "Demo Approver",
          role: "approver",
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /host integration contract is invalid/i,
    );
  });

  it("embeds without the standalone InsaneSDD header", () => {
    render(
      <MemoryRouter initialEntries={["/overview"]}>
        <UxDesignStudioApp mode="embedded" />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("studio-standalone-header")).not.toBeInTheDocument();
    expect(screen.getByTestId("studio-embedded-nav")).toBeInTheDocument();
    expect(screen.queryByText(/InsaneSDD proof-of-work concept/i)).not.toBeInTheDocument();
  });

  it("keeps the standalone header in standalone mode", () => {
    render(
      <MemoryRouter initialEntries={["/overview"]}>
        <UxDesignStudioApp mode="standalone" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("studio-standalone-header")).toBeInTheDocument();
    expect(screen.getByText(/InsaneSDD proof-of-work concept/i)).toBeInTheDocument();
  });
});
