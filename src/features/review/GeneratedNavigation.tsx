import { NavLink } from "react-router-dom";
import type { NavigationItem, NavigationSpec, ScreenId } from "../../domain/ux-spec";
import { cssClass } from "../../renderer/styles/css-class";
import styles from "./ReviewPage.module.css";

type GeneratedNavigationProps = {
  navigation: NavigationSpec;
  activeScreenId: ScreenId;
  knownScreenIds: ReadonlySet<ScreenId>;
  mode: "desktop" | "mobile";
  visible: boolean;
};

function isValidTarget(
  item: NavigationItem,
  knownScreenIds: ReadonlySet<ScreenId>,
): boolean {
  return knownScreenIds.has(item.screenId);
}

export function GeneratedNavigation({
  navigation,
  activeScreenId,
  knownScreenIds,
  mode,
  visible,
}: GeneratedNavigationProps) {
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
      <ul className={listClass}>
        {validItems.map((item) => (
          <li key={item.id}>
            <NavLink
              to={`/review/${item.screenId}`}
              className={({ isActive }) =>
                isActive || activeScreenId === item.screenId
                  ? `${cssClass(styles.navLink, "navLink")} ${cssClass(styles.navLinkActive, "navLinkActive")}`
                  : cssClass(styles.navLink, "navLink")
              }
              aria-current={
                activeScreenId === item.screenId ? "page" : undefined
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
