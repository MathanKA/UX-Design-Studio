import {
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { StudioIcon } from "../../ui/icons";
import styles from "./ReviewSidePanelTabs.module.css";

export type ReviewSidePanelTabId =
  | "decision"
  | "persona"
  | "journey"
  | "history"
  | "a11y";

export type ReviewSidePanelTab = {
  id: ReviewSidePanelTabId;
  label: string;
  panel: ReactNode;
};

const TAB_ICONS: Record<ReviewSidePanelTabId, string> = {
  decision: "decision",
  persona: "user",
  journey: "journey",
  history: "history",
  a11y: "a11y",
};

type ReviewSidePanelTabsProps = {
  tabs: readonly ReviewSidePanelTab[];
  defaultTabId?: ReviewSidePanelTabId;
};

export function ReviewSidePanelTabs({
  tabs,
  defaultTabId = "decision",
}: ReviewSidePanelTabsProps) {
  const baseId = useId();
  const initial =
    tabs.find((tab) => tab.id === defaultTabId)?.id ?? tabs[0]?.id ?? "decision";
  const [activeTabId, setActiveTabId] = useState<ReviewSidePanelTabId>(initial);

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeTabId),
  );
  const resolvedActiveId = tabs[activeIndex]?.id ?? initial;

  const activateByIndex = (index: number) => {
    const next = tabs[index];
    if (!next) {
      return;
    }
    setActiveTabId(next.id);
    const button = document.getElementById(`${baseId}-tab-${next.id}`);
    button?.focus();
  };

  const onTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (tabs.length === 0) {
      return;
    }
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    activateByIndex(nextIndex);
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.root}
      data-testid="review-side-panel-tabs"
      data-workbench-region="side-panel-tabs"
      data-active-tab={resolvedActiveId}
    >
      <div
        className={styles.tabList}
        role="tablist"
        aria-label="Review panels"
        data-testid="review-side-panel-tablist"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === resolvedActiveId;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              className={selected ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              data-side-panel-tab={tab.id}
              onClick={() => {
                setActiveTabId(tab.id);
              }}
              onKeyDown={(event) => {
                onTabKeyDown(event, index);
              }}
            >
              <span className={styles.tabIcon} aria-hidden="true">
                <StudioIcon name={TAB_ICONS[tab.id]} size={17} />
              </span>
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => {
        const selected = tab.id === resolvedActiveId;
        return (
          <div
            key={tab.id}
            id={`${baseId}-panel-${tab.id}`}
            role="tabpanel"
            className={styles.tabPanel}
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            hidden={!selected}
            data-side-panel-tabpanel={tab.id}
            data-side-panel-active={selected ? "true" : "false"}
          >
            {tab.panel}
          </div>
        );
      })}
    </div>
  );
}
