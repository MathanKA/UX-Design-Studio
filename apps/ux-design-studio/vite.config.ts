import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import mfConfig from "./module-federation.config";

export default defineConfig({
  plugins: [react(), federation(mfConfig)],
  server: {
    port: 5173,
    origin: "http://127.0.0.1:5173",
    cors: true,
  },
  preview: {
    port: 4174,
    cors: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "chrome89",
    modulePreload: false,
  },
});
