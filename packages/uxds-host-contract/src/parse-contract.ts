import type { UxDesignStudioRemoteProps } from "./contract";
import { SUPPORTED_DEMO_PROJECT_ID } from "./contract";
import { uxDesignStudioRemoteIdentitySchema } from "./schemas";

export type ParseRemotePropsResult =
  | { ok: true; value: UxDesignStudioRemoteProps }
  | { ok: false; error: { code: string; message: string } };

function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim();
  if (!trimmed) {
    return "/";
  }
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "") || "/";
}

/**
 * Runtime-validate host identity props. Callbacks remain TypeScript-checked
 * and are passed through when present.
 */
export function parseUxDesignStudioRemoteProps(
  input: unknown,
): ParseRemotePropsResult {
  if (input === null || typeof input !== "object") {
    return {
      ok: false,
      error: {
        code: "INVALID_CONTRACT",
        message: "Host contract must be an object.",
      },
    };
  }

  const record = input as Record<string, unknown>;
  const identityParse = uxDesignStudioRemoteIdentitySchema.safeParse({
    projectId: record.projectId,
    baselineVersion: record.baselineVersion,
    basePath: record.basePath,
    actor: record.actor,
  });

  if (!identityParse.success) {
    return {
      ok: false,
      error: {
        code: "INVALID_CONTRACT",
        message: "Host contract failed runtime validation.",
      },
    };
  }

  const identity = identityParse.data;
  if (identity.projectId !== SUPPORTED_DEMO_PROJECT_ID) {
    return {
      ok: false,
      error: {
        code: "UNSUPPORTED_PROJECT",
        message: `This demo remote only supports project "${SUPPORTED_DEMO_PROJECT_ID}".`,
      },
    };
  }

  if (
    record.onGateStatusChange !== undefined &&
    typeof record.onGateStatusChange !== "function"
  ) {
    return {
      ok: false,
      error: {
        code: "INVALID_CALLBACK",
        message: "onGateStatusChange must be a function when provided.",
      },
    };
  }

  if (
    record.onNavigateToAgileEditor !== undefined &&
    typeof record.onNavigateToAgileEditor !== "function"
  ) {
    return {
      ok: false,
      error: {
        code: "INVALID_CALLBACK",
        message: "onNavigateToAgileEditor must be a function when provided.",
      },
    };
  }

  const value: UxDesignStudioRemoteProps = {
    projectId: identity.projectId,
    baselineVersion: identity.baselineVersion,
    basePath: normalizeBasePath(identity.basePath),
    actor: identity.actor,
    ...(typeof record.onGateStatusChange === "function"
      ? {
          onGateStatusChange:
            record.onGateStatusChange as NonNullable<
              UxDesignStudioRemoteProps["onGateStatusChange"]
            >,
        }
      : {}),
    ...(typeof record.onNavigateToAgileEditor === "function"
      ? {
          onNavigateToAgileEditor:
            record.onNavigateToAgileEditor as NonNullable<
              UxDesignStudioRemoteProps["onNavigateToAgileEditor"]
            >,
        }
      : {}),
  };

  return { ok: true, value };
}
