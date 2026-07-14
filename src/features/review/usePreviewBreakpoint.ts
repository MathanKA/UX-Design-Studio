import { useEffect, useState } from "react";
import type { PreviewBreakpoint } from "../../renderer";

const MOBILE_QUERY = "(max-width: 767px)";

export function usePreviewBreakpoint(): PreviewBreakpoint {
  const [breakpoint, setBreakpoint] = useState<PreviewBreakpoint>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return "desktop";
    }
    return window.matchMedia(MOBILE_QUERY).matches ? "mobile" : "desktop";
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      setBreakpoint(media.matches ? "mobile" : "desktop");
    };
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return breakpoint;
}
