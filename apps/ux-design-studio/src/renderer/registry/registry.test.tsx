import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KNOWN_COMPONENT_TYPES } from "../../domain/ux-spec";
import { agentPilotSeed } from "../../infrastructure/seed";
import { createNoopRenderContext } from "../context/render-context";
import { InvalidPropsFallback } from "../fallbacks/InvalidPropsFallback";
import { UnknownComponent } from "../fallbacks/UnknownComponent";
import {
  createComponentRegistry,
  defaultComponentRegistry,
} from "./create-registry";
import { REGISTRY_MAX_TYPES, REGISTRY_MIN_TYPES } from "./types";

const rendererRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function collectTypes(
  node: { type: string; children?: readonly unknown[] },
  bucket: Set<string>,
): void {
  bucket.add(node.type);
  for (const child of node.children ?? []) {
    collectTypes(child as { type: string; children?: readonly unknown[] }, bucket);
  }
}

describe("allowlisted component registry", () => {
  it("stays within the 12-15 type cap and is an O(1) map", () => {
    const registry = createComponentRegistry();
    expect(registry.size).toBeGreaterThanOrEqual(REGISTRY_MIN_TYPES);
    expect(registry.size).toBeLessThanOrEqual(REGISTRY_MAX_TYPES);
    expect(registry).toBeInstanceOf(Map);
    expect(defaultComponentRegistry.size).toBe(registry.size);
  });

  it("registers every known seed type with a validator and child declaration", () => {
    const seedTypes = new Set<string>();
    for (const screen of agentPilotSeed.screens) {
      collectTypes(screen.root, seedTypes);
    }

    for (const type of KNOWN_COMPONENT_TYPES) {
      const entry = defaultComponentRegistry.get(type);
      expect(entry, type).toBeDefined();
      expect(typeof entry?.validateProps).toBe("function");
      expect(typeof entry?.acceptsChildren).toBe("boolean");
      expect(entry?.Component).toBeTypeOf("function");
    }

    for (const type of seedTypes) {
      expect(defaultComponentRegistry.has(type as never)).toBe(true);
    }
  });

  it("validates props per type and rejects invalid props", () => {
    const text = defaultComponentRegistry.get("text");
    expect(text?.validateProps({ content: "Hello" }).ok).toBe(true);
    expect(text?.validateProps({ content: 12 }).ok).toBe(false);

    const button = defaultComponentRegistry.get("button");
    const valid = button?.validateProps({
      label: "Go",
      action: { type: "navigate", screenId: "screen-dashboard" },
    });
    expect(valid?.ok).toBe(true);
    if (valid?.ok) {
      expect(valid.props).toMatchObject({
        label: "Go",
        action: { type: "navigate", targetScreenId: "screen-dashboard" },
      });
    }

    expect(
      button?.validateProps({
        label: "Bad",
        action: { type: "navigate" },
      }).ok,
    ).toBe(false);

    expect(
      button?.validateProps({
        label: "Exec",
        onClick: "alert(1)",
      }).ok,
    ).toBe(false);
  });

  it("renders accessible unknown and invalid fallbacks", () => {
    render(
      <UnknownComponent nodeId="node-x" componentType="magicWidget" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Unsupported component");
    expect(screen.getByRole("status")).toHaveTextContent("magicWidget");

    render(
      <InvalidPropsFallback
        nodeId="node-y"
        componentType="text"
        message="content is required"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid component props");
    expect(screen.getByRole("alert")).toHaveTextContent("content is required");
  });

  it("renders representative accessible primitives without evaluating executable content", () => {
    const context = createNoopRenderContext({
      screenId: "screen-dashboard",
      dispatchAction: vi.fn(),
    });

    const text = defaultComponentRegistry.get("text")!;
    const button = defaultComponentRegistry.get("button")!;
    const input = defaultComponentRegistry.get("input")!;
    const chart = defaultComponentRegistry.get("chart")!;

    const textProps = text.validateProps({
      content: "Operations",
      variant: "heading",
    });
    const buttonProps = button.validateProps({ label: "Create task" });
    const inputProps = input.validateProps({
      label: "Email",
      name: "email",
      inputType: "email",
    });
    const chartProps = chart.validateProps({
      chartType: "bar",
      title: "Throughput",
    });

    expect(textProps.ok && buttonProps.ok && inputProps.ok && chartProps.ok).toBe(
      true,
    );
    if (!textProps.ok || !buttonProps.ok || !inputProps.ok || !chartProps.ok) {
      return;
    }

    render(
      <>
        <text.Component
          nodeId="t1"
          props={textProps.props}
          context={context}
        />
        <button.Component
          nodeId="b1"
          props={buttonProps.props}
          context={context}
        />
        <input.Component
          nodeId="i1"
          props={inputProps.props}
          context={context}
        />
        <chart.Component
          nodeId="c1"
          props={chartProps.props}
          context={context}
        />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Operations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create task" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Throughput")).toHaveTextContent(
      "No charting library is loaded",
    );
  });

  it("does not import governance state into the registry layer", () => {
    const sources = [
      path.join(rendererRoot, "registry/create-registry.ts"),
      path.join(rendererRoot, "registry/prop-schemas.ts"),
      path.join(rendererRoot, "registry/types.ts"),
      path.join(rendererRoot, "components/Button.tsx"),
      path.join(rendererRoot, "components/Stack.tsx"),
      path.join(rendererRoot, "context/render-context.ts"),
    ].map((absolute) => readFileSync(absolute, "utf8"));

    for (const source of sources) {
      expect(source).not.toMatch(
        /from ["'].*governance|auditEvent|approvalStatus|ScreenReviewStatus/i,
      );
      expect(source).not.toMatch(/eval\(|dangerouslySetInnerHTML|new Function/);
    }
  });
});
