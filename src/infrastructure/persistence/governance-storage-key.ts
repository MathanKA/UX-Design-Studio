export type GovernanceStorageIdentity = {
  projectId: string;
  specId: string;
  baselineVersion: string;
};

/**
 * Architecture §17 storage key:
 * uxds:v1:<projectId>:<specId>:<baselineVersion>
 */
export function buildGovernanceStorageKey(
  identity: GovernanceStorageIdentity,
): string {
  return `uxds:v1:${identity.projectId}:${identity.specId}:${identity.baselineVersion}`;
}

/** Single managed-key alias permitted by the story mission when identity is stored in the envelope. */
export const GOVERNANCE_MANAGED_KEY_ALIAS = "uxds:governance:v1" as const;
