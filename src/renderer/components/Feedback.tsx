import type { RegisteredComponentProps } from "../context/render-context";
import type { FeedbackProps } from "../registry/prop-schemas";
import { cssClass } from "../styles/css-class";
import styles from "../styles/primitives.module.css";

const toneClass: Record<FeedbackProps["tone"], string> = {
  info: cssClass(styles.toneInfo, "toneInfo"),
  success: cssClass(styles.toneSuccess, "toneSuccess"),
  warning: cssClass(styles.toneWarning, "toneWarning"),
  danger: cssClass(styles.toneDanger, "toneDanger"),
};

export function FeedbackComponent({
  props,
}: RegisteredComponentProps<FeedbackProps>) {
  return (
    <div
      className={`${cssClass(styles.feedback, "feedback")} ${toneClass[props.tone]}`}
      role="status"
    >
      {props.message}
    </div>
  );
}
