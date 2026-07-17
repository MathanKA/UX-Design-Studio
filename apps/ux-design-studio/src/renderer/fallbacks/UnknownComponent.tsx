import styles from "../styles/fallbacks.module.css";

type UnknownComponentProps = {
  nodeId: string;
  componentType: string;
};

export function UnknownComponent({
  nodeId,
  componentType,
}: UnknownComponentProps) {
  return (
    <div className={styles.fallback} role="status">
      <p className={styles.fallbackTitle}>Unsupported component</p>
      <p className={styles.fallbackDetail}>
        Type “{componentType}” (node {nodeId}) is not in the allowlisted
        registry.
      </p>
    </div>
  );
}
