import { expect, test, type ConsoleMessage, type Page, type Response } from "@playwright/test";
import path from "node:path";

const GOVERNANCE_STORAGE_KEY =
  "uxds:v1:project-agentpilot:spec-agentpilot:1.0.0";

const SCREEN_NAMES = [
  "Dashboard",
  "Login",
  "Task Detail",
  "Workflow Templates",
  "Reports Export",
] as const;

const EVIDENCE_DIR = path.join("test-results", "evidence");

type ConsoleGuard = {
  assertClean: () => void;
};

function installConsoleGuard(page: Page): ConsoleGuard {
  const unexpected: string[] = [];

  page.on("console", (message: ConsoleMessage) => {
    if (message.type() !== "error") {
      return;
    }
    const text = message.text();
    // Understood browser noise: none currently allowlisted. Document additions here.
    unexpected.push(`console.error: ${text}`);
  });

  page.on("pageerror", (error) => {
    unexpected.push(`pageerror: ${error.message}`);
  });

  page.on("response", (response: Response) => {
    const url = response.url();
    if (!url.startsWith("http://127.0.0.1:4173") && !url.startsWith("http://localhost:4173")) {
      return;
    }
    const status = response.status();
    // Understood browser noise: successful responses and cache revalidation.
    if (response.ok() || status === 304) {
      return;
    }
    // Understood browser noise: missing favicon and source maps in preview.
    if (status === 404 && /favicon|sourcemap|\.map$/i.test(url)) {
      return;
    }
    unexpected.push(`resource ${status}: ${url}`);
  });

  return {
    assertClean: () => {
      expect(unexpected, unexpected.join("\n")).toEqual([]);
    },
  };
}

async function resetManagedGovernanceKey(page: Page): Promise<void> {
  await page.goto("/overview");
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, GOVERNANCE_STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
}

async function selectApprover(page: Page): Promise<void> {
  const roleGroup = page.getByRole("radiogroup", { name: "POC demo role" }).first();
  const approver = roleGroup.getByRole("radio", { name: /demo approver/i });
  await approver.check();
  await expect(approver).toBeChecked();
}

async function approveAllScreens(page: Page): Promise<void> {
  for (const [index, name] of SCREEN_NAMES.entries()) {
    await page.getByRole("link", { name: `Open ${name} review` }).click();
    await expect(page.getByRole("heading", { name: "Screen review" })).toBeVisible();
    await page.getByRole("button", { name: /approve current version/i }).click();
    await expect(page.locator('[data-decision="status"]')).toHaveText("Approved");
    if (index < SCREEN_NAMES.length - 1) {
      await page.getByRole("link", { name: "Overview" }).click();
      await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
    }
  }
  await expect(page.locator('[data-decision="gate-readiness"]')).toHaveAttribute(
    "data-gate-complete",
    "true",
  );
}

async function requestDashboardRevision(page: Page): Promise<void> {
  const form = page.getByTestId("revision-form");
  await form.getByLabel(/dashboard-title \(text\)/i).check();
  await page.getByLabel(/revision category/i).selectOption("layout");
  await page
    .getByLabel(/revision description/i)
    .fill("Please revise the dashboard title hierarchy for regeneration.");
  await page.getByRole("button", { name: /request revision/i }).click();
  await expect(page.locator('[data-decision="status"]')).toHaveText("Changes requested");
  await expect(page.getByRole("button", { name: /^regenerate$/i })).toBeEnabled();
}

async function captureEvidence(page: Page, filename: string): Promise<void> {
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    fullPage: true,
  });
}

