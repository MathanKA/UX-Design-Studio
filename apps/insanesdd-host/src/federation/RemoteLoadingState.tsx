import styles from "./federation.module.css";

export function RemoteLoadingState() {
  return (
    <div
      className={styles.panel}
      role="status"
      aria-live="polite"
      data-testid="remote-loading"
    >
      <h2>Loading UX Design Studio</h2>
      <p>Connecting to the federated remote module.</p>
    </div>
  );
}
