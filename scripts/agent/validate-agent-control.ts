#!/usr/bin/env node
/**
 * Validates the UX Design Studio agent-control layer and run manifests.
 *
 * Default mode performs generic repository validation and allows zero or one
 * active autonomous run. Optional CLI flags assert an expected active-run state:
 *
 *   --expect-active-run <runId>
 *   --expect-no-active-run
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors: string[] = [];

const APPROVED_BRANCH_PREFIXES = ["feat/", "fix/", "chore/", "test/", "docs/"] as const;
const MAX_RETRY = 5;

type RunStory = {
  key: string;
  issue: number;
  tasks: number[];
  branch: string;
  dependsOn: number[];
  ticketSuggestedBranch?: string;
  branchOverrideReason?: string;
  authorizedScope?: Record<string, unknown>;
  authorizedCutScope?: Record<string, unknown>;
  evidenceReuse?: Record<string, unknown>;
  requiredGap?: Record<string, unknown>;
  deployment?: Record<string, unknown>;
};

type ProviderConfig = {
  port: string;
  implementation: string;
  targetScreenId: string;
  simulatedLatencyMs: number;
  supportsAbortSignal: boolean;
  controlledFailure: boolean;
  externalNetwork: boolean;
  requiresSecrets: boolean;
  realLlm: boolean;
};

type RegenerationPolicy = {
  requireLatestCurrentVersionRevision: boolean;
  providerOutputRuntimeValidation: boolean;
  rejectDuplicateVersionIds: boolean;
  atomicEventAndVersionActivation: boolean;
  validateRevisionCrossReferences: boolean;
  validateProviderScreenIdentity: boolean;
  rejectStaleAsyncCompletion: boolean;
  persistContentReference: boolean;
  preserveCurrentVersionOnFailure: boolean;
  preserveCurrentVersionOnCancellation: boolean;
};

type RunScope = {
  activateCutLine: boolean;
  completeVersionHistory: boolean;
  completeAccessibilityOverlay: boolean;
  contrastBadges: boolean;
  resilientStates: boolean;
  reducedMotion: boolean;
  visualPolish: boolean;
};

type FeatureFlags = {
  enableVersionHistory: boolean;
  enableAccessibilityOverlay: boolean;
  enableContrastBadges: boolean;
  enableControlledProviderFailure: boolean;
};

type RunManifest = {
  schemaVersion: number;
  runId: string;
  active: boolean;
  epic: {
    key: string;
    issue: number;
    title: string;
    estimateHours: number;
  };
  baseBranch: string;
  workspace?: {
    mode: string;
    useWorktrees: boolean;
  };
  merge: {
    method: string;
    retainFeatureBranch: boolean;
  };
  autonomy: {
    sequentialStories: boolean;
    automaticStoryMerge: boolean;
    automaticNextStory: boolean;
    finalReleasePR: {
      base: string;
      head: string;
      open: boolean;
      merge: boolean;
    };
  };
  retryBudget: {
    implementationRepair: number;
    verifierRerun: number;
    transientCiRerun: number;
    deploymentRepair?: number;
  };
  roles?: {
    default: string;
    options: string[];
    demoOnly: boolean;
    separateFromPersonas: boolean;
  };
  scopeBoundary?: {
    defineRegenerationContracts: boolean;
    defineRegenerationCapabilities: boolean;
    providerBackedRegeneration: boolean;
    designAgentProvider: boolean;
    generatedScreenVariant: boolean;
    nextOwningEpic: number;
  };
  resetPolicy?: {
    removeManagedGovernanceKeyOnly: boolean;
    preserveUXSpec: boolean;
    preservePersonas: boolean;
    preserveJourneys: boolean;
    preserveDesignTokens: boolean;
    preserveFeatureFlags: boolean;
    prohibitLocalStorageClear: boolean;
  };
  provider?: ProviderConfig;
  regenerationPolicy?: RegenerationPolicy;
  scope?: RunScope;
  featureFlags?: FeatureFlags;
  release?: {
    version: string;
    tag: string;
    signedAnnotatedTag: boolean;
    createGitHubRelease: boolean;
    syncMainBackToStaging: boolean;
  };
  deployment?: {
    provider: string;
    staticOutputDirectory: string;
    requiresSecretsInApp: boolean;
    generatedDomainAllowed: boolean;
    verifyDeepLinks: boolean;
    productionDeployAfterMainMerge: boolean;
  };
  effort?: {
    accounting: string;
    e1: number;
    e2: number;
    e3: number;
    e4: number;
    e5: number;
    e6: number;
    total: number;
  };
  evidenceReuse?: Record<string, unknown>;
  documentation?: Record<string, unknown>;
  stories: RunStory[];
  finalization?: {
    deactivateManifest: boolean;
    closureBranch: string;
    automaticClosureMerge: boolean;
  };
  stopAfter: {
    epic: number;
    openReleasePR?: boolean;
    mergeReleasePR?: boolean;
    releaseTag?: string;
    githubRelease?: boolean;
    mainSyncedBackToStaging?: boolean;
  };
  authorizationExpiry: string;
};

type CliExpectations = {
  expectActiveRunId: string | null;
  expectNoActiveRun: boolean;
};

function fail(message: string): void {
  errors.push(message);
}

function read(relativePath: string): string {
  const absolute = path.join(root, relativePath);
  if (!existsSync(absolute)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function mustExist(relativePath: string): void {
  if (!existsSync(path.join(root, relativePath))) {
    fail(`Missing required path: ${relativePath}`);
  }
}

function parseScalar(raw: string): string | number | boolean | unknown[] {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => parseScalar(part.trim()));
  }
  return value;
}

/**
 * Minimal YAML subset parser for constrained run manifests.
 * Supports nested maps, list-of-maps, and inline arrays only.
 */
function parseRunManifestYaml(source: string): Record<string, unknown> {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, ""))
    .filter((line) => line.trim().length > 0);

  type Frame = {
    indent: number;
    value: Record<string, unknown> | unknown[];
    key?: string;
  };

  const rootObject: Record<string, unknown> = {};
  const stack: Frame[] = [{ indent: -1, value: rootObject }];

  const currentContainer = (): Frame => stack[stack.length - 1]!;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]!;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const trimmed = line.trim();

    while (stack.length > 1 && indent <= currentContainer().indent) {
      stack.pop();
    }

    const container = currentContainer();

    if (trimmed.startsWith("- ")) {
      if (!Array.isArray(container.value)) {
        fail("YAML list item found outside a list context.");
        continue;
      }
      const itemBody = trimmed.slice(2);
      if (itemBody.includes(":") && !itemBody.startsWith("[") && !itemBody.startsWith("{")) {
        const colon = itemBody.indexOf(":");
        const key = itemBody.slice(0, colon).trim();
        const rest = itemBody.slice(colon + 1).trim();
        const item: Record<string, unknown> = {};
        if (rest.length === 0) {
          container.value.push(item);
          stack.push({ indent, value: item, key });
          const nested: Record<string, unknown> | unknown[] = {};
          item[key] = nested;
          stack.push({ indent: indent + 2, value: nested, key });
        } else {
          item[key] = parseScalar(rest);
          container.value.push(item);
          stack.push({ indent, value: item });
        }
      } else {
        container.value.push(parseScalar(itemBody));
      }
      continue;
    }

    const colon = trimmed.indexOf(":");
    if (colon === -1) {
      fail(`Unsupported YAML line: ${trimmed}`);
      continue;
    }

    const key = trimmed.slice(0, colon).trim();
    const rest = trimmed.slice(colon + 1).trim();

    if (Array.isArray(container.value)) {
      fail(`Unexpected map key inside list: ${key}`);
      continue;
    }

    if (rest.length === 0) {
      const peek = lines
        .slice(lineIndex + 1)
        .find((candidate) => (candidate.match(/^\s*/)?.[0].length ?? 0) > indent);
      const nextIsList = Boolean(peek?.trim().startsWith("- "));
      const nested: Record<string, unknown> | unknown[] = nextIsList ? [] : {};
      container.value[key] = nested;
      stack.push({ indent, value: nested, key });
      continue;
    }

    container.value[key] = parseScalar(rest);
  }

  return rootObject;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`Manifest field ${label} must be an object.`);
    return {};
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    fail(`Manifest field ${label} must be a number.`);
    return Number.NaN;
  }
  return value;
}

function asBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    fail(`Manifest field ${label} must be a boolean.`);
    return false;
  }
  return value;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(`Manifest field ${label} must be a non-empty string.`);
    return "";
  }
  return value;
}

function asNumberArray(value: unknown, label: string): number[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "number")) {
    fail(`Manifest field ${label} must be an array of numbers.`);
    return [];
  }
  return value as number[];
}

function asOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  return asString(value, label);
}

function parseCliExpectations(argv: string[]): CliExpectations {
  let expectActiveRunId: string | null = null;
  let expectNoActiveRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--expect-no-active-run") {
      expectNoActiveRun = true;
      continue;
    }
    if (arg === "--expect-active-run") {
      const runId = argv[index + 1];
      if (!runId || runId.startsWith("--")) {
        fail("--expect-active-run requires a runId argument.");
        continue;
      }
      expectActiveRunId = runId;
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) {
      fail(`Unknown CLI argument: ${arg}`);
    }
  }

  if (expectNoActiveRun && expectActiveRunId) {
    fail("Cannot combine --expect-no-active-run with --expect-active-run.");
  }

  return { expectActiveRunId, expectNoActiveRun };
}

function normalizeManifest(raw: Record<string, unknown>): RunManifest {
  const epic = asRecord(raw.epic, "epic");
  const merge = asRecord(raw.merge, "merge");
  const autonomy = asRecord(raw.autonomy, "autonomy");
  const finalReleasePR = asRecord(autonomy.finalReleasePR, "autonomy.finalReleasePR");
  const retryBudget = asRecord(raw.retryBudget, "retryBudget");
  const stopAfter = asRecord(raw.stopAfter, "stopAfter");
  const storiesRaw = raw.stories;

  if (!Array.isArray(storiesRaw)) {
    fail("Manifest stories must be an array.");
  }

  const stories: RunStory[] = (Array.isArray(storiesRaw) ? storiesRaw : []).map(
    (entry, index) => {
      const story = asRecord(entry, `stories[${index}]`);
      const normalized: RunStory = {
        key: asString(story.key, `stories[${index}].key`),
        issue: asNumber(story.issue, `stories[${index}].issue`),
        tasks: asNumberArray(story.tasks, `stories[${index}].tasks`),
        branch: asString(story.branch, `stories[${index}].branch`),
        dependsOn: asNumberArray(story.dependsOn, `stories[${index}].dependsOn`),
      };

      const ticketSuggestedBranch = asOptionalString(
        story.ticketSuggestedBranch,
        `stories[${index}].ticketSuggestedBranch`,
      );
      if (ticketSuggestedBranch !== undefined) {
        normalized.ticketSuggestedBranch = ticketSuggestedBranch;
      }

      const branchOverrideReason = asOptionalString(
        story.branchOverrideReason,
        `stories[${index}].branchOverrideReason`,
      );
      if (branchOverrideReason !== undefined) {
        normalized.branchOverrideReason = branchOverrideReason;
      }

      if (story.authorizedScope !== undefined) {
        normalized.authorizedScope = asRecord(
          story.authorizedScope,
          `stories[${index}].authorizedScope`,
        );
      }

      if (story.authorizedCutScope !== undefined) {
        normalized.authorizedCutScope = asRecord(
          story.authorizedCutScope,
          `stories[${index}].authorizedCutScope`,
        );
      }

      if (story.evidenceReuse !== undefined) {
        normalized.evidenceReuse = asRecord(
          story.evidenceReuse,
          `stories[${index}].evidenceReuse`,
        );
      }

      if (story.requiredGap !== undefined) {
        normalized.requiredGap = asRecord(
          story.requiredGap,
          `stories[${index}].requiredGap`,
        );
      }

      if (story.deployment !== undefined) {
        normalized.deployment = asRecord(
          story.deployment,
          `stories[${index}].deployment`,
        );
      }

      return normalized;
    },
  );

  let workspace: RunManifest["workspace"];
  if (raw.workspace !== undefined) {
    const workspaceRaw = asRecord(raw.workspace, "workspace");
    workspace = {
      mode: asString(workspaceRaw.mode, "workspace.mode"),
      useWorktrees: asBoolean(workspaceRaw.useWorktrees, "workspace.useWorktrees"),
    };
  }

  let finalization: RunManifest["finalization"];
  if (raw.finalization !== undefined) {
    const finalizationRaw = asRecord(raw.finalization, "finalization");
    finalization = {
      deactivateManifest: asBoolean(
        finalizationRaw.deactivateManifest,
        "finalization.deactivateManifest",
      ),
      closureBranch: asString(
        finalizationRaw.closureBranch,
        "finalization.closureBranch",
      ),
      automaticClosureMerge: asBoolean(
        finalizationRaw.automaticClosureMerge,
        "finalization.automaticClosureMerge",
      ),
    };
  }

  let roles: RunManifest["roles"];
  if (raw.roles !== undefined) {
    const rolesRaw = asRecord(raw.roles, "roles");
    const optionsRaw = rolesRaw.options;
    if (!Array.isArray(optionsRaw) || optionsRaw.some((entry) => typeof entry !== "string")) {
      fail("Manifest field roles.options must be an array of strings.");
    }
    roles = {
      default: asString(rolesRaw.default, "roles.default"),
      options: (Array.isArray(optionsRaw) ? optionsRaw : []) as string[],
      demoOnly: asBoolean(rolesRaw.demoOnly, "roles.demoOnly"),
      separateFromPersonas: asBoolean(
        rolesRaw.separateFromPersonas,
        "roles.separateFromPersonas",
      ),
    };
  }

  let scopeBoundary: RunManifest["scopeBoundary"];
  if (raw.scopeBoundary !== undefined) {
    const scopeRaw = asRecord(raw.scopeBoundary, "scopeBoundary");
    scopeBoundary = {
      defineRegenerationContracts: asBoolean(
        scopeRaw.defineRegenerationContracts,
        "scopeBoundary.defineRegenerationContracts",
      ),
      defineRegenerationCapabilities: asBoolean(
        scopeRaw.defineRegenerationCapabilities,
        "scopeBoundary.defineRegenerationCapabilities",
      ),
      providerBackedRegeneration: asBoolean(
        scopeRaw.providerBackedRegeneration,
        "scopeBoundary.providerBackedRegeneration",
      ),
      designAgentProvider: asBoolean(
        scopeRaw.designAgentProvider,
        "scopeBoundary.designAgentProvider",
      ),
      generatedScreenVariant: asBoolean(
        scopeRaw.generatedScreenVariant,
        "scopeBoundary.generatedScreenVariant",
      ),
      nextOwningEpic: asNumber(scopeRaw.nextOwningEpic, "scopeBoundary.nextOwningEpic"),
    };
  }

  let resetPolicy: RunManifest["resetPolicy"];
  if (raw.resetPolicy !== undefined) {
    const resetRaw = asRecord(raw.resetPolicy, "resetPolicy");
    resetPolicy = {
      removeManagedGovernanceKeyOnly: asBoolean(
        resetRaw.removeManagedGovernanceKeyOnly,
        "resetPolicy.removeManagedGovernanceKeyOnly",
      ),
      preserveUXSpec: asBoolean(resetRaw.preserveUXSpec, "resetPolicy.preserveUXSpec"),
      preservePersonas: asBoolean(
        resetRaw.preservePersonas,
        "resetPolicy.preservePersonas",
      ),
      preserveJourneys: asBoolean(
        resetRaw.preserveJourneys,
        "resetPolicy.preserveJourneys",
      ),
      preserveDesignTokens: asBoolean(
        resetRaw.preserveDesignTokens,
        "resetPolicy.preserveDesignTokens",
      ),
      preserveFeatureFlags: asBoolean(
        resetRaw.preserveFeatureFlags,
        "resetPolicy.preserveFeatureFlags",
      ),
      prohibitLocalStorageClear: asBoolean(
        resetRaw.prohibitLocalStorageClear,
        "resetPolicy.prohibitLocalStorageClear",
      ),
    };
  }

  let provider: RunManifest["provider"];
  if (raw.provider !== undefined) {
    const providerRaw = asRecord(raw.provider, "provider");
    provider = {
      port: asString(providerRaw.port, "provider.port"),
      implementation: asString(providerRaw.implementation, "provider.implementation"),
      targetScreenId: asString(providerRaw.targetScreenId, "provider.targetScreenId"),
      simulatedLatencyMs: asNumber(
        providerRaw.simulatedLatencyMs,
        "provider.simulatedLatencyMs",
      ),
      supportsAbortSignal: asBoolean(
        providerRaw.supportsAbortSignal,
        "provider.supportsAbortSignal",
      ),
      controlledFailure: asBoolean(
        providerRaw.controlledFailure,
        "provider.controlledFailure",
      ),
      externalNetwork: asBoolean(providerRaw.externalNetwork, "provider.externalNetwork"),
      requiresSecrets: asBoolean(providerRaw.requiresSecrets, "provider.requiresSecrets"),
      realLlm: asBoolean(providerRaw.realLlm, "provider.realLlm"),
    };
  }

  let regenerationPolicy: RunManifest["regenerationPolicy"];
  if (raw.regenerationPolicy !== undefined) {
    const policyRaw = asRecord(raw.regenerationPolicy, "regenerationPolicy");
    regenerationPolicy = {
      requireLatestCurrentVersionRevision: asBoolean(
        policyRaw.requireLatestCurrentVersionRevision,
        "regenerationPolicy.requireLatestCurrentVersionRevision",
      ),
      providerOutputRuntimeValidation: asBoolean(
        policyRaw.providerOutputRuntimeValidation,
        "regenerationPolicy.providerOutputRuntimeValidation",
      ),
      rejectDuplicateVersionIds: asBoolean(
        policyRaw.rejectDuplicateVersionIds,
        "regenerationPolicy.rejectDuplicateVersionIds",
      ),
      atomicEventAndVersionActivation: asBoolean(
        policyRaw.atomicEventAndVersionActivation,
        "regenerationPolicy.atomicEventAndVersionActivation",
      ),
      validateRevisionCrossReferences: asBoolean(
        policyRaw.validateRevisionCrossReferences,
        "regenerationPolicy.validateRevisionCrossReferences",
      ),
      validateProviderScreenIdentity: asBoolean(
        policyRaw.validateProviderScreenIdentity,
        "regenerationPolicy.validateProviderScreenIdentity",
      ),
      rejectStaleAsyncCompletion: asBoolean(
        policyRaw.rejectStaleAsyncCompletion,
        "regenerationPolicy.rejectStaleAsyncCompletion",
      ),
      persistContentReference: asBoolean(
        policyRaw.persistContentReference,
        "regenerationPolicy.persistContentReference",
      ),
      preserveCurrentVersionOnFailure: asBoolean(
        policyRaw.preserveCurrentVersionOnFailure,
        "regenerationPolicy.preserveCurrentVersionOnFailure",
      ),
      preserveCurrentVersionOnCancellation: asBoolean(
        policyRaw.preserveCurrentVersionOnCancellation,
        "regenerationPolicy.preserveCurrentVersionOnCancellation",
      ),
    };
  }

  let scope: RunManifest["scope"];
  if (raw.scope !== undefined) {
    const scopeRaw = asRecord(raw.scope, "scope");
    scope = {
      activateCutLine: asBoolean(scopeRaw.activateCutLine, "scope.activateCutLine"),
      completeVersionHistory: asBoolean(
        scopeRaw.completeVersionHistory,
        "scope.completeVersionHistory",
      ),
      completeAccessibilityOverlay: asBoolean(
        scopeRaw.completeAccessibilityOverlay,
        "scope.completeAccessibilityOverlay",
      ),
      contrastBadges: asBoolean(scopeRaw.contrastBadges, "scope.contrastBadges"),
      resilientStates: asBoolean(scopeRaw.resilientStates, "scope.resilientStates"),
      reducedMotion: asBoolean(scopeRaw.reducedMotion, "scope.reducedMotion"),
      visualPolish: asBoolean(scopeRaw.visualPolish, "scope.visualPolish"),
    };
  }

  let featureFlags: RunManifest["featureFlags"];
  if (raw.featureFlags !== undefined) {
    const flagsRaw = asRecord(raw.featureFlags, "featureFlags");
    featureFlags = {
      enableVersionHistory: asBoolean(
        flagsRaw.enableVersionHistory,
        "featureFlags.enableVersionHistory",
      ),
      enableAccessibilityOverlay: asBoolean(
        flagsRaw.enableAccessibilityOverlay,
        "featureFlags.enableAccessibilityOverlay",
      ),
      enableContrastBadges: asBoolean(
        flagsRaw.enableContrastBadges,
        "featureFlags.enableContrastBadges",
      ),
      enableControlledProviderFailure: asBoolean(
        flagsRaw.enableControlledProviderFailure,
        "featureFlags.enableControlledProviderFailure",
      ),
    };
  }

  let release: RunManifest["release"];
  if (raw.release !== undefined) {
    const releaseRaw = asRecord(raw.release, "release");
    release = {
      version: asString(releaseRaw.version, "release.version"),
      tag: asString(releaseRaw.tag, "release.tag"),
      signedAnnotatedTag: asBoolean(
        releaseRaw.signedAnnotatedTag,
        "release.signedAnnotatedTag",
      ),
      createGitHubRelease: asBoolean(
        releaseRaw.createGitHubRelease,
        "release.createGitHubRelease",
      ),
      syncMainBackToStaging: asBoolean(
        releaseRaw.syncMainBackToStaging,
        "release.syncMainBackToStaging",
      ),
    };
  }

  let deployment: RunManifest["deployment"];
  if (raw.deployment !== undefined) {
    const deploymentRaw = asRecord(raw.deployment, "deployment");
    deployment = {
      provider: asString(deploymentRaw.provider, "deployment.provider"),
      staticOutputDirectory: asString(
        deploymentRaw.staticOutputDirectory,
        "deployment.staticOutputDirectory",
      ),
      requiresSecretsInApp: asBoolean(
        deploymentRaw.requiresSecretsInApp,
        "deployment.requiresSecretsInApp",
      ),
      generatedDomainAllowed: asBoolean(
        deploymentRaw.generatedDomainAllowed,
        "deployment.generatedDomainAllowed",
      ),
      verifyDeepLinks: asBoolean(
        deploymentRaw.verifyDeepLinks,
        "deployment.verifyDeepLinks",
      ),
      productionDeployAfterMainMerge: asBoolean(
        deploymentRaw.productionDeployAfterMainMerge,
        "deployment.productionDeployAfterMainMerge",
      ),
    };
  }

  let effort: RunManifest["effort"];
  if (raw.effort !== undefined) {
    const effortRaw = asRecord(raw.effort, "effort");
    effort = {
      accounting: asString(effortRaw.accounting, "effort.accounting"),
      e1: asNumber(effortRaw.e1, "effort.e1"),
      e2: asNumber(effortRaw.e2, "effort.e2"),
      e3: asNumber(effortRaw.e3, "effort.e3"),
      e4: asNumber(effortRaw.e4, "effort.e4"),
      e5: asNumber(effortRaw.e5, "effort.e5"),
      e6: asNumber(effortRaw.e6, "effort.e6"),
      total: asNumber(effortRaw.total, "effort.total"),
    };
  }

  let evidenceReuse: RunManifest["evidenceReuse"];
  if (raw.evidenceReuse !== undefined) {
    evidenceReuse = asRecord(raw.evidenceReuse, "evidenceReuse");
  }

  let documentation: RunManifest["documentation"];
  if (raw.documentation !== undefined) {
    documentation = asRecord(raw.documentation, "documentation");
  }

  const stopAfterNormalized: RunManifest["stopAfter"] = {
    epic: asNumber(stopAfter.epic, "stopAfter.epic"),
  };
  if (stopAfter.openReleasePR !== undefined) {
    stopAfterNormalized.openReleasePR = asBoolean(
      stopAfter.openReleasePR,
      "stopAfter.openReleasePR",
    );
  }
  if (stopAfter.mergeReleasePR !== undefined) {
    stopAfterNormalized.mergeReleasePR = asBoolean(
      stopAfter.mergeReleasePR,
      "stopAfter.mergeReleasePR",
    );
  }
  if (stopAfter.releaseTag !== undefined) {
    stopAfterNormalized.releaseTag = asString(
      stopAfter.releaseTag,
      "stopAfter.releaseTag",
    );
  }
  if (stopAfter.githubRelease !== undefined) {
    stopAfterNormalized.githubRelease = asBoolean(
      stopAfter.githubRelease,
      "stopAfter.githubRelease",
    );
  }
  if (stopAfter.mainSyncedBackToStaging !== undefined) {
    stopAfterNormalized.mainSyncedBackToStaging = asBoolean(
      stopAfter.mainSyncedBackToStaging,
      "stopAfter.mainSyncedBackToStaging",
    );
  }

  const retryBudgetNormalized: RunManifest["retryBudget"] = {
    implementationRepair: asNumber(
      retryBudget.implementationRepair,
      "retryBudget.implementationRepair",
    ),
    verifierRerun: asNumber(retryBudget.verifierRerun, "retryBudget.verifierRerun"),
    transientCiRerun: asNumber(
      retryBudget.transientCiRerun,
      "retryBudget.transientCiRerun",
    ),
  };
  if (retryBudget.deploymentRepair !== undefined) {
    retryBudgetNormalized.deploymentRepair = asNumber(
      retryBudget.deploymentRepair,
      "retryBudget.deploymentRepair",
    );
  }

  return {
    schemaVersion: asNumber(raw.schemaVersion, "schemaVersion"),
    runId: asString(raw.runId, "runId"),
    active: asBoolean(raw.active, "active"),
    epic: {
      key: asString(epic.key, "epic.key"),
      issue: asNumber(epic.issue, "epic.issue"),
      title: asString(epic.title, "epic.title"),
      estimateHours: asNumber(epic.estimateHours, "epic.estimateHours"),
    },
    baseBranch: asString(raw.baseBranch, "baseBranch"),
    workspace,
    merge: {
      method: asString(merge.method, "merge.method"),
      retainFeatureBranch: asBoolean(
        merge.retainFeatureBranch,
        "merge.retainFeatureBranch",
      ),
    },
    autonomy: {
      sequentialStories: asBoolean(
        autonomy.sequentialStories,
        "autonomy.sequentialStories",
      ),
      automaticStoryMerge: asBoolean(
        autonomy.automaticStoryMerge,
        "autonomy.automaticStoryMerge",
      ),
      automaticNextStory: asBoolean(
        autonomy.automaticNextStory,
        "autonomy.automaticNextStory",
      ),
      finalReleasePR: {
        base: asString(finalReleasePR.base, "autonomy.finalReleasePR.base"),
        head: asString(finalReleasePR.head, "autonomy.finalReleasePR.head"),
        open: asBoolean(finalReleasePR.open, "autonomy.finalReleasePR.open"),
        merge: asBoolean(finalReleasePR.merge, "autonomy.finalReleasePR.merge"),
      },
    },
    retryBudget: retryBudgetNormalized,
    roles,
    scopeBoundary,
    resetPolicy,
    provider,
    regenerationPolicy,
    scope,
    featureFlags,
    release,
    deployment,
    effort,
    evidenceReuse,
    documentation,
    stories,
    finalization,
    stopAfter: stopAfterNormalized,
    authorizationExpiry: asString(raw.authorizationExpiry, "authorizationExpiry"),
  };
}

function isPositiveBoundedInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_RETRY;
}

function hasApprovedBranchPrefix(branch: string): boolean {
  return APPROVED_BRANCH_PREFIXES.some((prefix) => branch.startsWith(prefix));
}

function validateManifestStructure(
  file: string,
  manifest: RunManifest,
  knownIssueNumbers: Set<number>,
): void {
  const label = file;

  if (manifest.schemaVersion !== 1) {
    fail(`${label}: schemaVersion must be 1.`);
  }
  if (!/^uxds-[a-z0-9-]+$/.test(manifest.runId)) {
    fail(`${label}: runId must match uxds-<slug>.`);
  }
  if (!/^E\d+$/.test(manifest.epic.key)) {
    fail(`${label}: epic.key must match E<number>.`);
  }
  if (!Number.isInteger(manifest.epic.issue) || manifest.epic.issue < 1) {
    fail(`${label}: epic.issue must be a positive integer.`);
  }
  if (manifest.epic.title.trim().length === 0) {
    fail(`${label}: epic.title must be non-empty.`);
  }
  if (
    typeof manifest.epic.estimateHours !== "number" ||
    Number.isNaN(manifest.epic.estimateHours) ||
    manifest.epic.estimateHours <= 0
  ) {
    fail(`${label}: epic.estimateHours must be a positive number.`);
  }
  if (manifest.baseBranch !== "staging") {
    fail(`${label}: baseBranch must be staging.`);
  }
  if (manifest.merge.method !== "merge") {
    fail(`${label}: merge.method must be merge.`);
  }
  if (manifest.merge.retainFeatureBranch !== true) {
    fail(`${label}: merge.retainFeatureBranch must be true.`);
  }

  if (manifest.workspace) {
    if (manifest.workspace.mode !== "single-checkout") {
      fail(`${label}: workspace.mode must be single-checkout when declared.`);
    }
    if (manifest.workspace.useWorktrees !== false) {
      fail(`${label}: workspace.useWorktrees must be false when declared.`);
    }
  }

  if (
    manifest.autonomy.finalReleasePR.base !== "main" ||
    manifest.autonomy.finalReleasePR.head !== "staging" ||
    manifest.autonomy.finalReleasePR.open !== true
  ) {
    fail(`${label}: finalReleasePR must open staging→main.`);
  }

  const releaseAuthorized =
    manifest.release !== undefined &&
    manifest.release.signedAnnotatedTag === true &&
    manifest.release.createGitHubRelease === true;

  if (manifest.autonomy.finalReleasePR.merge === true && !releaseAuthorized) {
    fail(
      `${label}: finalReleasePR.merge may be true only when release.signedAnnotatedTag and release.createGitHubRelease authorize the final merge.`,
    );
  }

  if (manifest.autonomy.finalReleasePR.merge === false && releaseAuthorized) {
    fail(
      `${label}: release-authorized manifests must set finalReleasePR.merge to true.`,
    );
  }

  if (
    !isPositiveBoundedInteger(manifest.retryBudget.implementationRepair) ||
    !isPositiveBoundedInteger(manifest.retryBudget.verifierRerun) ||
    !isPositiveBoundedInteger(manifest.retryBudget.transientCiRerun)
  ) {
    fail(
      `${label}: retryBudget values must be positive integers between 1 and ${MAX_RETRY}.`,
    );
  }

  if (
    manifest.retryBudget.deploymentRepair !== undefined &&
    !isPositiveBoundedInteger(manifest.retryBudget.deploymentRepair)
  ) {
    fail(
      `${label}: retryBudget.deploymentRepair must be a positive integer between 1 and ${MAX_RETRY} when declared.`,
    );
  }

  if (manifest.stopAfter.epic !== manifest.epic.issue) {
    fail(`${label}: stopAfter.epic must match epic.issue.`);
  }

  const legacyStopAfter =
    manifest.stopAfter.openReleasePR !== undefined ||
    manifest.stopAfter.mergeReleasePR !== undefined;
  const releaseStopAfter =
    manifest.stopAfter.releaseTag !== undefined ||
    manifest.stopAfter.githubRelease !== undefined ||
    manifest.stopAfter.mainSyncedBackToStaging !== undefined;

  if (legacyStopAfter && releaseStopAfter) {
    fail(
      `${label}: stopAfter must use either legacy open/merge release PR fields or release-complete fields, not both.`,
    );
  }

  if (!legacyStopAfter && !releaseStopAfter) {
    fail(
      `${label}: stopAfter must declare either openReleasePR/mergeReleasePR or releaseTag/githubRelease/mainSyncedBackToStaging.`,
    );
  }

  if (legacyStopAfter) {
    if (manifest.stopAfter.openReleasePR === undefined || manifest.stopAfter.mergeReleasePR === undefined) {
      fail(
        `${label}: legacy stopAfter requires both openReleasePR and mergeReleasePR.`,
      );
    } else {
      if (manifest.stopAfter.openReleasePR !== manifest.autonomy.finalReleasePR.open) {
        fail(`${label}: stopAfter.openReleasePR must match autonomy.finalReleasePR.open.`);
      }
      if (manifest.stopAfter.mergeReleasePR !== manifest.autonomy.finalReleasePR.merge) {
        fail(
          `${label}: stopAfter.mergeReleasePR must match autonomy.finalReleasePR.merge.`,
        );
      }
    }
  }

  if (releaseStopAfter) {
    if (!releaseAuthorized || !manifest.release) {
      fail(
        `${label}: release-complete stopAfter requires a release section with signedAnnotatedTag and createGitHubRelease.`,
      );
    } else {
      if (manifest.stopAfter.releaseTag !== manifest.release.tag) {
        fail(`${label}: stopAfter.releaseTag must match release.tag.`);
      }
      if (manifest.stopAfter.githubRelease !== true) {
        fail(`${label}: stopAfter.githubRelease must be true for release-complete manifests.`);
      }
      if (manifest.stopAfter.mainSyncedBackToStaging !== true) {
        fail(
          `${label}: stopAfter.mainSyncedBackToStaging must be true for release-complete manifests.`,
        );
      }
      if (manifest.release.syncMainBackToStaging !== true) {
        fail(
          `${label}: release.syncMainBackToStaging must be true when stopAfter.mainSyncedBackToStaging is declared.`,
        );
      }
    }
  }

  if (manifest.release) {
    if (!/^v?\d+\.\d+\.\d+(-[a-z0-9.]+)?$/i.test(manifest.release.tag)) {
      fail(`${label}: release.tag must look like a semver tag.`);
    }
    if (manifest.release.signedAnnotatedTag !== true) {
      fail(`${label}: release.signedAnnotatedTag must be true when release is declared.`);
    }
  }

  if (manifest.deployment) {
    if (manifest.deployment.requiresSecretsInApp !== false) {
      fail(`${label}: deployment.requiresSecretsInApp must be false when declared.`);
    }
    if (manifest.deployment.staticOutputDirectory.trim().length === 0) {
      fail(`${label}: deployment.staticOutputDirectory must be non-empty when declared.`);
    }
  }

  if (manifest.effort) {
    if (manifest.effort.accounting !== "planned") {
      fail(`${label}: effort.accounting must be planned when declared.`);
    }
    const sum =
      manifest.effort.e1 +
      manifest.effort.e2 +
      manifest.effort.e3 +
      manifest.effort.e4 +
      manifest.effort.e5 +
      manifest.effort.e6;
    if (manifest.effort.total !== sum) {
      fail(`${label}: effort.total must equal the sum of e1–e6.`);
    }
    if (manifest.effort.total !== 50) {
      fail(`${label}: effort.total must equal the approved 50-hour planned allocation.`);
    }
    if (
      manifest.epic.key === "E6" &&
      manifest.effort.e6 !== manifest.epic.estimateHours
    ) {
      fail(`${label}: effort.e6 must match epic.estimateHours for E6 release manifests.`);
    }
  }

  if (manifest.authorizationExpiry.trim().length === 0) {
    fail(`${label}: authorizationExpiry must be present.`);
  }

  if (manifest.finalization) {
    if (manifest.finalization.deactivateManifest !== true) {
      fail(`${label}: finalization.deactivateManifest must be true when declared.`);
    }
    if (!hasApprovedBranchPrefix(manifest.finalization.closureBranch)) {
      fail(`${label}: finalization.closureBranch must use an approved prefix.`);
    }
  }

  if (manifest.roles) {
    if (manifest.roles.options.length === 0) {
      fail(`${label}: roles.options must be non-empty when roles is declared.`);
    }
    if (!manifest.roles.options.includes(manifest.roles.default)) {
      fail(`${label}: roles.default must be included in roles.options.`);
    }
    if (manifest.roles.demoOnly !== true) {
      fail(`${label}: roles.demoOnly must be true when roles is declared.`);
    }
    if (manifest.roles.separateFromPersonas !== true) {
      fail(
        `${label}: roles.separateFromPersonas must be true when roles is declared.`,
      );
    }
  }

  if (manifest.scopeBoundary) {
    if (manifest.scopeBoundary.providerBackedRegeneration !== false) {
      fail(
        `${label}: scopeBoundary.providerBackedRegeneration must be false when declared.`,
      );
    }
    if (manifest.scopeBoundary.designAgentProvider !== false) {
      fail(`${label}: scopeBoundary.designAgentProvider must be false when declared.`);
    }
    if (manifest.scopeBoundary.generatedScreenVariant !== false) {
      fail(
        `${label}: scopeBoundary.generatedScreenVariant must be false when declared.`,
      );
    }
    if (
      !Number.isInteger(manifest.scopeBoundary.nextOwningEpic) ||
      manifest.scopeBoundary.nextOwningEpic < 1
    ) {
      fail(`${label}: scopeBoundary.nextOwningEpic must be a positive integer.`);
    }
  }

  if (manifest.resetPolicy) {
    if (manifest.resetPolicy.removeManagedGovernanceKeyOnly !== true) {
      fail(
        `${label}: resetPolicy.removeManagedGovernanceKeyOnly must be true when declared.`,
      );
    }
    if (manifest.resetPolicy.prohibitLocalStorageClear !== true) {
      fail(
        `${label}: resetPolicy.prohibitLocalStorageClear must be true when declared.`,
      );
    }
    for (const key of [
      "preserveUXSpec",
      "preservePersonas",
      "preserveJourneys",
      "preserveDesignTokens",
      "preserveFeatureFlags",
    ] as const) {
      if (manifest.resetPolicy[key] !== true) {
        fail(`${label}: resetPolicy.${key} must be true when declared.`);
      }
    }
  }

  if (manifest.provider) {
    if (manifest.provider.port !== "DesignAgentProvider") {
      fail(`${label}: provider.port must be DesignAgentProvider when declared.`);
    }
    if (manifest.provider.implementation !== "deterministic-mock") {
      fail(
        `${label}: provider.implementation must be deterministic-mock when declared.`,
      );
    }
    if (manifest.provider.targetScreenId.trim().length === 0) {
      fail(`${label}: provider.targetScreenId must be non-empty when declared.`);
    }
    if (
      typeof manifest.provider.simulatedLatencyMs !== "number" ||
      Number.isNaN(manifest.provider.simulatedLatencyMs) ||
      manifest.provider.simulatedLatencyMs <= 0
    ) {
      fail(`${label}: provider.simulatedLatencyMs must be a positive number.`);
    }
    if (manifest.provider.supportsAbortSignal !== true) {
      fail(`${label}: provider.supportsAbortSignal must be true when declared.`);
    }
    if (manifest.provider.controlledFailure !== true) {
      fail(`${label}: provider.controlledFailure must be true when declared.`);
    }
    if (manifest.provider.externalNetwork !== false) {
      fail(`${label}: provider.externalNetwork must be false when declared.`);
    }
    if (manifest.provider.requiresSecrets !== false) {
      fail(`${label}: provider.requiresSecrets must be false when declared.`);
    }
    if (manifest.provider.realLlm !== false) {
      fail(`${label}: provider.realLlm must be false when declared.`);
    }
  }

  if (manifest.regenerationPolicy) {
    for (const key of [
      "requireLatestCurrentVersionRevision",
      "providerOutputRuntimeValidation",
      "rejectDuplicateVersionIds",
      "atomicEventAndVersionActivation",
      "validateRevisionCrossReferences",
      "validateProviderScreenIdentity",
      "rejectStaleAsyncCompletion",
      "persistContentReference",
      "preserveCurrentVersionOnFailure",
      "preserveCurrentVersionOnCancellation",
    ] as const) {
      if (manifest.regenerationPolicy[key] !== true) {
        fail(`${label}: regenerationPolicy.${key} must be true when declared.`);
      }
    }
  }

  if (manifest.scope) {
    if (manifest.scope.activateCutLine !== false) {
      fail(`${label}: scope.activateCutLine must be false when declared.`);
    }
    for (const key of [
      "completeVersionHistory",
      "completeAccessibilityOverlay",
      "contrastBadges",
      "resilientStates",
      "reducedMotion",
      "visualPolish",
    ] as const) {
      if (manifest.scope[key] !== true) {
        fail(`${label}: scope.${key} must be true when declared.`);
      }
    }
  }

  if (manifest.featureFlags) {
    for (const key of [
      "enableVersionHistory",
      "enableAccessibilityOverlay",
      "enableContrastBadges",
      "enableControlledProviderFailure",
    ] as const) {
      if (manifest.featureFlags[key] !== true) {
        fail(`${label}: featureFlags.${key} must be true when declared.`);
      }
    }
  }

  if (manifest.stories.length === 0) {
    fail(`${label}: stories must contain at least one story.`);
  }

  const storyKeys = new Set<string>();
  const storyIssues = new Set<number>();
  const taskNumbers = new Set<number>();
  const branches = new Set<string>();
  const queueIssueOrder: number[] = [];

  for (let index = 0; index < manifest.stories.length; index += 1) {
    const story = manifest.stories[index]!;
    const storyLabel = `${label} stories[${index}] (${story.key})`;

    if (!/^US-\d+\.\d+$/.test(story.key)) {
      fail(`${storyLabel}: key must match US-<epic>.<n>.`);
    }
    if (storyKeys.has(story.key)) {
      fail(`${label}: duplicate story key ${story.key}.`);
    }
    storyKeys.add(story.key);

    if (!Number.isInteger(story.issue) || story.issue < 1) {
      fail(`${storyLabel}: issue must be a positive integer.`);
    }
    if (storyIssues.has(story.issue)) {
      fail(`${label}: duplicate story issue #${story.issue}.`);
    }
    storyIssues.add(story.issue);
    queueIssueOrder.push(story.issue);
    knownIssueNumbers.add(story.issue);

    if (story.tasks.length === 0) {
      fail(`${storyLabel}: tasks must be non-empty.`);
    }
    for (const task of story.tasks) {
      if (!Number.isInteger(task) || task < 1) {
        fail(`${storyLabel}: task numbers must be positive integers.`);
      }
      if (taskNumbers.has(task)) {
        fail(`${label}: duplicate task number #${task}.`);
      }
      taskNumbers.add(task);
      knownIssueNumbers.add(task);
    }

    if (!hasApprovedBranchPrefix(story.branch)) {
      fail(`${storyLabel}: branch must use an approved prefix.`);
    }
    if (branches.has(story.branch)) {
      fail(`${label}: duplicate branch ${story.branch}.`);
    }
    branches.add(story.branch);

    if (story.dependsOn.length === 0) {
      fail(`${storyLabel}: dependsOn must be non-empty.`);
    }

    const suggested = story.ticketSuggestedBranch ?? story.branch;
    if (suggested !== story.branch) {
      if (!story.ticketSuggestedBranch || !story.branchOverrideReason) {
        fail(
          `${storyLabel}: branch override requires ticketSuggestedBranch and branchOverrideReason.`,
        );
      } else if (story.branchOverrideReason.trim().length < 12) {
        fail(`${storyLabel}: branchOverrideReason must explain the human-approved override.`);
      }
    }

    const cutScope = story.authorizedCutScope ?? story.authorizedScope;
    if (cutScope !== undefined) {
      if (cutScope.activateCutLine === true) {
        fail(
          `${storyLabel}: authorized cut scope must not activate the cut line during this run.`,
        );
      }
    }

    for (const dependency of story.dependsOn) {
      if (!Number.isInteger(dependency) || dependency < 1) {
        fail(`${storyLabel}: dependsOn entries must be positive integers.`);
      }
      const earlierInQueue = queueIssueOrder.slice(0, index).includes(dependency);
      const isExternal = !storyIssues.has(dependency) && !earlierInQueue;
      if (isExternal) {
        // External dependencies are allowed when explicitly listed; they must not
        // refer to a later story in this same manifest queue.
        const laterInQueue = manifest.stories
          .slice(index + 1)
          .some((candidate) => candidate.issue === dependency);
        if (laterInQueue) {
          fail(
            `${storyLabel}: dependsOn #${dependency} refers to a later story in the same queue.`,
          );
        }
      } else if (!earlierInQueue && storyIssues.has(dependency)) {
        fail(
          `${storyLabel}: internal dependency #${dependency} must appear earlier in the queue.`,
        );
      }
    }
  }

  if (manifest.finalization) {
    if (branches.has(manifest.finalization.closureBranch)) {
      fail(`${label}: finalization.closureBranch must be unique among story branches.`);
    }
  }
}

