/**
 * Test-only route used to prove route-level error isolation.
 * Not linked from studio navigation.
 */
export function RouteErrorProbe(): never {
  throw new Error("Controlled route failure for boundary verification.");
}
