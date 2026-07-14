import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

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
  webServer: {
    command: isCI
      ? "pnpm exec vite preview --host 127.0.0.1 --port 4173"
      : "pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 4173",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