const cli = parseCliExpectations(process.argv.slice(2));

mustExist(".agents/skills/uxds-story-loop/SKILL.md");
mustExist(".agents/verifiers/uxds-story-verifier.md");
mustExist("scripts/agent/project-status.ts");
mustExist("scripts/agent/validate-agent-control.ts");
mustExist(".github/pull_request_template.md");
mustExist(".cursor/rules/uxds-story-loop.mdc");
mustExist(".codex/agents/uxds-story-verifier.toml");
mustExist("AGENTS.md");
mustExist("docs/UX_Design_Studio_PRD_v1.0.md");
mustExist("docs/UX_Design_Studio_Technical_Architecture_v1.0.md");
mustExist("docs/UX_Design_Studio_Development_Plan_v1.0.md");

if (existsSync(path.join(root, ".cursor/rules/uxds-e1-loop.mdc"))) {
  fail("Legacy Cursor rule .cursor/rules/uxds-e1-loop.mdc must be removed.");
}
if (existsSync(path.join(root, ".codex/agents/uxds-e1-verifier.toml"))) {
  fail("Legacy Codex wrapper .codex/agents/uxds-e1-verifier.toml must be removed.");
}

const skill = read(".agents/skills/uxds-story-loop/SKILL.md");
if (!/^---\n[\s\S]*?name:\s*uxds-story-loop\n[\s\S]*?---/m.test(skill)) {
  fail("Skill metadata must include YAML frontmatter with name: uxds-story-loop.");
}
if (!skill.includes("description:")) {
  fail("Skill metadata must include a description.");
}

