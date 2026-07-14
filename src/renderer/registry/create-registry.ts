import { KNOWN_COMPONENT_TYPES } from "../../domain/ux-spec";
import { StackComponent } from "../components/Stack";
import { GridComponent } from "../components/Grid";
import { PanelComponent } from "../components/Panel";
import { TextComponent } from "../components/Text";
import { ButtonComponent } from "../components/Button";
import { InputComponent } from "../components/Input";
import { SelectComponent } from "../components/Select";
import { NavigationComponent } from "../components/Navigation";
import { DataTableComponent } from "../components/DataTable";
import { StatusBadgeComponent } from "../components/StatusBadge";
import { FeedbackComponent } from "../components/Feedback";
import { ChartComponent } from "../components/Chart";
import {
  stackPropsSchema,
  gridPropsSchema,
  panelPropsSchema,
  textPropsSchema,
  buttonPropsSchema,
  inputPropsSchema,
  selectPropsSchema,
  navigationPropsSchema,
  dataTablePropsSchema,
  statusBadgePropsSchema,
  feedbackPropsSchema,
  chartPropsSchema,
  parseProps,
} from "./prop-schemas";
import type { ComponentRegistry, RegisteredComponent } from "./types";
import { REGISTRY_MAX_TYPES, REGISTRY_MIN_TYPES } from "./types";

function entry<P extends object>(
  definition: RegisteredComponent<P>,
): RegisteredComponent {
  return definition as unknown as RegisteredComponent;
}

export function createComponentRegistry(): ComponentRegistry {
  const entries: RegisteredComponent[] = [
    entry({
      type: "stack",
      acceptsChildren: true,
      validateProps: (input) => parseProps(stackPropsSchema, input),
      Component: StackComponent,
    }),
    entry({
      type: "grid",
      acceptsChildren: true,
      validateProps: (input) => parseProps(gridPropsSchema, input),
      Component: GridComponent,
    }),
    entry({
      type: "panel",
      acceptsChildren: true,
      validateProps: (input) => parseProps(panelPropsSchema, input),
      Component: PanelComponent,
    }),
    entry({
      type: "text",
      acceptsChildren: false,
      validateProps: (input) => parseProps(textPropsSchema, input),
      Component: TextComponent,
    }),
    entry({
      type: "button",
      acceptsChildren: false,
      validateProps: (input) => parseProps(buttonPropsSchema, input),
      Component: ButtonComponent,
    }),
    entry({
      type: "input",
      acceptsChildren: false,
      validateProps: (input) => parseProps(inputPropsSchema, input),
      Component: InputComponent,
    }),
    entry({
      type: "select",
      acceptsChildren: false,
      validateProps: (input) => parseProps(selectPropsSchema, input),
      Component: SelectComponent,
    }),
    entry({
      type: "navigation",
      acceptsChildren: false,
      validateProps: (input) => parseProps(navigationPropsSchema, input),
      Component: NavigationComponent,
    }),
    entry({
      type: "dataTable",
      acceptsChildren: false,
      validateProps: (input) => parseProps(dataTablePropsSchema, input),
      Component: DataTableComponent,
    }),
    entry({
      type: "statusBadge",
      acceptsChildren: false,
      validateProps: (input) => parseProps(statusBadgePropsSchema, input),
      Component: StatusBadgeComponent,
    }),
    entry({
      type: "feedback",
      acceptsChildren: false,
      validateProps: (input) => parseProps(feedbackPropsSchema, input),
      Component: FeedbackComponent,
    }),
    entry({
      type: "chart",
      acceptsChildren: false,
      validateProps: (input) => parseProps(chartPropsSchema, input),
      Component: ChartComponent,
    }),
  ];

  if (
    entries.length < REGISTRY_MIN_TYPES ||
    entries.length > REGISTRY_MAX_TYPES
  ) {
    throw new Error(
      `Registry size ${entries.length} is outside the ${REGISTRY_MIN_TYPES}-${REGISTRY_MAX_TYPES} cap.`,
    );
  }

  const map = new Map(
    entries.map((registered) => [registered.type, registered] as const),
  );

  for (const known of KNOWN_COMPONENT_TYPES) {
    if (!map.has(known)) {
      throw new Error(`Registry is missing known component type: ${known}`);
    }
  }

  return map;
}

export const defaultComponentRegistry = createComponentRegistry();
