import { createModuleFederationConfig } from "@module-federation/vite";

export default createModuleFederationConfig({
  name: "uxDesignStudio",
  filename: "remoteEntry.js",
  manifest: true,
  dts: false,
  exposes: {
    "./App": "./src/integration/UxDesignStudioRemote.tsx",
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
});