test.describe("Epic 5 release smoke", () => {
  test("controlled failure, regenerate, reapprove, a11y overlay, reload", async ({
    page,
  }) => {
    const guard = installConsoleGuard(page);

    await resetManagedGovernanceKey(page);
    await selectApprover(page);

    await page.getByRole("link", { name: "Open Dashboard review" }).click();
    await expect(page.getByRole("heading", { name: "Screen review" })).toBeVisible();
    await expect(page.locator('[data-decision="screen-name"]')).toHaveText("Dashboard");
    await expect(page.locator('[data-decision="screen-version"]')).toHaveText(
      "sv-screen-dashboard-baseline",
    );
    await expect(page.locator('[data-decision="status"]')).toHaveText("Not reviewed");

    await page.getByRole("link", { name: "Overview" }).click();
    await approveAllScreens(page);

    await page.getByRole("link", { name: "Overview" }).click();
    await page.getByRole("link", { name: "Open Dashboard review" }).click();
    await expect(page.locator('[data-decision="status"]')).toHaveText("Approved");
    await expect(page.locator('[data-decision="gate-readiness"]')).toHaveAttribute(
      "data-gate-complete",
      "true",
    );

    await requestDashboardRevision(page);

    const failureToggle = page.getByLabel(/simulate controlled provider failure/i);
    await failureToggle.check();
    await expect(failureToggle).toBeChecked();

    await page.getByRole("button", { name: /^regenerate$/i }).click();
    await expect(page.getByText(/regenerating dashboard/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /regenerating/i })).toBeVisible();
    await expect(page.getByText(/simulated controlled provider failure/i)).toBeVisible();
    await expect(page.locator('[data-decision="screen-version"]')).toHaveText(
      "sv-screen-dashboard-baseline",
    );
    await expect(page.locator('[data-decision="gate-readiness"]')).toHaveAttribute(
      "data-gate-complete",
      "false",
    );
    await expect(
      page.getByRole("heading", { name: "Priority operations view" }),
    ).toHaveCount(0);
    await captureEvidence(page, "01-controlled-failure.png");

    if (await failureToggle.isChecked()) {
      await failureToggle.uncheck();
    }
    await expect(failureToggle).not.toBeChecked();

    const retryOrRegenerate = page
      .getByRole("button", { name: /retry regenerate|^regenerate$/i })
      .first();
    await retryOrRegenerate.click();
    await expect(page.getByText(/regenerating dashboard/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /regenerating/i })).toBeVisible();
    await expect(page.getByText(/regenerated to version/i)).toBeVisible();
    await expect(page.locator('[data-decision="status"]')).toHaveText("Ready for review");
    await expect(
      page.getByRole("heading", { name: "Priority operations view" }),
    ).toBeVisible();
    await expect(page.locator('[data-decision="screen-version"]')).not.toHaveText(
      "sv-screen-dashboard-baseline",
    );
    await captureEvidence(page, "02-regenerated-dashboard.png");

    const history = page.getByTestId("version-history-panel");
    await expect(history).toHaveAttribute("data-version-count", "2");
    await expect(history.locator('[data-version-marker="current"]')).toBeVisible();
    await expect(history.locator('[data-version-source="baseline"]')).toBeVisible();
    await expect(history.locator('[data-version-source="regenerated"]')).toBeVisible();
    await expect(history.locator("[data-version-created]").first()).toBeVisible();
    await expect(
      history.locator('[data-version-approval="historical"]'),
    ).toBeVisible();
    await expect(history.getByText(/historical approval/i)).toBeVisible();
    await captureEvidence(page, "03-version-history.png");

    await expect(page.getByRole("button", { name: /approve current version/i })).toBeEnabled();
    await expect(page.locator('[data-decision="gate-readiness"]')).toHaveAttribute(
      "data-gate-complete",
      "false",
    );
    await expect(page.getByText(/agile plan generation unavailable/i)).toBeVisible();

    await page.getByRole("button", { name: /approve current version/i }).click();
    await expect(page.locator('[data-decision="status"]')).toHaveText("Approved");
    await expect(page.locator('[data-decision="gate-readiness"]')).toHaveAttribute(
      "data-gate-complete",
      "true",
    );
    await expect(page.locator('[data-decision="gate-readiness"]')).toHaveText(
      /ready for agile plan generation/i,
    );
    await captureEvidence(page, "04-reapproval-restored.png");

    const overlayPanel = page.getByTestId("accessibility-overlay-panel");
    const overlayToggle = overlayPanel.getByRole("button", {
      name: /accessibility overlay/i,
    });
    await overlayToggle.focus();
    await expect(overlayToggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(overlayToggle).toHaveAttribute("aria-pressed", "true");
    await expect(overlayPanel).toHaveAttribute("data-overlay-active", "true");
    await expect(overlayPanel.getByText(/not a WCAG certification/i)).toBeVisible();

    const markers = overlayPanel.getByRole("button", {
      name: /contrast|aria|screen reader|keyboard|requirement/i,
    });
    await expect(markers.first()).toBeVisible();
    await expect
      .poll(async () => markers.count())
      .toBeGreaterThan(3);

    await markers.first().focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-overlay-details]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-overlay-details]")).toHaveCount(0);
    await expect(overlayToggle).toBeFocused();

    await expect(
      page.getByRole("heading", { name: "Priority operations view" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Overview" })).toBeEnabled();
    await captureEvidence(page, "05-accessibility-overlay.png");

    const regeneratedVersion = await page
      .locator('[data-decision="screen-version"]')
      .innerText();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Screen review" })).toBeVisible();
    await expect(page.locator('[data-decision="screen-version"]')).toHaveText(
      regeneratedVersion,
    );
    await expect(
      page.getByRole("heading", { name: "Priority operations view" }),
    ).toBeVisible();
    await expect(page.getByTestId("version-history-panel")).toHaveAttribute(
      "data-version-count",
      "2",
    );
    await expect(page.locator('[data-decision="status"]')).toHaveText("Approved");
    await expect(page.locator('[data-decision="gate-readiness"]')).toHaveAttribute(
      "data-gate-complete",
      "true",
    );
    await captureEvidence(page, "06-reload-persistence.png");

    guard.assertClean();
  });
});
