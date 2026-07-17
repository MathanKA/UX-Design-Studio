import { describe, expect, it } from "vitest";
import { loadUXSpec } from "./load-ux-spec";
import type { UXSpecValidationIssue } from "./model";
import { createValidUXSpecFixture } from "./test/fixtures";

function hasCode(issues: readonly UXSpecValidationIssue[], code: string): boolean {
  return issues.some((issue) => issue.code === code);
}
describe("loadUXSpec", () => {
  it("accepts a valid document and returns a readonly frozen spec", () => {
    const result = loadUXSpec(createValidUXSpecFixture());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.spec.title).toBe("AgentPilot");
    expect(Object.isFrozen(result.spec)).toBe(true);
    expect(Object.isFrozen(result.spec.screens)).toBe(true);
    expect(Object.isFrozen(result.spec.screens[0])).toBe(true);

    expect(() => {
      (result.spec as { title: string }).title = "mutated";
    }).toThrow();
  });

  it("rejects malformed schema values", () => {
    const result = loadUXSpec({
      ...createValidUXSpecFixture(),
      version: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.path.includes("version"))).toBe(true);
  });

  it("rejects unsafe executable props", () => {
    const fixture = createValidUXSpecFixture();
    const screen = fixture.screens[0];
    if (!screen) throw new Error("expected screen");

    const result = loadUXSpec({
      ...fixture,
      screens: [
        {
          ...screen,
          root: {
            ...screen.root,
            props: {
              onClick: "alert(1)",
            },
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
  });

  it("rejects unsafe URL protocols in props", () => {
    const fixture = createValidUXSpecFixture();
    const screen = fixture.screens[0];
    if (!screen) throw new Error("expected screen");

    const result = loadUXSpec({
      ...fixture,
      screens: [
        {
          ...screen,
          root: {
            ...screen.root,
            props: {
              href: "javascript:alert(1)",
            },
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
  });

  it("rejects duplicate screen IDs", () => {
    const fixture = createValidUXSpecFixture();
    const screen = fixture.screens[0];
    if (!screen) throw new Error("expected screen");

    const result = loadUXSpec({
      ...fixture,
      screens: [screen, { ...screen }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(hasCode(result.issues, "duplicate_screen_id")).toBe(true);
  });

  it("rejects broken persona, journey, and navigation references", () => {
    const fixture = createValidUXSpecFixture();
    const journey = fixture.journeys[0];
    if (!journey) throw new Error("expected journey");

    const brokenPersona = loadUXSpec({
      ...fixture,
      journeys: [{ ...journey, personaId: "missing-persona" }],
    });
    expect(brokenPersona.ok).toBe(false);
    if (!brokenPersona.ok) {
      expect(hasCode(brokenPersona.issues, "broken_persona_ref")).toBe(true);
    }

    const brokenScreen = loadUXSpec({
      ...fixture,
      journeys: [
        {
          ...journey,
          steps: [{ ...journey.steps[0]!, screenId: "missing-screen" }],
        },
      ],
    });
    expect(brokenScreen.ok).toBe(false);
    if (!brokenScreen.ok) {
      expect(hasCode(brokenScreen.issues, "broken_screen_ref")).toBe(true);
    }

    const brokenNav = loadUXSpec({
      ...fixture,
      navigation: {
        ...fixture.navigation,
        desktop: {
          placement: "sidebar",
          items: [{ id: "nav-x", label: "X", screenId: "missing-screen" }],
        },
      },
    });
    expect(brokenNav.ok).toBe(false);
    if (!brokenNav.ok) {
      expect(hasCode(brokenNav.issues, "broken_navigation_ref")).toBe(true);
    }
  });

  it("rejects duplicate node IDs within a screen", () => {
    const fixture = createValidUXSpecFixture();
    const screen = fixture.screens[0];
    if (!screen) throw new Error("expected screen");

    const result = loadUXSpec({
      ...fixture,
      screens: [
        {
          ...screen,
          root: {
            ...screen.root,
            children: [
              { id: "dashboard-root", type: "text", props: { content: "dup" }, children: [] },
            ],
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(hasCode(result.issues, "duplicate_node_id")).toBe(true);
  });

  it("does not accept governance state fields on UXSpec", () => {
    const result = loadUXSpec({
      ...createValidUXSpecFixture(),
      approvals: [{ screenId: "screen-dashboard", status: "approved" }],
    });
    expect(result.ok).toBe(false);
  });
});
