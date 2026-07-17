import type { RegisteredComponentProps } from "../context/render-context";
import type { SelectProps } from "../registry/prop-schemas";
import styles from "../styles/primitives.module.css";

export function SelectComponent({
  nodeId,
  props,
}: RegisteredComponentProps<SelectProps>) {
  const selectId = `${nodeId}-select`;
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={selectId}>
        {props.label}
      </label>
      <select id={selectId} className={styles.control} defaultValue={props.options[0]}>
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
