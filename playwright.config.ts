import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const useExternalServer = Boolean(externalBaseURL);
const remoteURL = "http://127.0.0.1:4174";
const hostURL = externalBaseURL || "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : 1,
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  reporter: isCI
    ? [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ]
    : [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ],
  outputDir: "test-results",
  use: {
    trace: isCI ? "on" : "retain-on-failure",
    video: isCI ? "on" : "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "standalone",
      testDir: "./e2e/standalone",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: remoteURL,
      },
    },
    {
      name: "federation",
      testDir: "./e2e/federation",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: hostURL,
      },
    },
  ],
  ...(useExternalServer
    ? {}
    : {
        webServer: [
          {
            command: isCI
              ? "pnpm --filter @uxds/studio exec vite preview --host 127.0.0.1 --port 4174"
              : "pnpm --filter @uxds/studio build && pnpm --filter @uxds/studio exec vite preview --host 127.0.0.1 --port 4174",
            url: remoteURL,
            reuseExistingServer: !isCI,
            timeout: 180_000,
          },
          {
            command: isCI
              ? "pnpm --filter @uxds/host exec vite preview --host 127.0.0.1 --port 4173"
              : "VITE_UXDS_REMOTE_ENTRY=http://127.0.0.1:4174/remoteEntry.js pnpm --filter @uxds/host build && VITE_UXDS_REMOTE_ENTRY=http://127.0.0.1:4174/remoteEntry.js pnpm --filter @uxds/host exec vite preview --host 127.0.0.1 --port 4173",
            url: hostURL,
            reuseExistingServer: !isCI,
            timeout: 180_000,
            env: {
              ...process.env,
              VITE_UXDS_REMOTE_ENTRY: "http://127.0.0.1:4174/remoteEntry.js",
            },
          },
        ],
      }),
});
