import type { RegisteredComponentProps } from "../context/render-context";
import type { TextProps } from "../registry/prop-schemas";
import styles from "../styles/primitives.module.css";

export function TextComponent({ props }: RegisteredComponentProps<TextProps>) {
  const variant = props.variant ?? "body";
  if (variant === "heading") {
    return <h3 className={`${styles.text} ${styles.textHeading}`}>{props.content}</h3>;
  }
  if (variant === "caption") {
    return <p className={`${styles.text} ${styles.textCaption}`}>{props.content}</p>;
  }
  return <p className={styles.text}>{props.content}</p>;
}
