import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const baseURL = externalBaseURL || "http://127.0.0.1:4173";
const useExternalServer = Boolean(externalBaseURL);

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
    baseURL,
    trace: isCI ? "on" : "retain-on-failure",
    video: isCI ? "on" : "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Local / CI default: build (non-CI) and serve Vite preview on 4173.
  // When PLAYWRIGHT_BASE_URL is set, target that deployment and do not start webServer.
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: isCI
            ? "pnpm --filter @uxds/studio exec vite preview --host 127.0.0.1 --port 4173"
            : "pnpm --filter @uxds/studio build && pnpm --filter @uxds/studio exec vite preview --host 127.0.0.1 --port 4173",
          url: baseURL,
          reuseExistingServer: !isCI,
          timeout: 180_000,
        },
      }),
});
