import { useId } from "react";
import styles from "./RoleSwitcher.module.css";
import { useGovernance } from "./governance-context";
import { DEMO_ACTORS } from "../../application/governance-session";
import type { DemoRole } from "../../domain/governance";

const ROLE_HELP =
  "POC role simulation only. This is not production authentication, SSO, or identity verification. Demo roles are separate from UX personas.";

export function RoleSwitcher() {
  const { actor, switchRole } = useGovernance();
  const groupId = useId();

  return (
    <section
      className={styles.switcher}
      aria-labelledby={`${groupId}-heading`}
      data-testid="role-switcher"
      data-role-switcher="poc-demo"
      data-active-role={actor.role}
    >
      <h2 id={`${groupId}-heading`} className={styles.heading}>
        POC role simulation
      </h2>
      <p className={styles.help} data-role-demo-only="true">
        {ROLE_HELP}
      </p>
      <div
        className={styles.options}
        role="radiogroup"
        aria-label="POC demo role"
      >
        {DEMO_ACTORS.map((option) => {
          const checked = option.role === actor.role;
          return (
            <label
              key={option.id}
              className={styles.option}
              data-role={option.role}
              data-testid={`role-option-${option.role}`}
            >
              <input
                type="radio"
                name={`${groupId}-poc-demo-role`}
                value={option.role}
                checked={checked}
                onChange={() => {
                  switchRole(option.role as DemoRole);
                }}
                data-role-input={option.role}
              />
              <span>{option.displayLabel}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
