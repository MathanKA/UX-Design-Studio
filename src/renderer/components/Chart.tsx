import type { RegisteredComponentProps } from "../context/render-context";
import type { ChartProps } from "../registry/prop-schemas";
import styles from "../styles/primitives.module.css";

export function ChartComponent({
  props,
}: RegisteredComponentProps<ChartProps>) {
  return (
    <figure className={styles.chart} aria-label={props.title}>
      <figcaption className={styles.chartTitle}>{props.title}</figcaption>
      <p className={styles.chartPlaceholder}>
        Chart placeholder ({props.chartType}). No charting library is loaded.
      </p>
    </figure>
  );
}
