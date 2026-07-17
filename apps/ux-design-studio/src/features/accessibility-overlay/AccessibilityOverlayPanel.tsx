import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { ScreenSpec, UXSpec } from "../../domain/ux-spec";
import { PartialDataState } from "../../ui/states";
import {
  deriveAccessibilityAnnotations,
  type DerivedAccessibilityAnnotation,
} from "./accessibility-selectors";
import styles from "./AccessibilityOverlayPanel.module.css";

const KIND_LABELS: Record<DerivedAccessibilityAnnotation["kind"], string> = {
  contrast: "Contrast",
  aria: "ARIA",
  screenReader: "Screen reader",
  keyboard: "Keyboard",
  requirement: "Requirement",
};

type AccessibilityOverlayPanelProps = {
  spec: Pick<UXSpec, "accessibilityRequirements">;
  screen: ScreenSpec | null | undefined;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
};

export function AccessibilityOverlayPanel({
  spec,
  screen,
  enabled,
  onEnabledChange,
}: AccessibilityOverlayPanelProps) {
  const toggleId = useId();
  const detailsId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const derivation = deriveAccessibilityAnnotations({ spec, screen });
  const selected =
    derivation.annotations.find((entry) => entry.id === selectedId) ?? null;

  useEffect(() => {
    if (!enabled) {
      setSelectedId(null);
    }
  }, [enabled]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedId(null);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && detailsRef.current) {
      detailsRef.current.focus();
    }
  }, [selectedId]);

  const openDetails = (annotationId: string) => {
    setSelectedId(annotationId);
  };

  const closeDetails = () => {
    setSelectedId(null);
    toggleRef.current?.focus();
  };

  const onMarkerKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    annotationId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetails(annotationId);
    }
  };

  return (
    <aside
      className={styles.panel}
      aria-labelledby="accessibility-overlay-heading"
      data-workbench-region="accessibility-overlay"
      data-testid="accessibility-overlay-panel"
      data-accessibility-overlay-enabled="true"
      data-overlay-active={enabled ? "true" : "false"}
    >
      <h3 id="accessibility-overlay-heading" className={styles.heading}>
        Accessibility evidence
      </h3>
      <p className={styles.lede}>
        Design-review annotations from the UXSpec and active screen. This is
        evidence for review, not a WCAG certification.
      </p>

      <button
        ref={toggleRef}
        id={toggleId}
        type="button"
        className={styles.toggle}
        aria-pressed={enabled}
        aria-controls={detailsId}
        data-overlay-toggle="true"
        onClick={() => {
          onEnabledChange(!enabled);
        }}
      >
        {enabled ? "Hide accessibility overlay" : "Show accessibility overlay"}
      </button>

      {!screen ? (
        <p className={styles.empty} role="status" data-overlay-no-screen="true">
          No active screen is available for accessibility annotations.
        </p>
      ) : null}

      {enabled && derivation.isEmpty ? (
        <p className={styles.empty} role="status" data-overlay-empty="true">
          No screen or node accessibility annotations are present for this
          screen.
        </p>
      ) : null}

      {enabled && derivation.hasPartialMetadata ? (
        <div className={styles.partial} data-overlay-partial="true">
          <PartialDataState title="Partial accessibility metadata">
            <p>
              Some annotations are missing ratio, role, label, or note fields.
              Markers still render with the available evidence.
            </p>
          </PartialDataState>
        </div>
      ) : null}

      {enabled ? (
        <div id={detailsId} className={styles.body}>
          <p className={styles.meta} data-overlay-counts="true">
            <span className={styles.label}>Typed notes</span> contrast{" "}
            {derivation.byKind.contrast}, ARIA {derivation.byKind.aria}, screen
            reader {derivation.byKind.screenReader}, keyboard{" "}
            {derivation.byKind.keyboard}
          </p>

          <ul className={styles.markers} data-overlay-markers="true">
            {derivation.annotations.map((annotation) => (
              <li key={annotation.id}>
                <button
                  type="button"
                  className={styles.marker}
                  data-overlay-marker={annotation.kind}
                  data-overlay-marker-id={annotation.id}
                  aria-label={`${KIND_LABELS[annotation.kind]}: ${annotation.summary}`}
                  onClick={() => {
                    openDetails(annotation.id);
                  }}
                  onKeyDown={(event) => {
                    onMarkerKeyDown(event, annotation.id);
                  }}
                >
                  <span className={styles.markerKind}>
                    {KIND_LABELS[annotation.kind]}
                  </span>
                  <span className={styles.markerSummary}>
                    {annotation.summary}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <div
              ref={detailsRef}
              className={styles.details}
              role="dialog"
              aria-modal="false"
              aria-labelledby={`${detailsId}-title`}
              tabIndex={-1}
              data-overlay-details="true"
            >
              <h4 id={`${detailsId}-title`} className={styles.subheading}>
                {KIND_LABELS[selected.kind]} details
              </h4>
              <p className={styles.meta}>
                <span className={styles.label}>Source</span>{" "}
                {selected.sourceLabel}
              </p>
              {selected.nodeId ? (
                <p className={styles.meta}>
                  <span className={styles.label}>Node</span> {selected.nodeId}
                </p>
              ) : null}
              <p className={styles.detailText}>{selected.detail}</p>
              <p className={styles.disclaimer}>
                Design-review evidence only — not a WCAG certification claim.
              </p>
              <button
                type="button"
                className={styles.close}
                data-overlay-details-close="true"
                onClick={closeDetails}
              >
                Close details
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={styles.empty} data-overlay-inactive="true">
          Overlay is off. Preview stays fully operable. Turn the overlay on to
          inspect seeded accessibility evidence.
        </p>
      )}
    </aside>
  );
}
