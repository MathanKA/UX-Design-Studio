import { cssClass } from "../styles/css-class";
import styles from "../styles/composer.module.css";

type DepthGuardFallbackProps = {
  nodeId: string;
  depth: number;
  maxDepth: number;
};

export function DepthGuardFallback({
  nodeId,
  depth,
  maxDepth,
}: DepthGuardFallbackProps) {
  return (
    <div className={cssClass(styles.depthGuard, "depthGuard")} role="alert">
      <p className={cssClass(styles.title, "title")}>Tree depth limit reached</p>
      <p className={cssClass(styles.detail, "detail")}>
        Node {nodeId} stopped at depth {depth} (max {maxDepth}).
      </p>
    </div>
  );
}
