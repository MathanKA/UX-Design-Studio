export const appConfig = {
  appName: "UX Design Studio",
  defaultRoute: "/overview",
  enableJourneyWalkthrough: true,
  enableTabletPreview: true,
  /** US-5.2 owns the full version-history panel; flag is wired in US-5.1. */
  enableVersionHistory: true,
  /** US-5.2 owns the full accessibility overlay; flag is wired in US-5.1. */
  enableAccessibilityOverlay: true,
  enableContrastBadges: true,
  enableControlledProviderFailure: true,
} as const;

export const REGENERATION_TARGET_SCREEN_ID = "screen-dashboard" as const;
