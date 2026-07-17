import type { IdGenerator } from "../../ports/id-generator";

/**
 * Browser/runtime ID generator for application wiring.
 * Prefers crypto.randomUUID when available; falls back to timestamp + counter.
 */
export function createBrowserIdGenerator(): IdGenerator {
  let sequence = 0;

  return {
    next(prefix = "id"): string {
      sequence += 1;
      if (
        typeof globalThis.crypto !== "undefined" &&
        typeof globalThis.crypto.randomUUID === "function"
      ) {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
      }
      return `${prefix}-${Date.now()}-${sequence}`;
    },
  };
}
