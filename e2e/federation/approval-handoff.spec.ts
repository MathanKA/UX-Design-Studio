import { expect, test } from "@playwright/test";

const GOVERNANCE_STORAGE_KEY =
  "uxds:v1:project-agentpilot:spec-agentpilot:1.0.0";

const SCREEN_IDS = [
  "screen-dashboard",
  "screen-login",
  "screen-task-detail",
  "screen-workflow-templates",
  "screen-reports-export",
] as const;

test.describe("federated approval handoff", () => {
  test("navigates to Agile Editor after a new gate completion", async ({ page }) => {
    await page.goto("/projects/project-agentpilot/ux-design-studio/overview");
    await page.evaluate((key) => {
      window.localStorage.removeItem(key);
    }, GOVERNANCE_STORAGE_KEY);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible({
      timeout: 60_000,
    });

    for (const [index, screenId] of SCREEN_IDS.entries()) {
      await page.goto(
        `/projects/project-agentpilot/ux-design-studio/review/${screenId}`,
      );
      await expect(page.getByRole("heading", { name: "Screen review" })).toBeVisible({
        timeout: 60_000,
      });
      await page.getByRole("tab", { name: "Decision" }).click();
      await page.getByRole("button", { name: /approve current version/i }).click();

      if (index < SCREEN_IDS.length - 1) {
        await expect(page.locator('[data-decision="status"]')).toHaveText("Approved");
      }
    }

    await expect(page).toHaveURL(/\/projects\/project-agentpilot\/agile-editor$/, {
      timeout: 30_000,
    });
    await expect(page.getByTestId("agile-editor-page")).toContainText(/UX Design approved/i);
    await expect(page.getByText(/Ready for Agile plan generation/i)).toBeVisible();
  });
});
