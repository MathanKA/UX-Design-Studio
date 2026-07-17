import type { ReactElement } from "react";

/**
 * Allowlisted studio-chrome glyphs. UXSpec icon names are untrusted data:
 * anything outside this map renders the neutral fallback glyph.
 */
const ICON_GLYPHS: Record<string, ReactElement> = {
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
    </>
  ),
  workflow: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6H14a4 4 0 0 1 4 4v5.5" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-6" />
      <path d="M12 20V7" />
      <path d="M17 20v-9" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.4-3.6 4.2-5.5 7-5.5s5.6 1.9 7 5.5" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M9 21h6" />
      <path d="M12 17v4" />
    </>
  ),
  decision: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
    </>
  ),
  journey: (
    <>
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="5" r="2" />
      <path d="M7 19h7a5 5 0 0 0 5-5V7" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  a11y: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M5 9.5h14" />
      <path d="M12 9.5v5" />
      <path d="M12 14.5L8 20.5" />
      <path d="M12 14.5l4 6" />
    </>
  ),
  check: <path d="M5.5 12.5l4 4 9-10" />,
};

const FALLBACK_GLYPH = <circle cx="12" cy="12" r="2.5" />;

type StudioIconProps = {
  name: string;
  size?: number;
  className?: string;
};

export function StudioIcon({ name, size = 16, className }: StudioIconProps) {
  const glyph = ICON_GLYPHS[name] ?? FALLBACK_GLYPH;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...(className !== undefined ? { className } : {})}
      data-studio-icon={ICON_GLYPHS[name] ? name : "fallback"}
    >
      {glyph}
    </svg>
  );
}
