#!/usr/bin/env node
/**
 * Validates the UX Design Studio agent-control layer and active run manifests.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors: string[] = [];

type RunStory = {
  key: string;
  issue: number;
  tasks: number[];
  branch: string;
  dependsOn: number[];
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
  };
  stories: RunStory[];
  stopAfter: {
    epic: number;
    openReleasePR: boolean;
    mergeReleasePR: boolean;
  };
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
      return {
        key: asString(story.key, `stories[${index}].key`),
        issue: asNumber(story.issue, `stories[${index}].issue`),
        tasks: asNumberArray(story.tasks, `stories[${index}].tasks`),
        branch: asString(story.branch, `stories[${index}].branch`),
        dependsOn: asNumberArray(story.dependsOn, `stories[${index}].dependsOn`),
      };
    },
  );

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
    retryBudget: {
      implementationRepair: asNumber(
        retryBudget.implementationRepair,
        "retryBudget.implementationRepair",
      ),
      verifierRerun: asNumber(
        retryBudget.verifierRerun,
        "retryBudget.verifierRerun",
      ),
      transientCiRerun: asNumber(
        retryBudget.transientCiRerun,
        "retryBudget.transientCiRerun",
      ),
    },
    stories,
    stopAfter: {
      epic: asNumber(stopAfter.epic, "stopAfter.epic"),
      openReleasePR: asBoolean(stopAfter.openReleasePR, "stopAfter.openReleasePR"),
      mergeReleasePR: asBoolean(
        stopAfter.mergeReleasePR,
        "stopAfter.mergeReleasePR",
      ),
    },
  };
}

mustExist(".agents/skills/uxds-story-loop/SKILL.md");
mustExist(".agents/verifiers/uxds-story-verifier.md");
mustExist(".agents/runs/e2.yml");
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
if (skill.includes("#5 requires #2") || skill.includes("#8 requires #5")) {
  fail("Skill must not hard-code E1 dependency pairs.");
}
if (/E1-only autonomous chaining/i.test(skill)) {
  fail("Skill must not hard-code E1-only autonomous chaining.");
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
if (!agents.includes(".agents/runs/e2.yml")) {
  fail("AGENTS.md must authorize E2 through .agents/runs/e2.yml.");
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

const runsDir = path.join(root, ".agents/runs");
const runFiles = existsSync(runsDir)
  ? readdirSync(runsDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  : [];

const manifests: Array<{ file: string; manifest: RunManifest }> = [];
for (const file of runFiles) {
  const relative = `.agents/runs/${file}`;
  const raw = parseRunManifestYaml(read(relative));
  const manifest = normalizeManifest(raw);
  manifests.push({ file: relative, manifest });
}

const activeManifests = manifests.filter((entry) => entry.manifest.active);
if (activeManifests.length === 0) {
  fail("Exactly one active autonomous run manifest is required.");
} else if (activeManifests.length > 1) {
  fail(
    `Multiple active autonomous manifests are not allowed: ${activeManifests
      .map((entry) => entry.file)
      .join(", ")}`,
  );
}

const e2Entry = manifests.find((entry) => entry.file === ".agents/runs/e2.yml");
if (!e2Entry) {
  fail("Missing required active manifest .agents/runs/e2.yml.");
} else {
  const e2 = e2Entry.manifest;
  if (e2.schemaVersion !== 1) {
    fail("E2 manifest schemaVersion must be 1.");
  }
  if (e2.runId !== "uxds-e2") {
    fail("E2 manifest runId must be uxds-e2.");
  }
  if (!e2.active) {
    fail("E2 manifest must be active.");
  }
  if (e2.epic.key !== "E2" || e2.epic.issue !== 11) {
    fail("E2 manifest epic must be E2 issue #11.");
  }
  if (e2.baseBranch !== "staging") {
    fail("E2 manifest baseBranch must be staging.");
  }
  if (e2.merge.method !== "merge") {
    fail("E2 manifest merge.method must be merge.");
  }
  if (e2.merge.retainFeatureBranch !== true) {
    fail("E2 manifest must retain feature branches.");
  }
  if (
    e2.autonomy.finalReleasePR.base !== "main" ||
    e2.autonomy.finalReleasePR.head !== "staging" ||
    e2.autonomy.finalReleasePR.open !== true ||
    e2.autonomy.finalReleasePR.merge !== false
  ) {
    fail("E2 final release PR must open staging→main and must not merge.");
  }
  if (
    e2.retryBudget.implementationRepair !== 1 ||
    e2.retryBudget.verifierRerun !== 1 ||
    e2.retryBudget.transientCiRerun !== 1
  ) {
    fail("E2 retry budgets must equal 1 for each category.");
  }
  if (
    e2.stopAfter.epic !== 11 ||
    e2.stopAfter.openReleasePR !== true ||
    e2.stopAfter.mergeReleasePR !== false
  ) {
    fail("E2 stopAfter must close after epic #11 with open-only release PR.");
  }

  const expectedStories: Array<{
    key: string;
    issue: number;
    tasks: number[];
    branch: string;
    dependsOn: number[];
  }> = [
    {
      key: "US-2.1",
      issue: 12,
      tasks: [13, 14],
      branch: "feat/uxds-12-implement-the-allowlisted-component-registry",
      dependsOn: [8],
    },
    {
      key: "US-2.2",
      issue: 15,
      tasks: [16, 17],
      branch: "feat/uxds-15-implement-recursive-composition-and-safe-actions",
      dependsOn: [12],
    },
    {
      key: "US-2.3",
      issue: 18,
      tasks: [19, 20],
      branch: "feat/uxds-18-apply-safe-runtime-design-tokens",
      dependsOn: [15],
    },
    {
      key: "US-2.4",
      issue: 21,
      tasks: [22, 23],
      branch: "feat/uxds-21-render-five-screens-with-generated-navigation",
      dependsOn: [18],
    },
  ];

  if (e2.stories.length !== expectedStories.length) {
    fail(
      `E2 manifest must contain exactly ${expectedStories.length} stories; found ${e2.stories.length}.`,
    );
  }

  for (let index = 0; index < expectedStories.length; index += 1) {
    const expected = expectedStories[index]!;
    const actual = e2.stories[index];
    if (!actual) {
      fail(`E2 manifest missing story at index ${index}.`);
      continue;
    }
    if (actual.key !== expected.key || actual.issue !== expected.issue) {
      fail(
        `E2 story mismatch at index ${index}: expected ${expected.key}/#${expected.issue}.`,
      );
    }
    if (
      actual.tasks.join(",") !== expected.tasks.join(",") ||
      actual.branch !== expected.branch ||
      actual.dependsOn.join(",") !== expected.dependsOn.join(",")
    ) {
      fail(
        `E2 story ${expected.key} tasks/branch/dependsOn must match the authorized queue.`,
      );
    }
  }

  const storyIssues = new Set(e2.stories.map((story) => story.issue));
  if ([...storyIssues].some((issue) => ![12, 15, 18, 21].includes(issue))) {
    fail("E2 manifest may only authorize stories #12, #15, #18, and #21.");
  }
  if (e2.stories.some((story) => story.issue > 21 && story.key.startsWith("US-3"))) {
    fail("Unsupported later epic stories must not appear in the active E2 manifest.");
  }
  if (manifests.some((entry) => /e3|uxds-e3/i.test(entry.file) && entry.manifest.active)) {
    fail("No unsupported later epic may be active alongside E2.");
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
        ".agents/runs/e2.yml",
        "AGENTS.md Authorized Autonomous Epic Runs",
        ".cursor/rules/uxds-story-loop.mdc",
        ".codex/agents/uxds-story-verifier.toml",
        "scripts/agent/project-status.ts",
        ".github/pull_request_template.md",
      ],
      activeRun: activeManifests[0]?.file ?? null,
    },
    null,
    2,
  ),
);
