import type { GovernanceState } from "./types";

export type GovernanceErrorCode =
  | "DUPLICATE_EVENT_ID"
  | "DUPLICATE_VERSION_ID"
  | "VERSION_ID_COLLISION"
  | "MISSING_CONTENT_REF"
  | "INVALID_REVISION_REFERENCE"
  | "STALE_ASYNC_COMPLETION"
  | "INVALID_PROVIDER_OUTPUT"
  | "STALE_SCREEN_VERSION"
  | "UNKNOWN_SCREEN"
  | "MISSING_SCREEN_VERSION"
  | "INVALID_COMMAND"
  | "CAPABILITY_DENIED"
  | "INVALID_ACTION";

export type GovernanceError = {
  code: GovernanceErrorCode;
  message: string;
};

export type GovernanceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: GovernanceError };

export type GovernanceStateResult =
  | { ok: true; state: GovernanceState }
  | { ok: false; error: GovernanceError };

export function governanceOk<T>(value: T): GovernanceResult<T> {
  return { ok: true, value };
}

export function governanceErr(
  code: GovernanceErrorCode,
  message: string,
): GovernanceResult<never> {
  return { ok: false, error: { code, message } };
}

export function governanceStateOk(state: GovernanceState): GovernanceStateResult {
  return { ok: true, state };
}

export function governanceStateErr(
  code: GovernanceErrorCode,
  message: string,
): GovernanceStateResult {
  return { ok: false, error: { code, message } };
}
