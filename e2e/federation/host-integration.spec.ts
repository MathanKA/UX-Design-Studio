import { expect, test } from "@playwright/test";

const STUDIO_PATH = "/projects/project-agentpilot/ux-design-studio/overview";

test.describe("federated host integration", () => {
  test("loads the remote under the host project shell", async ({ page }) => {
    await page.goto(STUDIO_PATH);

    await expect(page.getByTestId("host-project-shell")).toBeVisible();
    await expect(page.getByText("Simulated integration host")).toBeVisible();
    await expect(page.getByRole("link", { name: "UX Design" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText(/InsaneSDD/i)).toHaveCount(0);

    await expect(page.getByTestId("federated-uxds-pane")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("studio-standalone-header")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("host-gate-status")).toContainText(/in review/i);
  });

  test("keeps host navigation usable for placeholder routes", async ({ page }) => {
    await page.goto("/projects/project-agentpilot/overview");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.getByRole("link", { name: "Agile Editor" }).click();
    await expect(page.getByTestId("agile-editor-page")).toBeVisible();
    await expect(page.getByText(/Simulated host page/i)).toBeVisible();
  });

  test("rejects unsupported project identities without reusing AgentPilot state", async ({
    page,
  }) => {
    await page.goto("/projects/project-other/ux-design-studio/overview");
    await expect(page.getByTestId("unsupported-project")).toBeVisible();
    await expect(page.getByText(/Unsupported project/i)).toBeVisible();
  });
});
