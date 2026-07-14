import type { RegisteredComponentProps } from "../context/render-context";
import type { DataTableProps } from "../registry/prop-schemas";
import styles from "../styles/primitives.module.css";

export function DataTableComponent({
  props,
}: RegisteredComponentProps<DataTableProps>) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption>{props.caption}</caption>
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {props.columns.map((column) => (
              <td key={`${column}-empty`}>—</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
