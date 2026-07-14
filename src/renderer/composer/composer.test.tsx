import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ComponentNode } from "../../domain/ux-spec";
import { UX_SPEC_LIMITS } from "../../domain/ux-spec";
import { agentPilotSeed } from "../../infrastructure/seed";
import { createActionResolver } from "../actions/create-action-resolver";
import { createNoopRenderContext } from "../context/render-context";
import { createComponentRegistry } from "../registry/create-registry";
import type { ComponentRegistry, RegisteredComponent } from "../registry/types";
import { RecursiveComposer } from "./RecursiveComposer";
import { ScreenComposer } from "./ScreenComposer";

function nest(depth: number): ComponentNode {
  if (depth === 0) {
    return {
      id: `leaf-${depth}`,
      type: "text",
      props: { content: "deep leaf" },
    };
  }
  return {
    id: `stack-${depth}`,
    type: "stack",
    props: { gap: "md" },
    children: [nest(depth - 1)],
  };
}

function throwingRegistry(): ComponentRegistry {
  const base = createComponentRegistry();
  const button = base.get("button");
  if (!button) {
    throw new Error("missing button");
  }
  const boom: RegisteredComponent = {
    ...button,
    Component: () => {
      throw new Error("boom");
    },
  };
  return new Map(base).set("button", boom);
}

describe("recursive composer and actions", () => {
  const registry = createComponentRegistry();

  it("recursively composes nested children with stable node ids", () => {
    const node: ComponentNode = {
      id: "root",
      type: "stack",
      props: { gap: "md" },
      children: [
        {
          id: "child-text",
          type: "text",
          props: { content: "Nested", variant: "heading" },
        },
      ],
    };

    render(
      <RecursiveComposer
        node={node}
        registry={registry}
        context={createNoopRenderContext()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Nested" })).toBeInTheDocument();
  });

  it("enforces the maximum tree depth guard", () => {
    const deep = nest(UX_SPEC_LIMITS.maxTreeDepth + 2);
    render(
      <RecursiveComposer
        node={deep}
        registry={registry}
        context={createNoopRenderContext()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Tree depth limit reached");
  });

  it("renders unknown and invalid prop fallbacks without blanking siblings", () => {
    const node: ComponentNode = {
      id: "root",
      type: "stack",
      props: {},
      children: [
        { id: "ok", type: "text", props: { content: "Still visible" } },
        { id: "bad-type", type: "magicWidget", props: {} },
        { id: "bad-props", type: "text", props: { content: 123 } },
      ],
    };

    render(
      <RecursiveComposer
        node={node}
        registry={registry}
        context={createNoopRenderContext()}
      />,
    );

    expect(screen.getByText("Still visible")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Unsupported component");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid component props");
  });

  it("isolates node render errors from siblings", () => {
    const node: ComponentNode = {
      id: "root",
      type: "stack",
      props: {},
      children: [
        { id: "ok", type: "text", props: { content: "Sibling ok" } },
        {
          id: "boom",
          type: "button",
          props: { label: "Will throw" },
        },
      ],
    };

    render(
      <RecursiveComposer
        node={node}
        registry={throwingRegistry()}
        context={createNoopRenderContext()}
      />,
    );

    expect(screen.getByText("Sibling ok")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Component render error");
  });

  it("refuses unsupported children for leaf components", () => {
    const node: ComponentNode = {
      id: "leaf-with-kids",
      type: "text",
      props: { content: "Leaf" },
      children: [{ id: "x", type: "text", props: { content: "nope" } }],
    };

    render(
      <RecursiveComposer
        node={node}
        registry={registry}
        context={createNoopRenderContext()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "does not accept children",
    );
  });

  it("resolves known navigate actions and no-ops unknown actions", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const onUnknownAction = vi.fn();
    const known = new Set(agentPilotSeed.screens.map((screen) => screen.id));
    const resolver = createActionResolver(known, {
      navigate,
      onUnknownAction,
    });

    resolver.resolve({ type: "navigate", targetScreenId: "screen-login" });
    expect(navigate).toHaveBeenCalledWith("screen-login");

    resolver.resolve({ type: "navigate", targetScreenId: "screen-missing" });
    resolver.resolve({ type: "explode", payload: "x" });
    resolver.resolve({ onClick: "alert(1)" });
    expect(onUnknownAction).toHaveBeenCalled();

    const context = createNoopRenderContext({
      dispatchAction: (action) => resolver.resolve(action),
    });

    render(
      <RecursiveComposer
        node={{
          id: "btn",
          type: "button",
          props: {
            label: "Go login",
            action: { type: "navigate", screenId: "screen-login" },
          },
        }}
        registry={registry}
        context={context}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Go login" }));
    expect(navigate).toHaveBeenCalledWith("screen-login");
  });

  it("renders all five seed screens through the same composer path", () => {
    expect(agentPilotSeed.screens).toHaveLength(5);

    for (const screen of agentPilotSeed.screens) {
      const { unmount } = render(
        <ScreenComposer
          screen={screen}
          registry={registry}
          context={createNoopRenderContext({ screenId: screen.id })}
        />,
      );
      expect(document.body.textContent?.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("does not include page-specific screen modules or switch branches", async () => {
    const modules = import.meta.glob("../../features/**/*Screen*.tsx");
    expect(Object.keys(modules)).toEqual([]);

    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = await import("node:path");
    const source = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "RecursiveComposer.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/screen-dashboard|screen-login|switch\s*\(/);
  });
});
