import styles from "../styles/fallbacks.module.css";

type InvalidPropsFallbackProps = {
  nodeId: string;
  componentType: string;
  message: string;
};

export function InvalidPropsFallback({
  nodeId,
  componentType,
  message,
}: InvalidPropsFallbackProps) {
  return (
    <div className={styles.fallback} role="alert">
      <p className={styles.fallbackTitle}>Invalid component props</p>
      <p className={styles.fallbackDetail}>
        Node {nodeId} ({componentType}) could not be rendered safely.
      </p>
      <p className={styles.fallbackDetail}>{message}</p>
    </div>
  );
}
