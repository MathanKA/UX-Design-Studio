import { useId } from "react";
import type { Persona, PersonaId } from "../../domain/ux-spec";
import type { PersonaLensContext } from "../../domain/ux-spec/persona-lens-selectors";
import styles from "./PersonaLensPanel.module.css";

type PersonaLensPanelProps = {
  personas: readonly Persona[];
  selectedPersonaId: PersonaId;
  onSelectPersona: (personaId: PersonaId) => void;
  context: PersonaLensContext | null;
};

export function PersonaLensPanel({
  personas,
  selectedPersonaId,
  onSelectPersona,
  context,
}: PersonaLensPanelProps) {
  const groupId = useId();

  return (
    <aside
      className={styles.panel}
      aria-labelledby="lens-controls-heading"
      data-workbench-region="lens-controls"
      data-persona-lens="true"
    >
      <h3 id="lens-controls-heading" className={styles.heading}>
        Lens controls
      </h3>
      <p className={styles.lede}>
        Inspect the active screen through a persona lens. Annotations stay
        outside the product preview.
      </p>

      <fieldset className={styles.fieldset} aria-labelledby={`${groupId}-legend`}>
        <legend id={`${groupId}-legend`} className={styles.legend}>
          Active persona
        </legend>
        <div className={styles.options} role="radiogroup" aria-label="Active persona">
          {personas.map((persona) => {
            const checked = persona.id === selectedPersonaId;
            return (
              <label
                key={persona.id}
                className={
                  checked ? `${styles.option} ${styles.optionActive}` : styles.option
                }
              >
                <input
                  type="radio"
                  name={`${groupId}-persona`}
                  value={persona.id}
                  checked={checked}
                  onChange={() => {
                    onSelectPersona(persona.id);
                  }}
                  data-persona-option={persona.id}
                />
                <span>{persona.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {context ? (
        <div className={styles.context} data-persona-context={context.persona.id}>
          <p className={styles.role}>
            <span className={styles.label}>Role</span> {context.persona.role}
          </p>
          {context.persona.technicalProficiency ? (
            <p className={styles.role}>
              <span className={styles.label}>Proficiency</span>{" "}
              {context.persona.technicalProficiency}
            </p>
          ) : null}

          <section aria-labelledby="persona-goals-heading">
            <h4 id="persona-goals-heading" className={styles.subheading}>
              Goals
            </h4>
            <ul className={styles.list} data-persona-goals="true">
              {context.persona.goals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="persona-frustrations-heading">
            <h4 id="persona-frustrations-heading" className={styles.subheading}>
              Frustrations
            </h4>
            <ul className={styles.list} data-persona-frustrations="true">
              {context.persona.frustrations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="persona-touchpoints-heading">
            <h4 id="persona-touchpoints-heading" className={styles.subheading}>
              Current-screen touchpoints
            </h4>
            {context.touchpoint ? (
              <div data-persona-touchpoint="true">
                {context.touchpoint.goals?.length ? (
                  <ul className={styles.list}>
                    {context.touchpoint.goals.map((goal) => (
                      <li key={goal}>{goal}</li>
                    ))}
                  </ul>
                ) : null}
                {context.touchpoint.frustrations?.length ? (
                  <ul className={styles.list}>
                    {context.touchpoint.frustrations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {context.touchpoint.notes ? (
                  <p className={styles.note}>{context.touchpoint.notes}</p>
                ) : null}
              </div>
            ) : (
              <p className={styles.empty} data-persona-touchpoint-empty="true">
                No specific touchpoints are defined for this persona on the
                current screen.
              </p>
            )}
          </section>

          <section aria-labelledby="persona-journeys-heading">
            <h4 id="persona-journeys-heading" className={styles.subheading}>
              Related journey context
            </h4>
            {context.relatedJourneySteps.length > 0 ? (
              <ul className={styles.list} data-persona-journeys="true">
                {context.relatedJourneySteps.map(({ journey, step }) => (
                  <li key={`${journey.id}-${step.id}`}>
                    {journey.name}: {step.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>
                No journey steps reference the current screen.
              </p>
            )}
          </section>
        </div>
      ) : (
        <p className={styles.empty} role="status">
          Selected persona could not be resolved from the UXSpec.
        </p>
      )}
    </aside>
  );
}
