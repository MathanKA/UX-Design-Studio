import type { RegisteredComponentProps } from "../context/render-context";
import type { StackProps } from "../registry/prop-schemas";
import { cssClass } from "../styles/css-class";
import styles from "../styles/primitives.module.css";

const gapClass: Record<NonNullable<StackProps["gap"]>, string> = {
  xs: cssClass(styles.gapXs, "gapXs"),
  sm: cssClass(styles.gapSm, "gapSm"),
  md: cssClass(styles.gapMd, "gapMd"),
  lg: cssClass(styles.gapLg, "gapLg"),
  xl: cssClass(styles.gapXl, "gapXl"),
};

export function StackComponent({
  props,
  children,
}: RegisteredComponentProps<StackProps>) {
  const className = [
    cssClass(styles.stack, "stack"),
    props.direction === "row" ? cssClass(styles.stackRow, "stackRow") : "",
    props.gap ? gapClass[props.gap] : cssClass(styles.gapMd, "gapMd"),
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={className}>{children}</div>;
}
