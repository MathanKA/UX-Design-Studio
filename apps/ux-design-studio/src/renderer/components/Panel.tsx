import type { RegisteredComponentProps } from "../context/render-context";
import type { PanelProps } from "../registry/prop-schemas";
import styles from "../styles/primitives.module.css";

export function PanelComponent({
  props,
  children,
}: RegisteredComponentProps<PanelProps>) {
  return (
    <section className={styles.panel} aria-label={props.title}>
      <h2 className={styles.panelTitle}>{props.title}</h2>
      {children}
    </section>
  );
}
