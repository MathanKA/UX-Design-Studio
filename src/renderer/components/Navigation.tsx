import type { RegisteredComponentProps } from "../context/render-context";
import type { NavigationProps } from "../registry/prop-schemas";
import styles from "../styles/primitives.module.css";

export function NavigationComponent({
  props,
  context,
}: RegisteredComponentProps<NavigationProps>) {
  return (
    <nav aria-label="Screen navigation">
      <ul
        className={`${styles.nav} ${
          props.orientation === "vertical" ? styles.navVertical : ""
        }`}
      >
        {props.items.map((item) => (
          <li key={`${item.screenId}-${item.label}`}>
            <button
              type="button"
              className={styles.navLink}
              onClick={() =>
                context.dispatchAction({
                  type: "navigate",
                  targetScreenId: item.screenId,
                })
              }
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
