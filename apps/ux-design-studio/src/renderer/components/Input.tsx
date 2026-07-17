import type { RegisteredComponentProps } from "../context/render-context";
import type { InputProps } from "../registry/prop-schemas";
import styles from "../styles/primitives.module.css";

export function InputComponent({
  nodeId,
  props,
}: RegisteredComponentProps<InputProps>) {
  const inputId = `${nodeId}-${props.name}`;
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={inputId}>
        {props.label}
      </label>
      <input
        id={inputId}
        className={styles.control}
        name={props.name}
        type={props.inputType ?? "text"}
        autoComplete="off"
      />
    </div>
  );
}
