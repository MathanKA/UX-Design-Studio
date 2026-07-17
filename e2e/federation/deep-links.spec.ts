import { expect, test } from "@playwright/test";

test.describe("federated deep links", () => {
  test("opens overview, review, and audit under the host project path", async ({
    page,
  }) => {
    await page.goto("/projects/project-agentpilot/ux-design-studio/overview");
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page).toHaveURL(/\/projects\/project-agentpilot\/ux-design-studio\/overview$/);

    await page.getByRole("link", { name: /Open Dashboard review/i }).click();
    await expect(page).toHaveURL(
      /\/projects\/project-agentpilot\/ux-design-studio\/review\/screen-dashboard$/,
    );
    await expect(page.getByRole("heading", { name: "Screen review" })).toBeVisible();

    await page.getByRole("link", { name: "Audit" }).click();
    await expect(page).toHaveURL(/\/projects\/project-agentpilot\/ux-design-studio\/audit$/);
    await expect(page.getByRole("heading", { name: /Audit/i })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(
      /\/projects\/project-agentpilot\/ux-design-studio\/review\/screen-dashboard$/,
    );
  });
});
