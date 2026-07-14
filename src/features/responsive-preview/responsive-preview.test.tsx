import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppProviders } from "../../app/providers";
import { AppRoutes } from "../../app/routes";
import { ErrorBoundary } from "../../app/error-boundary";
import { appConfig } from "../../app/config";
import { createNoopRenderContext } from "../../renderer";
import { GridComponent } from "../../renderer/components/Grid";
import { resolveGridColumns } from "../../renderer/layout/resolve-grid-columns";
import {
  DEFAULT_PREVIEW_BREAKPOINT,
  listAvailableBreakpoints,
  PREVIEW_BREAKPOINTS,
  PREVIEW_WIDTHS,
} from "./index";

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

describe("US-3.3 responsive preview", () => {
  it("exposes canonical widths for mobile, tablet, and desktop", () => {
    expect(PREVIEW_BREAKPOINTS).toEqual(["mobile", "tablet", "desktop"]);
    expect(PREVIEW_WIDTHS).toEqual({
      mobile: 390,
      tablet: 768,
      desktop: 1280,
    });
    expect(DEFAULT_PREVIEW_BREAKPOINT).toBe("desktop");
  });

  it("gates tablet by enableTabletPreview without affecting mobile or desktop", () => {
    expect(appConfig.enableTabletPreview).toBe(true);
    expect(listAvailableBreakpoints(true)).toEqual([
      "mobile",
      "tablet",
      "desktop",
    ]);
    expect(listAvailableBreakpoints(false)).toEqual(["mobile", "desktop"]);
  });

  it("defaults to desktop and updates preview frame width plus render context", async () => {
    const user = userEvent.setup();
    renderAt("/review/screen-dashboard");

    const desktopRadio = screen.getByRole("radio", { name: "Desktop" });
    expect(desktopRadio).toBeChecked();

    const viewport = document.querySelector("[data-preview-viewport='true']");
    expect(viewport).toHaveAttribute("data-breakpoint", "desktop");
    expect(viewport).toHaveAttribute("data-preview-width", "1280");
    expect(viewport).toHaveStyle({ width: "1280px" });
    expect(
      screen.getByRole("navigation", { name: "Generated desktop navigation" }),
    ).toHaveAttribute("data-nav-visible", "true");

    await user.click(screen.getByRole("radio", { name: "Mobile" }));
    expect(screen.getByRole("radio", { name: "Mobile" })).toBeChecked();
    expect(viewport).toHaveAttribute("data-breakpoint", "mobile");
    expect(viewport).toHaveAttribute("data-preview-width", "390");
    expect(viewport).toHaveStyle({ width: "390px" });
    expect(
      screen.getByRole("navigation", { name: "Generated mobile navigation" }),
    ).toHaveAttribute("data-nav-visible", "true");
    expect(
      document.querySelector('[data-nav-mode="desktop"]'),
    ).toHaveAttribute("data-nav-visible", "false");

    await user.click(screen.getByRole("radio", { name: "Tablet" }));
    expect(screen.getByRole("radio", { name: "Tablet" })).toBeChecked();
    expect(viewport).toHaveAttribute("data-breakpoint", "tablet");
    expect(viewport).toHaveAttribute("data-preview-width", "768");
    expect(viewport).toHaveStyle({ width: "768px" });
    expect(
      screen.getByRole("navigation", { name: "Generated desktop navigation" }),
    ).toHaveAttribute("data-nav-visible", "true");
    expect(
      document.querySelector('[data-nav-mode="mobile"]'),
    ).toHaveAttribute("data-nav-visible", "false");
  });

  it("recomputes grid columns from context.breakpoint without UXSpec CSS", () => {
    expect(resolveGridColumns(3, "mobile")).toBe(1);
    expect(resolveGridColumns(3, "tablet")).toBe(2);
    expect(resolveGridColumns(3, "desktop")).toBe(3);
    expect(resolveGridColumns(1, "tablet")).toBe(1);
    expect(resolveGridColumns(4, "tablet")).toBe(2);

    const { rerender } = render(
      <GridComponent
        nodeId="grid-1"
        props={{ columns: 3 }}
        context={createNoopRenderContext({ breakpoint: "mobile" })}
      >
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </GridComponent>,
    );

    let grid = document.querySelector("[data-grid-columns]");
    expect(grid).toHaveAttribute("data-grid-columns", "1");
    expect(grid).toHaveAttribute("data-grid-seeded-columns", "3");
    expect(grid).toHaveAttribute("data-grid-breakpoint", "mobile");

    rerender(
      <GridComponent
        nodeId="grid-1"
        props={{ columns: 3 }}
        context={createNoopRenderContext({ breakpoint: "tablet" })}
      >
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </GridComponent>,
    );
    grid = document.querySelector("[data-grid-columns]");
    expect(grid).toHaveAttribute("data-grid-columns", "2");
    expect(grid).toHaveAttribute("data-grid-breakpoint", "tablet");

    rerender(
      <GridComponent
        nodeId="grid-1"
        props={{ columns: 3 }}
        context={createNoopRenderContext({ breakpoint: "desktop" })}
      >
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </GridComponent>,
    );
    grid = document.querySelector("[data-grid-columns]");
    expect(grid).toHaveAttribute("data-grid-columns", "3");
    expect(grid).toHaveAttribute("data-grid-breakpoint", "desktop");
  });

  it("shows a width indicator and keeps preview scroll host for narrow shells", () => {
    renderAt("/review/screen-dashboard");
    expect(
      document.querySelector("[data-preview-viewport-scroll='true']"),
    ).not.toBeNull();
    expect(
      document.querySelector("[data-preview-width-indicator='true']"),
    ).toHaveTextContent("Desktop · 1280px");
  });

  it("exposes an accessible breakpoint radiogroup including tablet when enabled", () => {
    renderAt("/review/screen-login");
    const group = screen.getByRole("radiogroup", { name: "Preview breakpoint" });
    expect(within(group).getByRole("radio", { name: "Mobile" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Tablet" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Desktop" })).toBeInTheDocument();
  });
});
