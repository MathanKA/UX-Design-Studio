import type { Clock } from "../../ports/clock";

/** System clock for application/runtime wiring. Domain never calls Date. */
export function createSystemClock(): Clock {
  return {
    now(): string {
      return new Date().toISOString();
    },
  };
}