const requiredSkillSections = [
  "## Purpose",
  "## Inputs",
  "## Required source reads",
  "## Run manifest loading",
  "## Ticket readiness validation",
  "## Dependency validation",
  "## Project status transitions",
  "## Branch creation",
  "## Implementation boundaries",
  "## Focused verification",
  "## Full verification",
  "## Independent verifier invocation",
  "## Retry accounting",
  "## Signed commit gate",
  "## PR creation",
  "## CI monitoring",
  "## Remote signature verification",
  "## Automatic merge commit",
  "## Issue and Project updates",
  "## Next-story selection",
  "## Recovery after interruption",
  "## Hard-stop conditions",
  "## Final epic convergence verification",
];

for (const section of requiredSkillSections) {
  if (!skill.includes(section)) {
    fail(`Skill missing required section: ${section}`);
  }
}

if (!skill.includes("One implementation repair")) {
  fail("Skill must define the one implementation-repair retry limit.");
}
if (!skill.includes("One verifier rerun")) {
  fail("Skill must define the one verifier-rerun retry limit.");
}
if (!skill.includes("One CI rerun")) {
  fail("Skill must define the one CI-rerun retry limit.");
}
if (!skill.includes("git commit -S") || !skill.includes("git verify-commit")) {
  fail("Skill must include the signed-commit hard stop.");
}
if (!skill.includes("Never push directly to `staging` or `main`")) {
  fail("Skill must prohibit direct pushes to staging and main.");
}
if (!skill.includes("exact branch name")) {
  fail("Skill must require the exact branch name from the story.");
}
if (!skill.includes("ticketSuggestedBranch") || !skill.includes("branchOverrideReason")) {
  fail("Skill must document manifest branch override evidence fields.");
}
if (!skill.includes("useWorktrees") || !skill.includes("single-checkout")) {
  fail("Skill must document single-checkout workspace behavior.");
}
if (!skill.includes("roles") || !skill.includes("resetPolicy") || !skill.includes("scopeBoundary")) {
  fail("Skill must recognize roles, resetPolicy, and scopeBoundary manifest metadata.");
}
if (!skill.includes("provider") || !skill.includes("regenerationPolicy")) {
  fail("Skill must recognize provider and regenerationPolicy manifest metadata.");
}
if (!skill.includes("authorizedCutScope") && !skill.includes("authorizedScope")) {
  fail("Skill must recognize authorized cut-scope metadata.");
}
if (!skill.includes("atomic version activation") && !skill.includes("stale-response")) {
  fail("Skill must require stale-response and atomic version activation verification.");
}
if (!skill.includes("provider-backed regeneration") && !skill.includes("DesignAgentProvider")) {
  fail("Skill must require epic-boundary exclusion verification for provider-backed regeneration.");
}
if (skill.includes("#5 requires #2") || skill.includes("#8 requires #5")) {
  fail("Skill must not hard-code E1 dependency pairs.");
}
if (/E1-only autonomous chaining/i.test(skill)) {
  fail("Skill must not hard-code E1-only autonomous chaining.");
}
if (/active E2 authorization|requires E2|only authorize stories #12/i.test(skill)) {
  fail("Skill must not hard-code E2-only autonomy.");
}

