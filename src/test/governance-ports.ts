import type { Clock, IdGenerator } from "../ports";

/**
 * Deterministic clock for governance unit tests.
 */
export function createFixedClock(isoTimestamp: string): Clock {
  return {
    now(): string {
      return isoTimestamp;
    },
  };
}

/**
 * Deterministic sequential ID generator for governance unit tests.
 */
export function createSequentialIdGenerator(
  start = 1,
): IdGenerator & { readonly count: number } {
  let sequence = start;
  return {
    get count() {
      return sequence - start;
    },
    next(prefix = "id"): string {
      const value = `${prefix}-${sequence}`;
      sequence += 1;
      return value;
    },
  };
}
