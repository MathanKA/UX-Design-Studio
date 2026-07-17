import type { ComponentType } from "react";
import type { ComponentType as SpecComponentType } from "../../domain/ux-spec";
import type { RegisteredComponentProps } from "../context/render-context";

export type PropValidationResult<P extends object> =
  | { ok: true; props: P }
  | { ok: false; message: string };

export type RegisteredComponent<P extends object = object> = {
  type: SpecComponentType;
  validateProps: (input: unknown) => PropValidationResult<P>;
  Component: ComponentType<RegisteredComponentProps<P>>;
  acceptsChildren: boolean;
};

export type ComponentRegistry = ReadonlyMap<
  SpecComponentType,
  RegisteredComponent
>;

export const REGISTRY_MIN_TYPES = 12;
export const REGISTRY_MAX_TYPES = 15;