const verifier = read(".agents/verifiers/uxds-story-verifier.md");
const requiredVerdictFields = [
  "VERDICT:",
  "STORY:",
  "SCOPE:",
  "ACCEPTANCE:",
  "TASKS:",
  "ARCHITECTURE:",
  "TESTS:",
  "ACCESSIBILITY:",
  "SECURITY:",
  "FINDINGS:",
  "REQUIRED_REPAIR:",
  "SAFE_TO_COMMIT:",
];
for (const field of requiredVerdictFields) {
  if (!verifier.includes(field)) {
    fail(`Verifier contract missing required field: ${field}`);
  }
}
if (!verifier.includes("must not")) {
  fail("Verifier contract must declare read-only prohibitions.");
}
if (!verifier.includes("modify files")) {
  fail("Verifier contract must prohibit modifying files.");
}
if (!verifier.includes("active run manifest")) {
  fail("Verifier must support manifest-aware verification.");
}
if (!verifier.includes("E3-specific") && !verifier.includes("When E3 work is in scope")) {
  fail("Verifier must include E3-specific verification criteria.");
}
if (!verifier.includes("E4-specific") && !verifier.includes("When E4 work is in scope")) {
  fail("Verifier must include E4-specific verification criteria.");
}
if (!verifier.includes("E5-specific") && !verifier.includes("When E5 work is in scope")) {
  fail("Verifier must include E5-specific verification criteria.");
}
if (!verifier.includes("E6-specific") && !verifier.includes("When E6 work is in scope")) {
  fail("Verifier must include E6-specific verification criteria.");
}
if (!verifier.includes("provider-backed regeneration") && !verifier.includes("DesignAgentProvider")) {
  fail("Verifier must include E4/E5 regeneration-boundary checks.");
}
if (!verifier.includes("atomic") || !verifier.includes("duplicate generated version")) {
  fail("Verifier must include E5 atomic activation and duplicate-version checks.");
}
if (!verifier.includes("localStorage.clear()")) {
  fail("Verifier must prohibit localStorage.clear() for managed reset.");
}
if (!verifier.includes("critical RTL") && !verifier.includes("React Testing Library")) {
  fail("Verifier must include E6 critical RTL workflow checks.");
}
if (!verifier.includes("G5") && !verifier.includes("Hard Gate G5")) {
  fail("Verifier must include E6 Hard Gate G5 checks.");
}

