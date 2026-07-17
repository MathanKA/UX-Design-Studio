import type { RegisteredComponentProps } from "../context/render-context";
import type { StatusBadgeProps } from "../registry/prop-schemas";
import { cssClass } from "../styles/css-class";
import styles from "../styles/primitives.module.css";

const toneClass: Record<StatusBadgeProps["tone"], string> = {
  success: cssClass(styles.toneSuccess, "toneSuccess"),
  warning: cssClass(styles.toneWarning, "toneWarning"),
  danger: cssClass(styles.toneDanger, "toneDanger"),
  info: cssClass(styles.toneInfo, "toneInfo"),
  neutral: "",
};

export function StatusBadgeComponent({
  props,
}: RegisteredComponentProps<StatusBadgeProps>) {
  return (
    <div
      className={`${cssClass(styles.badge, "badge")} ${toneClass[props.tone]}`.trim()}
    >
      <span className={cssClass(styles.badgeLabel, "badgeLabel")}>
        {props.label}
      </span>
      <span className={cssClass(styles.badgeValue, "badgeValue")}>
        {props.value}
      </span>
    </div>
  );
}
