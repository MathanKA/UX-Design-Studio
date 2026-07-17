/**
 * Injected time source for governance events.
 * Domain reducers must never call Date directly.
 */
export interface Clock {
  now(): string;
}
