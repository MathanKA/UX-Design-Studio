import { createModuleFederationConfig } from "@module-federation/vite";

const remoteEntry =
  process.env.VITE_UXDS_REMOTE_ENTRY ??
  "http://127.0.0.1:4174/remoteEntry.js";

export default createModuleFederationConfig({
  name: "insanesddHost",
  remotes: {
    uxDesignStudio: {
      type: "module",
      name: "uxDesignStudio",
      entry: remoteEntry,
    },
  },
  shared: {
    react: { singleton: true, requiredVersion: "^18.3.1" },
    "react/": { singleton: true, requiredVersion: "^18.3.1" },
    "react-dom": { singleton: true, requiredVersion: "^18.3.1" },
    "react-dom/": { singleton: true, requiredVersion: "^18.3.1" },
    "react-router": { singleton: true },
    "react-router/": { singleton: true },
    "react-router-dom": { singleton: true, requiredVersion: "^6.30.1" },
    "react-router-dom/": { singleton: true, requiredVersion: "^6.30.1" },
  },
  dts: false,
});
