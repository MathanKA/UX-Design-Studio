import type { RegisteredComponentProps } from "../context/render-context";
import type { ButtonProps } from "../registry/prop-schemas";
import styles from "../styles/primitives.module.css";

export function ButtonComponent({
  props,
  context,
}: RegisteredComponentProps<ButtonProps>) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => {
        if (props.action) {
          context.dispatchAction(props.action);
        }
      }}
    >
      {props.label}
    </button>
  );
}
