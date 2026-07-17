import type { JourneyWalkthroughContext } from "./journey-selectors";
import styles from "./JourneyWalkthroughPanel.module.css";

type JourneyWalkthroughPanelProps = {
  context: JourneyWalkthroughContext | null;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  onRestart: () => void;
  announcement: string;
};

export function JourneyWalkthroughPanel({
  context,
  onPrevious,
  onNext,
  onFinish,
  onRestart,
  announcement,
}: JourneyWalkthroughPanelProps) {
  if (!context) {
    return (
      <aside
        className={styles.panel}
        aria-labelledby="journey-walkthrough-heading"
        data-workbench-region="journey-walkthrough"
        data-journey-walkthrough="true"
        data-journey-invalid="true"
      >
        <h3 id="journey-walkthrough-heading" className={styles.heading}>
          Journey walkthrough
        </h3>
        <p className={styles.empty} role="status">
          The selected journey could not be resolved from the UXSpec.
        </p>
      </aside>
    );
  }

  const { journey, persona, current } = context;
  const stepNumber = current.index + 1;

  return (
    <aside
      className={styles.panel}
      aria-labelledby="journey-walkthrough-heading"
      data-workbench-region="journey-walkthrough"
      data-journey-walkthrough="true"
      data-journey-id={journey.id}
      data-journey-step={current.step.id}
    >
      <h3 id="journey-walkthrough-heading" className={styles.heading}>
        Journey walkthrough
      </h3>
      <p className={styles.lede}>
        Walk a seeded flow without leaving the review workbench.
      </p>

      <p className={styles.meta} data-journey-name="true">
        <span className={styles.label}>Journey</span> {journey.name}
      </p>
      <p className={styles.meta} data-journey-persona="true">
        <span className={styles.label}>Persona</span>{" "}
        {persona?.name ?? journey.personaId}
      </p>
      <p className={styles.meta} data-journey-progress="true">
        <span className={styles.label}>Step</span> {stepNumber} of {current.total}
      </p>

      <section aria-labelledby="journey-step-title">
        <h4 id="journey-step-title" className={styles.subheading} data-journey-step-title="true">
          {current.step.title}
        </h4>
        <p className={styles.description} data-journey-step-description="true">
          {current.step.description}
        </p>
        <p className={styles.meta} data-journey-related-screen="true">
          <span className={styles.label}>Screen</span> {current.step.screenId}
        </p>
      </section>

      <div className={styles.actions} role="group" aria-label="Journey controls">
        <button
          type="button"
          className={styles.button}
          onClick={onPrevious}
          disabled={current.isFirst}
          data-journey-action="previous"
        >
          Previous
        </button>
        {current.isLast ? (
          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={onFinish}
            data-journey-action="finish"
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            className={styles.buttonPrimary}
            onClick={onNext}
            data-journey-action="next"
          >
            Next
          </button>
        )}
        <button
          type="button"
          className={styles.button}
          onClick={onRestart}
          data-journey-action="restart"
        >
          Restart
        </button>
      </div>

      <div className={styles.live} aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </aside>
  );
}
