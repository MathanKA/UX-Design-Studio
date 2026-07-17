import { expect, test } from "@playwright/test";

test.describe("federated remote failure", () => {
  test("keeps the host shell usable when the remote entry is unavailable", async ({
    page,
  }) => {
    await page.route("**/remoteEntry.js", (route) =>
      route.fulfill({ status: 503, body: "unavailable" }),
    );

    await page.goto("/projects/project-agentpilot/ux-design-studio/overview");

    await expect(page.getByTestId("host-project-shell")).toBeVisible();
    await expect(page.getByTestId("remote-failure")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("alert")).toContainText(/UX Design Studio unavailable/i);
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

    await page.getByRole("link", { name: "Overview" }).first().click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });
});