const cursorRule = read(".cursor/rules/uxds-story-loop.mdc");
if (!cursorRule.includes("AGENTS.md")) {
  fail("Cursor rule must reference AGENTS.md.");
}
if (!cursorRule.includes(".agents/runs/")) {
  fail("Cursor rule must discover manifests under .agents/runs/.");
}
if (!cursorRule.includes(".agents/skills/uxds-story-loop/SKILL.md")) {
  fail("Cursor rule must load the canonical story-loop skill.");
}
if (!cursorRule.includes(".agents/verifiers/uxds-story-verifier.md")) {
  fail("Cursor rule must invoke the canonical verifier.");
}
if (/E1-only|issues `#2`, `#5`, and `#8`/i.test(cursorRule)) {
  fail("Cursor rule must not hard-code E1-only autonomy.");
}
if (/active E2 authorization|\.agents\/runs\/e2\.yml/i.test(cursorRule)) {
  fail("Cursor rule must not hard-code the active epic manifest path.");
}

const codexWrapper = read(".codex/agents/uxds-story-verifier.toml");
if (!codexWrapper.includes('name = "uxds-story-verifier"')) {
  fail("Codex wrapper must be named uxds-story-verifier.");
}
if (!codexWrapper.includes("readonly = true")) {
  fail("Codex wrapper must remain read-only.");
}
if (!codexWrapper.includes('.agents/verifiers/uxds-story-verifier.md')) {
  fail("Codex wrapper must reference the canonical verifier contract.");
}
if (
  !codexWrapper.includes("modify_files = false") ||
  !codexWrapper.includes("commit = false") ||
  !codexWrapper.includes("push = false") ||
  !codexWrapper.includes("open_pull_requests = false") ||
  !codexWrapper.includes("merge_pull_requests = false") ||
  !codexWrapper.includes("update_issues = false") ||
  !codexWrapper.includes("update_project = false")
) {
  fail("Codex wrapper must keep write capabilities disabled.");
}

