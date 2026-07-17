import { NavLink } from "react-router-dom";
import { useStudioRouting } from "../../app/studio-routing";
import type { NavigationItem, NavigationSpec, ScreenId } from "../../domain/ux-spec";
import type { ScreenReviewStatus } from "../../domain/governance";
import { cssClass } from "../../renderer/styles/css-class";
import { screenReviewStatusLabel } from "../governance/status-labels";
import { StudioIcon } from "../../ui/icons";
import styles from "./ReviewPage.module.css";

type GeneratedNavigationProps = {
  navigation: NavigationSpec;
  activeScreenId: ScreenId;
  knownScreenIds: ReadonlySet<ScreenId>;
  mode: "desktop" | "mobile";
  visible: boolean;
  screenStatuses?: ReadonlyMap<ScreenId, ScreenReviewStatus>;
  approvalProgress?: {
    approvedCount: number;
    totalRequired: number;
  };
};

function isValidTarget(
  item: NavigationItem,
  knownScreenIds: ReadonlySet<ScreenId>,
): boolean {
  return knownScreenIds.has(item.screenId);
}

function statusTone(
  status: ScreenReviewStatus | undefined,
): "approved" | "pending" | "attention" {
  if (status === "approved") {
    return "approved";
  }
  if (status === "changes_requested" || status === "ready_for_review") {
    return "attention";
  }
  return "pending";
}

export function GeneratedNavigation({
  navigation,
  activeScreenId,
  knownScreenIds,
  mode,
  visible,
  screenStatuses,
  approvalProgress,
}: GeneratedNavigationProps) {
  const { toStudio } = useStudioRouting();
  const items =
    mode === "desktop" ? navigation.desktop.items : navigation.mobile.items;
  const validItems = items.filter((item) => isValidTarget(item, knownScreenIds));
  const rootClass =
    mode === "desktop"
      ? cssClass(styles.sidebar, "sidebar")
      : cssClass(styles.compact, "compact");
  const listClass =
    mode === "desktop"
      ? cssClass(styles.navList, "navList")
      : cssClass(styles.compactList, "compactList");

  return (
    <nav
      className={`${rootClass}${visible ? "" : ` ${cssClass(styles.hiddenNav, "hiddenNav")}`}`}
      aria-label={
        mode === "desktop"
          ? "Generated desktop navigation"
          : "Generated mobile navigation"
      }
      data-nav-mode={mode}
      data-nav-visible={visible ? "true" : "false"}
      hidden={!visible}
    >
      {mode === "desktop" && approvalProgress ? (
        <div className={styles.progressHeader} data-nav-progress="true">
          <p className={styles.progressLabel}>
            {approvalProgress.approvedCount} of {approvalProgress.totalRequired}{" "}
            approved
          </p>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={approvalProgress.totalRequired}
            aria-valuenow={approvalProgress.approvedCount}
            aria-label="Screen approval progress"
          >
            <div
              className={styles.progressFill}
              style={{
                width:
                  approvalProgress.totalRequired === 0
                    ? "0%"
                    : `${(approvalProgress.approvedCount /
                        approvalProgress.totalRequired) *
                      100}%`,
              }}
            />
          </div>
        </div>
      ) : null}
      <ul className={listClass}>
        {validItems.map((item) => {
          const status = screenStatuses?.get(item.screenId);
          const tone = statusTone(status);
          const statusLabel = status
            ? screenReviewStatusLabel(status)
            : "Not reviewed";
          return (
            <li key={item.id}>
              <NavLink
                to={toStudio(`review/${item.screenId}`)}
                className={({ isActive }) =>
                  isActive || activeScreenId === item.screenId
                    ? `${cssClass(styles.navLink, "navLink")} ${cssClass(styles.navLinkActive, "navLinkActive")}`
                    : cssClass(styles.navLink, "navLink")
                }
                aria-current={
                  activeScreenId === item.screenId ? "page" : undefined
                }
              >
                <span className={styles.navLinkIcon} aria-hidden="true">
                  <StudioIcon name={item.icon ?? "fallback"} size={16} />
                </span>
                <span className={styles.navLinkLabel}>{item.label}</span>
                {screenStatuses ? (
                  <span
                    className={styles.statusDot}
                    data-nav-status={tone}
                    data-screen-status={status ?? "not_reviewed"}
                    title={statusLabel}
                    aria-hidden="true"
                  >
                    {tone === "approved" ? (
                      <StudioIcon name="check" size={11} />
                    ) : null}
                  </span>
                ) : null}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
