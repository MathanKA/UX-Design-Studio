import { screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import type { ReviewSidePanelTabId } from "./ReviewSidePanelTabs";

const TAB_LABELS: Record<ReviewSidePanelTabId, string> = {
  decision: "Decision",
  persona: "Persona",
  journey: "Journey",
  history: "History",
  a11y: "A11y",
};

export async function activateSidePanelTab(
  user: UserEvent,
  tabId: ReviewSidePanelTabId,
): Promise<void> {
  const tablist = screen.getByRole("tablist", { name: "Review panels" });
  const tab = within(tablist).getByRole("tab", { name: TAB_LABELS[tabId] });
  if (tab.getAttribute("aria-selected") === "true") {
    return;
  }
  await user.click(tab);
}
