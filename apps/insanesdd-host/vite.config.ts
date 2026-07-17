import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import mfConfig from "./module-federation.config";

export default defineConfig({
  plugins: [react(), federation(mfConfig)],
  server: {
    port: 5174,
    origin: "http://127.0.0.1:5174",
  },
  preview: {
    port: 4173,
    cors: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "chrome89",
    modulePreload: false,
  },
});
