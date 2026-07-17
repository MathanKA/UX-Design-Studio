import {
  parseUxDesignStudioRemoteProps,
  type UxDesignStudioRemoteProps,
} from "@uxds/host-contract";
import { UxDesignStudioApp } from "../app/UxDesignStudioApp";
import { ShellStatePanel } from "../ui/states";
import remoteRootStyles from "./RemoteRoot.module.css";
import "../styles/remote-root.css";

function IntegrationError({ message }: { message: string }) {
  return (
    <div className="uxdsRemoteRoot" data-testid="uxds-integration-error">
      <ShellStatePanel
        title="UX Design Studio unavailable"
        tone="danger"
        role="alert"
      >
        {message}
      </ShellStatePanel>
    </div>
  );
}

/**
 * Module Federation remote entry. Does not create a React root or BrowserRouter.
 */
export default function UxDesignStudioRemote(props: UxDesignStudioRemoteProps) {
  const parsed = parseUxDesignStudioRemoteProps(props);
  if (!parsed.ok) {
    return (
      <IntegrationError message="The host integration contract is invalid for this demo remote." />
    );
  }

  const contract = parsed.value;
  if (contract.baselineVersion !== "1.0.0") {
    return (
      <IntegrationError message="This demo remote only supports baseline version 1.0.0." />
    );
  }

  return (
    <div
      className={`uxdsRemoteRoot ${remoteRootStyles.root}`}
      data-testid="uxds-remote-root"
    >
      <UxDesignStudioApp
        mode="embedded"
        basePath={contract.basePath}
        actor={contract.actor}
        projectId={contract.projectId}
        baselineVersion={contract.baselineVersion}
        {...(contract.onGateStatusChange
          ? { onGateStatusChange: contract.onGateStatusChange }
          : {})}
        {...(contract.onNavigateToAgileEditor
          ? { onNavigateToAgileEditor: contract.onNavigateToAgileEditor }
          : {})}
      />
    </div>
  );
}
