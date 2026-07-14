/**
 * Injected identity source for governance events and screen versions.
 * Domain reducers must never generate random IDs.
 */
export interface IdGenerator {
  next(prefix?: string): string;
}
