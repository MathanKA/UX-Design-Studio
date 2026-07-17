declare module "uxDesignStudio/App" {
  import type { ComponentType } from "react";
  import type { UxDesignStudioRemoteProps } from "@uxds/host-contract";

  const UxDesignStudioRemote: ComponentType<UxDesignStudioRemoteProps>;
  export default UxDesignStudioRemote;
}