const agents = read("AGENTS.md");
if (!agents.includes("## Authorized Autonomous Epic Runs")) {
  fail("AGENTS.md must include the Authorized Autonomous Epic Runs section.");
}
if (agents.includes("## E1 Autonomous Loop Exception")) {
  fail("AGENTS.md must not retain an active E1 Autonomous Loop Exception section.");
}
if (/The active E2 authorization is/i.test(agents)) {
  fail("AGENTS.md must not hard-code the active E2 authorization path.");
}
if (!agents.includes("Discover the active manifest") && !agents.includes("discover the active manifest")) {
  fail("AGENTS.md must require dynamic active-manifest discovery.");
}
if (!agents.includes("zero or one") && !agents.includes("Zero or one")) {
  fail("AGENTS.md must permit zero or one active manifest for repository validation.");
}
if (!agents.includes("WIP limit of one implementation story")) {
  fail("AGENTS.md must preserve WIP limit 1.");
}
if (!agents.includes("signed commits") && !agents.includes("Signed commits")) {
  fail("AGENTS.md must continue requiring signed commits.");
}
if (!agents.includes("No direct pushes to `staging` or `main`")) {
  fail("AGENTS.md must continue prohibiting direct pushes.");
}
if (!agents.includes("do not squash") && !agents.includes("do not delete the feature branch")) {
  fail("AGENTS.md must preserve merge-commit and retained-branch policy.");
}
if (
  !agents.includes("Never merge your own PR") &&
  !agents.includes("except under an active authorized autonomous epic run")
) {
  fail("AGENTS.md must keep self-merge prohibited outside authorized runs.");
}
if (!/inspect `package\.json`/i.test(agents)) {
  fail("AGENTS.md must require dynamic package.json inspection.");
}
if (!agents.includes("append-only domain events")) {
  fail("AGENTS.md must preserve append-only governance events.");
}
if (!agents.includes("second mutable status source")) {
  fail("AGENTS.md must prohibit a second mutable status source.");
}
if (!agents.includes("injected outside the reducer")) {
  fail("AGENTS.md must require injected clock and ID generation.");
}
if (!agents.includes("separate from UX personas")) {
  fail("AGENTS.md must keep demo roles separate from UX personas.");
}
if (!agents.includes("localStorage.clear()")) {
  fail("AGENTS.md must prohibit localStorage.clear() for demo reset.");
}
if (
  !agents.includes("Outside an authorized regeneration epic run, provider-backed regeneration remains out of scope")
) {
  fail(
    "AGENTS.md must keep provider-backed regeneration out of scope outside an authorized regeneration epic run.",
  );
}
if (!agents.includes("Provider output is untrusted until shared runtime screen validation succeeds")) {
  fail("AGENTS.md must require runtime validation of provider output.");
}
if (!agents.includes("atomic") || !agents.includes("Generated screen-version IDs must be unique")) {
  fail("AGENTS.md must require unique generated version IDs and atomic activation.");
}
if (!agents.includes("No later epic, including E6, starts automatically")) {
  fail("AGENTS.md must prohibit automatic E6 start after regeneration-epic finalization.");
}

const runsDir = path.join(root, ".agents/runs");
const runFiles = existsSync(runsDir)
  ? readdirSync(runsDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  : [];

if (runFiles.length === 0) {
  fail("At least one historical or active run manifest must exist under .agents/runs/.");
}

const manifests: Array<{ file: string; manifest: RunManifest }> = [];
const runIds = new Set<string>();
const knownIssueNumbers = new Set<number>();

for (const file of runFiles) {
  const relative = `.agents/runs/${file}`;
  const raw = parseRunManifestYaml(read(relative));
  const manifest = normalizeManifest(raw);

  if (runIds.has(manifest.runId)) {
    fail(`Duplicate runId across manifests: ${manifest.runId}.`);
  }
  runIds.add(manifest.runId);

  validateManifestStructure(relative, manifest, knownIssueNumbers);
  manifests.push({ file: relative, manifest });
}

const activeManifests = manifests.filter((entry) => entry.manifest.active);
if (activeManifests.length > 1) {
  fail(
    `Multiple active autonomous manifests are not allowed: ${activeManifests
      .map((entry) => entry.file)
      .join(", ")}`,
  );
}

if (cli.expectNoActiveRun) {
  if (activeManifests.length !== 0) {
    fail(
      `Expected no active run, but found: ${activeManifests
        .map((entry) => `${entry.manifest.runId} (${entry.file})`)
        .join(", ")}`,
    );
  }
}

if (cli.expectActiveRunId) {
  if (activeManifests.length !== 1) {
    fail(
      `Expected active run ${cli.expectActiveRunId}, but found ${activeManifests.length} active manifest(s).`,
    );
  } else if (activeManifests[0]!.manifest.runId !== cli.expectActiveRunId) {
    fail(
      `Expected active run ${cli.expectActiveRunId}, found ${activeManifests[0]!.manifest.runId}.`,
    );
  }
}

const prTemplate = read(".github/pull_request_template.md");
const forbiddenAttribution = [
  "Made with Cursor",
  "Generated by Cursor",
  "Generated with Cursor",
  "Co-Authored-By: Cursor",
  "Co-authored-by: Cursor",
];
for (const phrase of forbiddenAttribution) {
  if (
    prTemplate.includes(phrase) ||
    skill.includes(phrase) ||
    agents.includes(phrase) ||
    verifier.includes(phrase)
  ) {
    fail(`Forbidden Cursor attribution text present: ${phrase}`);
  }
}

const sealForgeTerms = ["SealForge", "sealforge", "seal-forge"];
for (const file of [skill, verifier, agents, prTemplate, cursorRule, codexWrapper]) {
  for (const term of sealForgeTerms) {
    if (file.includes(term)) {
      fail(`SealForge-specific term remains: ${term}`);
    }
  }
}

if (!prTemplate.includes("## Summary") || !prTemplate.includes("## Verification")) {
  fail("Pull request template must include Summary and Verification sections.");
}
if (prTemplate.includes("Epic: #1")) {
  fail("Pull request template must not hard-code Epic #1.");
}
if (!prTemplate.includes("Epic: #<epic>")) {
  fail("Pull request template must use Epic: #<epic>.");
}
if (!prTemplate.includes("Plan validation") || !prTemplate.includes("Agent-control validation")) {
  fail("Pull request template must include plan and agent-control validation rows.");
}
if (!prTemplate.includes("Remote signature verification")) {
  fail("Pull request template must include remote signature verification.");
}
if (!prTemplate.includes("Visual/manual verification")) {
  fail("Pull request template must include visual/manual verification.");
}

if (errors.length > 0) {
  console.error("Agent-control validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      validated: [
        ".agents/skills/uxds-story-loop/SKILL.md",
        ".agents/verifiers/uxds-story-verifier.md",
        ...manifests.map((entry) => entry.file),
        "AGENTS.md Authorized Autonomous Epic Runs",
        ".cursor/rules/uxds-story-loop.mdc",
        ".codex/agents/uxds-story-verifier.toml",
        "scripts/agent/project-status.ts",
        ".github/pull_request_template.md",
      ],
      activeRun: activeManifests[0]
        ? {
            file: activeManifests[0].file,
            runId: activeManifests[0].manifest.runId,
          }
        : null,
      activeRunCount: activeManifests.length,
      expectations: {
        expectActiveRunId: cli.expectActiveRunId,
        expectNoActiveRun: cli.expectNoActiveRun,
      },
    },
    null,
    2,
  ),
);
