import type { RegisteredComponentProps } from "../context/render-context";
import type { GridProps } from "../registry/prop-schemas";
import { cssClass } from "../styles/css-class";
import styles from "../styles/primitives.module.css";

const columnClass: Record<GridProps["columns"], string> = {
  1: cssClass(styles.cols1, "cols1"),
  2: cssClass(styles.cols2, "cols2"),
  3: cssClass(styles.cols3, "cols3"),
  4: cssClass(styles.cols4, "cols4"),
};

export function GridComponent({
  props,
  children,
}: RegisteredComponentProps<GridProps>) {
  return (
    <div
      className={`${cssClass(styles.grid, "grid")} ${columnClass[props.columns]}`}
    >
      {children}
    </div>
  );
}
