import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { agentPilotSeed } from "../../infrastructure/seed";
import { PreviewThemeRoot } from "./PreviewThemeRoot";
import {
  createEffectiveTokenView,
  mapDesignTokensToCssVars,
  mergeDesignTokens,
} from "./token-mapper";

describe("runtime design tokens", () => {
  const base = agentPilotSeed.designTokens;

  it("maps every required semantic token to --uxds-* variables", () => {
    const vars = mapDesignTokensToCssVars(base);
    const names = Object.keys(vars);
    expect(names.length).toBeGreaterThanOrEqual(20);
    expect(names.every((name) => name.startsWith("--uxds-"))).toBe(true);
    expect(vars["--uxds-color-primary"]).toBe(base.color.primary);
    expect(vars["--uxds-font-family"]).toBe(base.typography.fontFamily);
    expect(vars["--uxds-space-md"]).toBe(base.spacing.md);
    expect(vars["--uxds-radius-md"]).toBe(base.radius.md);
  });

  it("rejects arbitrary keys and unsafe CSS values", () => {
    expect(
      createEffectiveTokenView(base, {
        color: { primary: "url(javascript:alert(1))" },
      }).ok,
    ).toBe(false);

    expect(
      createEffectiveTokenView(base, {
        color: { primary: "#fff; background: red" },
      }).ok,
    ).toBe(false);

    expect(
      createEffectiveTokenView(base, {
        color: { primary: "var(--window-color)" },
      }).ok,
    ).toBe(false);

    expect(
      createEffectiveTokenView(base, {
        weird: { hack: "red" },
      } as unknown).ok,
    ).toBe(false);
  });

  it("applies variables only to the preview root and leaves shell unaffected", () => {
    render(
      <div data-testid="studio-shell" style={{ color: "rgb(1, 2, 3)" }}>
        <span>Studio chrome</span>
        <PreviewThemeRoot tokens={base}>
          <button type="button">Preview control</button>
        </PreviewThemeRoot>
      </div>,
    );

    const root = screen.getByTestId("preview-theme-root");
    const shell = screen.getByTestId("studio-shell");
    expect(root).toHaveAttribute("data-uxds-preview-root", "true");
    expect(root.style.getPropertyValue("--uxds-color-primary")).toBe(
      base.color.primary,
    );
    expect(shell.style.getPropertyValue("--uxds-color-primary")).toBe("");
    expect(getComputedStyle(shell).color).toBe("rgb(1, 2, 3)");
  });

  it("updates overrides without mutating frozen base tokens", () => {
    const frozenPrimary = base.color.primary;
    const first = createEffectiveTokenView(base, {
      color: { primary: "#123456" },
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.vars["--uxds-color-primary"]).toBe("#123456");
    expect(base.color.primary).toBe(frozenPrimary);

    const reset = createEffectiveTokenView(base, {});
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    expect(reset.vars["--uxds-color-primary"]).toBe(frozenPrimary);

    const merged = mergeDesignTokens(base, { color: { primary: "#abcdef" } });
    expect(merged.color.primary).toBe("#abcdef");
    expect(base.color.primary).toBe(frozenPrimary);
    expect(Object.isFrozen(merged)).toBe(true);
    expect(Object.isFrozen(merged.color)).toBe(true);
  });

  it("re-renders preview root immediately when override changes", () => {
    const { rerender } = render(
      <PreviewThemeRoot tokens={base} override={{ color: { primary: "#111111" } }}>
        child
      </PreviewThemeRoot>,
    );
    expect(
      screen.getByTestId("preview-theme-root").style.getPropertyValue(
        "--uxds-color-primary",
      ),
    ).toBe("#111111");

    rerender(
      <PreviewThemeRoot tokens={base} override={{ color: { primary: "#222222" } }}>
        child
      </PreviewThemeRoot>,
    );
    expect(
      screen.getByTestId("preview-theme-root").style.getPropertyValue(
        "--uxds-color-primary",
      ),
    ).toBe("#222222");
  });
});
