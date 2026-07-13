#!/usr/bin/env tsx

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, closeSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type FieldType = "SINGLE_SELECT" | "NUMBER" | "TEXT";

interface TaskNode {
  key: string;
  title: string;
  hours: number;
  outcome: string;
  acceptanceCriteria: string[];
  dependsOn: string[];
  area: string;
  scope: string;
  priority: string;
  increment: string;
  prdReferences: string[];
  architectureReferences: string[];
}

interface StoryNode {
  key: string;
  title: string;
  hours: number;
  userStory: string;
  acceptanceCriteria: string[];
  tasks: TaskNode[];
  area: string;
  scope: string;
  priority: string;
  increment: string;
  prdReferences: string[];
  architectureReferences: string[];
  dependsOn: string[];
  branchType: string;
}

interface EpicNode {
  key: string;
  title: string;
  objective: string;
  hours: number;
  increment: string;
  area: string;
  scope: string;
  priority: string;
  prdReferences: string[];
  architectureReferences: string[];
  dependsOn: string[];
  stories: StoryNode[];
}

interface Plan {
  schemaVersion: number;
  planId: string;
  title: string;
  description: string;
  repository: {
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    integrationBranch: string;
    featureBaseBranch: string;
    releaseFlow: string;
    mergeMethod: string;
  };
  project: {
    owner: string;
    title: string;
    visibility: string;
    managedMarker: string;
    description: string;
    fields: Array<{ name: string; type: FieldType; options?: string[] }>;
    views: Array<{ name: string; layout: "board" | "table" | "roadmap"; filter?: string }>;
  };
  milestone: { title: string; description: string; dueOn: string };
  workflow: {
    statuses: string[];
    wipLimit: number;
    definitionOfReady: string[];
    definitionOfDone: string[];
    hardGates: Array<{ id: string; name: string; passCondition: string }>;
  };
  cutLine: {
    ordered: Array<{ order: number; feature: string; retain: string }>;
    neverCut: string[];
  };
  labels: Array<{ name: string; color: string; description: string }>;
  epics: EpicNode[];
}

interface FlatNode {
  key: string;
  type: "Epic" | "Story" | "Task";
  title: string;
  hours: number;
  description: string;
  acceptanceCriteria: string[];
  area: string;
  scope: string;
  priority: string;
  increment: string;
  prdReferences: string[];
  architectureReferences: string[];
  dependsOn: string[];
  parentKey?: string;
  branchType?: string;
}

interface GitHubIssue {
  id: number;
  node_id: string;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  pull_request?: unknown;
}

interface ProjectField {
  id: string;
  name: string;
  type: string;
  options?: Array<{ id: string; name: string }>;
}

interface ProjectItem {
  id: string;
  content?: { url?: string; number?: number; repository?: string };
}

interface ProjectDetails {
  id: string;
  number: number;
  title: string;
  url: string;
  readme: string;
  shortDescription: string;
  views: Array<{ id: string; number: number; name: string; layout: string }>;
  linkedRepositories: string[];
}

const API_VERSION = "2026-03-10";
const argv = new Set(process.argv.slice(2));
const validateOnly = argv.has("--validate-only");
const dryRun = argv.has("--dry-run");
const verbose = argv.has("--verbose");
const planPath = resolve(process.cwd(), ".github/import/development-plan.json");
const lockPath = resolve(process.cwd(), ".github/import/.uxds-import.lock");
const reportPath = resolve(process.cwd(), ".github/import/import-report.json");
const managedIssueRegex = /<!-- uxds-key:\s*([A-Za-z0-9.-]+)\s*-->/;
let lockFd: number | undefined;

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function fail(message: string): never {
  throw new Error(message);
}

function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function run(
  args: string[],
  options: { input?: string; allowFailure?: boolean; attempts?: number } = {},
): string {
  if (verbose) log(`$ gh ${args.join(" ")}`);
  const attempts = options.attempts ?? 4;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return execFileSync("gh", args, {
        encoding: "utf8",
        input: options.input,
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 20 * 1024 * 1024,
        env: { ...process.env, GH_PROMPT_DISABLED: "1" },
      }).trim();
    } catch (error) {
      const err = error as { status?: number; stderr?: unknown; stdout?: unknown };
      const stderr = String(err.stderr ?? "");
      const retryable =
        /secondary rate limit|rate limit|temporarily unavailable|502|503|504/i.test(stderr);
      if (retryable && attempt < attempts) {
        const wait = 1000 * attempt * attempt;
        log(`GitHub requested a retry. Waiting ${wait}ms...`);
        sleep(wait);
        continue;
      }
      if (options.allowFailure) return "";
      fail(`GitHub CLI failed: gh ${args.join(" ")}\n${stderr || String(error)}`);
    }
  }
  return "";
}

function runJson<T>(
  args: string[],
  options: { input?: string; allowFailure?: boolean; attempts?: number } = {},
): T {
  const output = run(args, options);
  if (!output) return null as T;
  try {
    return JSON.parse(output) as T;
  } catch {
    fail(`Expected JSON from: gh ${args.join(" ")}\nReceived:\n${output}`);
  }
}

function api<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  allowFailure = false,
): T {
  const args = [
    "api",
    path,
    "--method",
    method,
    "-H",
    "Accept: application/vnd.github+json",
    "-H",
    `X-GitHub-Api-Version: ${API_VERSION}`,
  ];
  const input = body === undefined ? undefined : JSON.stringify(body);
  if (input !== undefined) args.push("--input", "-");
  return runJson<T>(args, { input, allowFailure });
}

function flatten(plan: Plan): FlatNode[] {
  const nodes: FlatNode[] = [];
  for (const epic of plan.epics) {
    nodes.push({
      key: epic.key,
      type: "Epic",
      title: epic.title,
      hours: epic.hours,
      description: epic.objective,
      acceptanceCriteria: [
        `All ${epic.stories.length} child stories meet their acceptance criteria.`,
        `Epic total remains within ${epic.hours} planned hours.`,
      ],
      area: epic.area,
      scope: epic.scope,
      priority: epic.priority,
      increment: epic.increment,
      prdReferences: epic.prdReferences,
      architectureReferences: epic.architectureReferences,
      dependsOn: epic.dependsOn,
    });
    for (const story of epic.stories) {
      nodes.push({
        key: story.key,
        type: "Story",
        title: story.title,
        hours: story.hours,
        description: story.userStory,
        acceptanceCriteria: story.acceptanceCriteria,
        area: story.area,
        scope: story.scope,
        priority: story.priority,
        increment: story.increment,
        prdReferences: story.prdReferences,
        architectureReferences: story.architectureReferences,
        dependsOn: story.dependsOn,
        parentKey: epic.key,
        branchType: story.branchType,
      });
      for (const task of story.tasks) {
        nodes.push({
          key: task.key,
          type: "Task",
          title: task.title,
          hours: task.hours,
          description: task.outcome,
          acceptanceCriteria: task.acceptanceCriteria,
          area: task.area,
          scope: task.scope,
          priority: task.priority,
          increment: task.increment,
          prdReferences: task.prdReferences,
          architectureReferences: task.architectureReferences,
          dependsOn: task.dependsOn,
          parentKey: story.key,
        });
      }
    }
  }
  return nodes;
}

function validatePlan(plan: Plan): FlatNode[] {
  const errors: string[] = [];
  if (plan.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!/^[^/]+\/[^/]+$/.test(plan.repository.fullName)) {
    errors.push("repository.fullName must use owner/repository.");
  }
  if (plan.repository.featureBaseBranch !== "staging") {
    errors.push("featureBaseBranch must be staging.");
  }
  if (plan.repository.releaseFlow !== "staging -> main") {
    errors.push("releaseFlow must be staging -> main.");
  }
  const nodes = flatten(plan);
  const keys = new Set<string>();
  for (const node of nodes) {
    if (keys.has(node.key)) errors.push(`Duplicate plan key: ${node.key}`);
    keys.add(node.key);
    if (!(node.hours > 0)) errors.push(`${node.key} must have a positive estimate.`);
    if (!node.acceptanceCriteria.length) errors.push(`${node.key} has no acceptance criteria.`);
  }
  for (const node of nodes) {
    for (const dependency of node.dependsOn) {
      if (!keys.has(dependency)) errors.push(`${node.key} depends on unknown key ${dependency}.`);
      if (dependency === node.key) errors.push(`${node.key} cannot depend on itself.`);
    }
    if (node.parentKey && !keys.has(node.parentKey)) {
      errors.push(`${node.key} has unknown parent ${node.parentKey}.`);
    }
  }
  const total = nodes.filter((node) => node.type === "Task").reduce((sum, node) => sum + node.hours, 0);
  if (Math.abs(total - 50) > 0.001) errors.push(`Task estimates total ${total}, expected 50.`);
  if (plan.epics.length !== 6) errors.push(`Expected 6 epics, found ${plan.epics.length}.`);
  if (nodes.filter((node) => node.type === "Story").length !== 18) {
    errors.push("Expected 18 stories.");
  }
  if (nodes.filter((node) => node.type === "Task").length !== 36) {
    errors.push("Expected 36 tasks.");
  }

  // Detect dependency cycles across all plan nodes.
  const graph = new Map(nodes.map((node) => [node.key, node.dependsOn]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(key: string): void {
    if (visiting.has(key)) {
      errors.push(`Dependency cycle detected at ${key}.`);
      return;
    }
    if (visited.has(key)) return;
    visiting.add(key);
    for (const dep of graph.get(key) ?? []) visit(dep);
    visiting.delete(key);
    visited.add(key);
  }
  for (const key of graph.keys()) visit(key);

  if (errors.length) fail(`Plan validation failed:\n- ${errors.join("\n- ")}`);
  return nodes;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function scopeLabel(scope: string): string {
  const map: Record<string, string> = {
    Mandatory: "scope:mandatory",
    "Cut 1": "scope:cut-1",
    "Cut 2": "scope:cut-2",
    "Cut 3": "scope:cut-3",
    "Cut 4": "scope:cut-4",
  };
  return map[scope] ?? "scope:mandatory";
}

function incrementLabel(increment: string): string {
  return increment.startsWith("A ") ? "increment:a" : "increment:b";
}

function issueLabels(node: FlatNode): string[] {
  return [
    "uxds:managed",
    `type:${node.type.toLowerCase()}`,
    scopeLabel(node.scope),
    incrementLabel(node.increment),
    `priority:${node.priority.toLowerCase()}`,
    `area:${node.area.toLowerCase()}`,
  ];
}

function issueTitle(node: FlatNode): string {
  return `[${node.key}] ${node.title}`;
}

function issueBody(
  plan: Plan,
  node: FlatNode,
  number?: number,
  issueMap?: Map<string, GitHubIssue>,
): string {
  const lines: string[] = [
    `<!-- uxds-key: ${node.key} -->`,
    plan.project.managedMarker,
    "",
    `# ${node.key}: ${node.title}`,
    "",
    `**Work type:** ${node.type}  `,
    `**Estimate:** ${node.hours}h  `,
    `**Priority:** ${node.priority}  `,
    `**Scope:** ${node.scope}  `,
    `**Increment:** ${node.increment}  `,
    `**Area:** ${node.area}`,
    "",
    "## Outcome",
    "",
    node.description,
    "",
    "## Acceptance criteria",
    "",
    ...node.acceptanceCriteria.map((criterion) => `- [ ] ${criterion}`),
    "",
    "## Traceability",
    "",
    `- PRD: ${node.prdReferences.join(", ")}`,
    `- Architecture: ${node.architectureReferences.join(", ")}`,
    `- Plan key: \`${node.key}\``,
  ];

  if (node.parentKey) {
    const parent = issueMap?.get(node.parentKey);
    lines.push(`- Parent: ${parent ? `#${parent.number}` : `\`${node.parentKey}\``}`);
  }
  if (node.dependsOn.length) {
    lines.push(
      `- Blocked by: ${node.dependsOn
        .map((key) => {
          const dependency = issueMap?.get(key);
          return dependency ? `#${dependency.number}` : `\`${key}\``;
        })
        .join(", ")}`,
    );
  }
  if (node.type === "Story") {
    const branch = number
      ? `${node.branchType ?? "feat"}/uxds-${number}-${slug(node.title)}`
      : `${node.branchType ?? "feat"}/uxds-<issue-number>-${slug(node.title)}`;
    lines.push(
      "",
      "## Branch and pull request",
      "",
      `- Create from: \`${plan.repository.featureBaseBranch}\``,
      `- Suggested branch: \`${branch}\``,
      `- Pull request base: \`${plan.repository.integrationBranch}\``,
      `- Merge method: \`${plan.repository.mergeMethod}\``,
    );
  }
  lines.push(
    "",
    "## Guardrails",
    "",
    "- Do not weaken frozen Source of Truth, PRD, architecture, cut-line, or version-bound governance rules.",
    "- Do not add real AI, backend, production auth, or runtime Module Federation.",
    "- Run the narrowest relevant tests before the full quality gate.",
  );
  return `${lines.join("\n")}\n`;
}

function acquireLock(): void {
  mkdirSync(dirname(lockPath), { recursive: true });
  try {
    lockFd = openSync(lockPath, "wx");
    writeFileSync(lockFd, `${process.pid}\n${new Date().toISOString()}\n`);
  } catch {
    fail(`Another import may be running. Remove ${lockPath} only after confirming no importer process is active.`);
  }
}

function releaseLock(): void {
  if (lockFd !== undefined) {
    try {
      closeSync(lockFd);
    } catch {
      // fd may already be closed by a prior releaseLock call
    }
    lockFd = undefined;
  }
  if (existsSync(lockPath)) unlinkSync(lockPath);
}

function requireCommand(command: string): void {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore" });
  } catch {
    fail(`${command} is required but was not found in PATH.`);
  }
}

function preflightAuth(plan: Plan): void {
  requireCommand("gh");
  run(["auth", "status", "-h", "github.com"]);
  const login = run(["api", "user", "--jq", ".login"]);
  if (login.toLowerCase() !== plan.repository.owner.toLowerCase()) {
    fail(`Authenticated GitHub user is ${login}; expected ${plan.repository.owner}.`);
  }
  const repo = api<{ full_name: string; permissions?: { admin?: boolean; push?: boolean } }>(
    `repos/${plan.repository.fullName}`,
  );
  if (!repo || repo.full_name.toLowerCase() !== plan.repository.fullName.toLowerCase()) {
    fail(`Repository ${plan.repository.fullName} is not accessible.`);
  }
  if (!repo.permissions?.admin && !repo.permissions?.push) {
    fail(`Authenticated user does not have push access to ${plan.repository.fullName}.`);
  }
}

function ensureIntegrationBranch(plan: Plan): void {
  const base = api<{ object: { sha: string } }>(
    `repos/${plan.repository.fullName}/git/ref/heads/${plan.repository.defaultBranch}`,
  );
  if (!base?.object?.sha) fail(`Base branch ${plan.repository.defaultBranch} has no commit.`);
  const existing = api<{ object: { sha: string } }>(
    `repos/${plan.repository.fullName}/git/ref/heads/${plan.repository.integrationBranch}`,
    "GET",
    undefined,
    true,
  );
  if (!existing) {
    if (dryRun) {
      log(`[dry-run] Create ${plan.repository.integrationBranch} from ${plan.repository.defaultBranch}.`);
      return;
    }
    api(
      `repos/${plan.repository.fullName}/git/refs`,
      "POST",
      {
        ref: `refs/heads/${plan.repository.integrationBranch}`,
        sha: base.object.sha,
      },
    );
    log(`Created branch ${plan.repository.integrationBranch}.`);
    return;
  }

  const comparison = api<{ status: string; ahead_by: number; behind_by: number }>(
    `repos/${plan.repository.fullName}/compare/${plan.repository.defaultBranch}...${plan.repository.integrationBranch}`,
  );
  if (comparison.status === "diverged") {
    fail(
      `${plan.repository.integrationBranch} has diverged from ${plan.repository.defaultBranch}. ` +
        "The importer will not force-update it.",
    );
  }
  if (comparison.status === "behind" && comparison.ahead_by === 0) {
    if (dryRun) {
      log(`[dry-run] Fast-forward ${plan.repository.integrationBranch} to ${plan.repository.defaultBranch}.`);
      return;
    }
    api(
      `repos/${plan.repository.fullName}/git/refs/heads/${plan.repository.integrationBranch}`,
      "PATCH",
      { sha: base.object.sha, force: false },
    );
    log(`Fast-forwarded ${plan.repository.integrationBranch} to ${plan.repository.defaultBranch}.`);
  }
}

function ensureLabels(plan: Plan): void {
  const existing = api<Array<{ name: string; color: string; description: string | null }>>(
    `repos/${plan.repository.fullName}/labels?per_page=100`,
  );
  const byName = new Map(existing.map((label) => [label.name.toLowerCase(), label]));
  for (const label of plan.labels) {
    const current = byName.get(label.name.toLowerCase());
    if (dryRun) {
      log(`[dry-run] ${current ? "Update" : "Create"} label ${label.name}.`);
      continue;
    }
    if (current) {
      api(
        `repos/${plan.repository.fullName}/labels/${encodeURIComponent(current.name)}`,
        "PATCH",
        { new_name: label.name, color: label.color, description: label.description },
      );
    } else {
      api(`repos/${plan.repository.fullName}/labels`, "POST", label);
    }
    sleep(120);
  }
  log(`Labels reconciled: ${plan.labels.length}.`);
}

function ensureMilestone(plan: Plan): number {
  const milestones = api<Array<{ number: number; title: string }>>(
    `repos/${plan.repository.fullName}/milestones?state=all&per_page=100`,
  );
  const current = milestones.find((item) => item.title === plan.milestone.title);
  if (dryRun) {
    log(`[dry-run] ${current ? "Update" : "Create"} milestone ${plan.milestone.title}.`);
    return current?.number ?? 0;
  }
  if (current) {
    api(
      `repos/${plan.repository.fullName}/milestones/${current.number}`,
      "PATCH",
      {
        title: plan.milestone.title,
        description: plan.milestone.description,
        due_on: plan.milestone.dueOn,
        state: "open",
      },
    );
    return current.number;
  }
  const created = api<{ number: number }>(
    `repos/${plan.repository.fullName}/milestones`,
    "POST",
    {
      title: plan.milestone.title,
      description: plan.milestone.description,
      due_on: plan.milestone.dueOn,
      state: "open",
    },
  );
  return created.number;
}

function listProjects(owner: string): Array<{ id: string; number: number; title: string; url: string }> {
  const result = runJson<unknown>([
    "project",
    "list",
    "--owner",
    owner,
    "--limit",
    "100",
    "--format",
    "json",
  ]);
  if (Array.isArray(result)) return result as Array<{ id: string; number: number; title: string; url: string }>;
  if (result && typeof result === "object" && "projects" in result) {
    return (result as { projects: Array<{ id: string; number: number; title: string; url: string }> }).projects;
  }
  return [];
}

function getProjectDetails(owner: string, number: number): ProjectDetails {
  const query = `
    query($login: String!, $number: Int!) {
      user(login: $login) {
        projectV2(number: $number) {
          id
          number
          title
          url
          readme
          shortDescription
          views(first: 100) {
            nodes { id number name layout }
          }
          repositories(first: 100) {
            nodes { nameWithOwner }
          }
        }
      }
    }`;
  const result = runJson<{
    data: { user: { projectV2: ProjectDetails | null } | null };
  }>([
    "api",
    "graphql",
    "-f",
    `query=${query}`,
    "-f",
    `login=${owner}`,
    "-F",
    `number=${number}`,
  ]);
  const project = result?.data?.user?.projectV2;
  if (!project) fail(`Could not read Project ${owner}#${number}.`);
  return {
    ...project,
    views: (project.views as unknown as { nodes: ProjectDetails["views"] }).nodes ?? [],
    linkedRepositories:
      (
        project as unknown as {
          repositories?: { nodes?: Array<{ nameWithOwner: string }> };
        }
      ).repositories?.nodes?.map((repository) => repository.nameWithOwner) ?? [],
  };
}

function ensureProject(plan: Plan): ProjectDetails {
  const matches = listProjects(plan.project.owner).filter(
    (project) => project.title === plan.project.title,
  );
  if (matches.length > 1) {
    fail(`More than one Project is named "${plan.project.title}". Rename duplicates before importing.`);
  }

  let number: number;
  if (matches.length === 1) {
    const details = getProjectDetails(plan.project.owner, matches[0].number);
    if (!details.readme.includes(plan.project.managedMarker)) {
      fail(
        `Project "${plan.project.title}" exists without the UXDS managed marker. ` +
          "The importer will not adopt or overwrite it.",
      );
    }
    number = details.number;
  } else {
    if (dryRun) {
      log(`[dry-run] Create private Project "${plan.project.title}".`);
      return {
        id: "DRY_RUN_PROJECT",
        number: 0,
        title: plan.project.title,
        url: "",
        readme: plan.project.managedMarker,
        shortDescription: plan.project.description,
        views: [],
        linkedRepositories: [],
      };
    }
    const created = runJson<{ id: string; number: number; title: string; url: string }>([
      "project",
      "create",
      "--owner",
      plan.project.owner,
      "--title",
      plan.project.title,
      "--format",
      "json",
    ]);
    number = created.number;
  }

  if (!dryRun) {
    const before = getProjectDetails(plan.project.owner, number);
    run([
      "project",
      "edit",
      String(number),
      "--owner",
      plan.project.owner,
      "--description",
      plan.project.description,
      "--readme",
      `${plan.project.managedMarker}\n\n# ${plan.project.title}\n\n${plan.description}\n\nManaged from \`.github/import/development-plan.json\`.`,
      "--visibility",
      plan.project.visibility,
    ]);
    if (
      !before.linkedRepositories.some(
        (repository) =>
          repository.toLowerCase() === plan.repository.fullName.toLowerCase(),
      )
    ) {
      run([
        "project",
        "link",
        String(number),
        "--owner",
        plan.project.owner,
        "--repo",
        plan.repository.fullName,
      ]);
    }
  }
  return getProjectDetails(plan.project.owner, number);
}

function listProjectFields(plan: Plan, projectNumber: number): ProjectField[] {
  const query = `
    query($login: String!, $number: Int!) {
      user(login: $login) {
        projectV2(number: $number) {
          fields(first: 100) {
            nodes {
              __typename
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }
      }
    }`;
  const result = runJson<{
    data: {
      user: {
        projectV2: {
          fields: {
            nodes: Array<{
              __typename: string;
              id: string;
              name: string;
              dataType?: string;
              options?: Array<{ id: string; name: string }>;
            }>;
          };
        } | null;
      } | null;
    };
  }>([
    "api",
    "graphql",
    "-f",
    `query=${query}`,
    "-f",
    `login=${plan.project.owner}`,
    "-F",
    `number=${projectNumber}`,
  ]);

  const nodes = result?.data?.user?.projectV2?.fields?.nodes ?? [];
  return nodes
    .filter(
      (field) =>
        field.__typename === "ProjectV2Field" ||
        field.__typename === "ProjectV2SingleSelectField",
    )
    .map((field) => ({
      id: field.id,
      name: field.name,
      type:
        field.__typename === "ProjectV2SingleSelectField"
          ? "SINGLE_SELECT"
          : field.dataType ?? "UNKNOWN",
      options: field.options,
    }));
}
function sameOptions(field: ProjectField, desired: string[]): boolean {
  const current = (field.options ?? []).map((option) => option.name);
  return current.length === desired.length && current.every((value, index) => value === desired[index]);
}

const SINGLE_SELECT_OPTION_COLORS = [
  "GRAY",
  "BLUE",
  "YELLOW",
  "ORANGE",
  "GREEN",
  "PURPLE",
  "RED",
  "PINK",
] as const;

function updateSingleSelectFieldOptions(field: ProjectField, desired: string[]): void {
  const existingByName = new Map((field.options ?? []).map((option) => [option.name, option.id]));
  const options = desired.map((name, index) => {
    const option: { id?: string; name: string; color: string; description: string } = {
      name,
      color: SINGLE_SELECT_OPTION_COLORS[index % SINGLE_SELECT_OPTION_COLORS.length],
      description: "",
    };
    const existingId = existingByName.get(name);
    if (existingId) option.id = existingId;
    return option;
  });
  const payload = JSON.stringify({
    query: `mutation($fieldId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
      updateProjectV2Field(input: { fieldId: $fieldId, singleSelectOptions: $options }) {
        projectV2Field {
          ... on ProjectV2SingleSelectField {
            id
            name
            options { id name }
          }
        }
      }
    }`,
    variables: { fieldId: field.id, options },
  });
  runJson(["api", "graphql", "--input", "-"], { input: payload });
}

function ensureProjectFields(plan: Plan, project: ProjectDetails): Map<string, ProjectField> {
  if (dryRun) {
    for (const field of plan.project.fields) log(`[dry-run] Reconcile Project field ${field.name}.`);
    return new Map();
  }

  let fields = listProjectFields(plan, project.number);
  for (const definition of plan.project.fields) {
    const current = fields.find((field) => field.name === definition.name);
    const incompatible = Boolean(
      current &&
        (current.type !== definition.type ||
          (definition.type === "SINGLE_SELECT" &&
            !sameOptions(current, definition.options ?? []))),
    );

    let needsCreate = !current;
    if (current && incompatible) {
      // Status is a built-in Project field and cannot be deleted; reconcile options in place.
      if (definition.name === "Status" && definition.type === "SINGLE_SELECT") {
        log(`Updating built-in Status options on Project.`);
        updateSingleSelectFieldOptions(current, definition.options ?? []);
      } else {
        run(["project", "field-delete", "--id", current.id]);
        fields = fields.filter((field) => field.id !== current.id);
        needsCreate = true;
      }
    }
    if (needsCreate) {
      const args = [
        "project",
        "field-create",
        String(project.number),
        "--owner",
        plan.project.owner,
        "--name",
        definition.name,
        "--data-type",
        definition.type,
        "--format",
        "json",
      ];
      if (definition.type === "SINGLE_SELECT") {
        args.push("--single-select-options", (definition.options ?? []).join(","));
      }
      runJson<ProjectField>(args);
    }
  }
  fields = listProjectFields(plan, project.number);
  const map = new Map(fields.map((field) => [field.name, field]));
  for (const definition of plan.project.fields) {
    if (!map.has(definition.name)) fail(`Project field ${definition.name} was not created.`);
  }
  return map;
}

function viewMatches(
  item: { name: string; layout: string },
  view: { name: string; layout: string },
): boolean {
  const normalizedLayout = item.layout
    .toLowerCase()
    .replace(/_layout$/, "")
    .replace(/^project_v2_view_layout_/, "");
  return item.name === view.name && normalizedLayout === view.layout;
}

function ensureProjectViews(plan: Plan, project: ProjectDetails): void {
  if (dryRun) {
    for (const view of plan.project.views) log(`[dry-run] Reconcile Project view ${view.name}.`);
    return;
  }
  const userId = run(["api", "user", "--jq", ".id"]);
  let current = getProjectDetails(plan.project.owner, project.number).views;
  let viewsApiUnavailable = false;
  for (const view of plan.project.views) {
    if (current.some((item) => viewMatches(item, view))) continue;
    const created = api<unknown>(
      `users/${userId}/projectsV2/${project.number}/views`,
      "POST",
      { name: view.name, layout: view.layout, filter: view.filter ?? "" },
      true,
    );
    if (!created) {
      viewsApiUnavailable = true;
      log(
        `Warning: could not create Project view "${view.name}" via REST ` +
          `(users/${userId}/projectsV2/${project.number}/views returned failure). ` +
          "Continuing import; create this view in the GitHub Project UI if it remains missing.",
      );
      continue;
    }
    sleep(180);
    current = getProjectDetails(plan.project.owner, project.number).views;
  }
  current = getProjectDetails(plan.project.owner, project.number).views;
  const missing = plan.project.views.filter(
    (view) => !current.some((item) => viewMatches(item, view)),
  );
  if (missing.length && viewsApiUnavailable) {
    log(
      `Warning: Project views still missing after REST attempts: ${missing
        .map((view) => `${view.name} (${view.layout})`)
        .join(", ")}. ` +
        "GitHub returned 404 for the documented views API on this token; " +
        "issues and Project items will still be imported.",
    );
  } else if (missing.length) {
    fail(
      `Failed to create required Project views: ${missing
        .map((view) => `${view.name} (${view.layout})`)
        .join(", ")}.`,
    );
  }
}

function listRepositoryIssues(plan: Plan): GitHubIssue[] {
  const output = run([
    "api",
    "--paginate",
    `repos/${plan.repository.fullName}/issues?state=all&per_page=100`,
    "-H",
    "Accept: application/vnd.github+json",
    "-H",
    `X-GitHub-Api-Version: ${API_VERSION}`,
    "--slurp",
  ]);
  const pages = JSON.parse(output) as GitHubIssue[][];
  return pages.flat().filter((issue) => !issue.pull_request);
}

function preflightIssueConflicts(plan: Plan, nodes: FlatNode[], existing: GitHubIssue[]): void {
  const plannedTitles = new Map(nodes.map((node) => [issueTitle(node), node.key]));
  const seenKeys = new Map<string, number>();
  for (const issue of existing) {
    const marker = issue.body?.match(managedIssueRegex)?.[1];
    if (marker) {
      if (seenKeys.has(marker)) {
        fail(`Managed key ${marker} appears on multiple issues: #${seenKeys.get(marker)} and #${issue.number}.`);
      }
      seenKeys.set(marker, issue.number);
      continue;
    }
    const plannedKey = plannedTitles.get(issue.title);
    if (plannedKey) {
      fail(
        `Unmanaged issue #${issue.number} has planned title "${issue.title}". ` +
          `Rename it or add the correct marker only after verifying it represents ${plannedKey}.`,
      );
    }
  }
}

function upsertIssues(
  plan: Plan,
  nodes: FlatNode[],
  milestoneNumber: number,
): Map<string, GitHubIssue> {
  let existing = listRepositoryIssues(plan);
  preflightIssueConflicts(plan, nodes, existing);
  const byKey = new Map<string, GitHubIssue>();
  for (const issue of existing) {
    const key = issue.body?.match(managedIssueRegex)?.[1];
    if (key) byKey.set(key, issue);
  }

  for (const node of nodes) {
    const current = byKey.get(node.key);
    if (dryRun) {
      log(`[dry-run] ${current ? "Update" : "Create"} ${node.type.toLowerCase()} ${node.key}.`);
      continue;
    }
    const body = issueBody(plan, node, current?.number, byKey);
    const payload = {
      title: issueTitle(node),
      body,
      assignees: [plan.repository.owner],
      labels: issueLabels(node),
      milestone: milestoneNumber,
    };
    let issue: GitHubIssue;
    if (current) {
      issue = api<GitHubIssue>(
        `repos/${plan.repository.fullName}/issues/${current.number}`,
        "PATCH",
        { ...payload, state: "open" },
      );
    } else {
      issue = api<GitHubIssue>(
        `repos/${plan.repository.fullName}/issues`,
        "POST",
        payload,
      );
    }
    byKey.set(node.key, issue);
    sleep(180);
  }

  // Second pass updates resolved parent, dependency and branch issue numbers.
  for (const node of nodes) {
    const issue = byKey.get(node.key);
    if (!issue) continue;
    const body = issueBody(plan, node, issue.number, byKey);
    if (body !== issue.body) {
      const updated = api<GitHubIssue>(
        `repos/${plan.repository.fullName}/issues/${issue.number}`,
        "PATCH",
        { body },
      );
      byKey.set(node.key, updated);
      sleep(120);
    }
  }
  return byKey;
}

function ensureSubIssues(plan: Plan, nodes: FlatNode[], issueMap: Map<string, GitHubIssue>): void {
  for (const node of nodes.filter((item) => item.parentKey)) {
    const parent = issueMap.get(node.parentKey!);
    const child = issueMap.get(node.key);
    if (!parent || !child) {
      if (dryRun) {
        log(`[dry-run] Link ${node.key} under ${node.parentKey}.`);
        continue;
      }
      fail(`Cannot resolve sub-issue relationship ${node.parentKey} -> ${node.key}.`);
    }
    if (dryRun) {
      log(`[dry-run] Link #${child.number} under #${parent.number}.`);
      continue;
    }
    const current = api<GitHubIssue[]>(
      `repos/${plan.repository.fullName}/issues/${parent.number}/sub_issues?per_page=100`,
    );
    if (current.some((item) => item.id === child.id)) continue;
    api(
      `repos/${plan.repository.fullName}/issues/${parent.number}/sub_issues`,
      "POST",
      { sub_issue_id: child.id, replace_parent: false },
    );
    sleep(180);
  }
}

function ensureDependencies(plan: Plan, nodes: FlatNode[], issueMap: Map<string, GitHubIssue>): void {
  for (const node of nodes) {
    const blocked = issueMap.get(node.key);
    if (!blocked) continue;
    for (const dependencyKey of node.dependsOn) {
      const blocker = issueMap.get(dependencyKey);
      if (!blocker) {
        if (dryRun) {
          log(`[dry-run] Link ${node.key} blocked by ${dependencyKey}.`);
          continue;
        }
        fail(`Cannot resolve dependency ${node.key} -> ${dependencyKey}.`);
      }
      if (dryRun) {
        log(`[dry-run] Mark #${blocked.number} blocked by #${blocker.number}.`);
        continue;
      }
      const current = api<GitHubIssue[]>(
        `repos/${plan.repository.fullName}/issues/${blocked.number}/dependencies/blocked_by?per_page=100`,
      );
      if (current.some((item) => item.id === blocker.id)) continue;
      api(
        `repos/${plan.repository.fullName}/issues/${blocked.number}/dependencies/blocked_by`,
        "POST",
        { issue_id: blocker.id },
      );
      sleep(180);
    }
  }
}

function listProjectItems(plan: Plan, projectNumber: number): ProjectItem[] {
  const result = runJson<unknown>([
    "project",
    "item-list",
    String(projectNumber),
    "--owner",
    plan.project.owner,
    "--limit",
    "500",
    "--format",
    "json",
  ]);
  if (Array.isArray(result)) return result as ProjectItem[];
  if (result && typeof result === "object" && "items" in result) {
    return (result as { items: ProjectItem[] }).items;
  }
  return [];
}

function setProjectValue(
  project: ProjectDetails,
  itemId: string,
  field: ProjectField,
  value: string | number,
): void {
  const args = [
    "project",
    "item-edit",
    "--id",
    itemId,
    "--project-id",
    project.id,
    "--field-id",
    field.id,
  ];
  if (field.type === "SINGLE_SELECT") {
    const option = field.options?.find((item) => item.name === String(value));
    if (!option) fail(`Missing option "${value}" in Project field ${field.name}.`);
    args.push("--single-select-option-id", option.id);
  } else if (field.type === "NUMBER") {
    args.push("--number", String(value));
  } else {
    args.push("--text", String(value));
  }
  run(args);
}

function ensureProjectItems(
  plan: Plan,
  project: ProjectDetails,
  fields: Map<string, ProjectField>,
  nodes: FlatNode[],
  issueMap: Map<string, GitHubIssue>,
): void {
  if (dryRun) {
    for (const node of nodes) log(`[dry-run] Add and classify ${node.key} on the Project.`);
    return;
  }

  let items = listProjectItems(plan, project.number);
  const byUrl = new Map(
    items
      .filter((item) => item.content?.url)
      .map((item) => [item.content!.url!, item]),
  );

  for (const node of nodes) {
    const issue = issueMap.get(node.key);
    if (!issue) fail(`Missing issue for ${node.key}.`);
    let item = byUrl.get(issue.html_url);
    const isNew = !item;
    if (!item) {
      item = runJson<ProjectItem>([
        "project",
        "item-add",
        String(project.number),
        "--owner",
        plan.project.owner,
        "--url",
        issue.html_url,
        "--format",
        "json",
      ]);
      byUrl.set(issue.html_url, item);
    }

    const values: Record<string, string | number> = {
      "Work Type": node.type,
      Scope: node.scope,
      Increment: node.increment,
      Priority: node.priority,
      Area: node.area,
      "Estimate Hours": node.hours,
      "PRD References": node.prdReferences.join(", "),
      "Architecture References": node.architectureReferences.join(", "),
      "Plan Key": node.key,
    };
    values.Status = "Backlog";

    for (const [fieldName, value] of Object.entries(values)) {
      const field = fields.get(fieldName);
      if (!field) fail(`Project field ${fieldName} is unavailable.`);
      setProjectValue(project, item.id, field, value);
    }
    sleep(120);
  }
}

function writeReport(
  plan: Plan,
  project: ProjectDetails,
  nodes: FlatNode[],
  issueMap: Map<string, GitHubIssue>,
): void {
  const report = {
    planId: plan.planId,
    importedAt: new Date().toISOString(),
    repository: plan.repository.fullName,
    project: {
      number: project.number,
      url: project.url,
      title: project.title,
    },
    integrationBranch: plan.repository.integrationBranch,
    counts: {
      epics: nodes.filter((node) => node.type === "Epic").length,
      stories: nodes.filter((node) => node.type === "Story").length,
      tasks: nodes.filter((node) => node.type === "Task").length,
      issues: issueMap.size,
      hours: nodes.filter((node) => node.type === "Task").reduce((sum, node) => sum + node.hours, 0),
    },
    issues: Object.fromEntries(
      [...issueMap.entries()].map(([key, issue]) => [
        key,
        { number: issue.number, url: issue.html_url, title: issue.title },
      ]),
    ),
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  log(`Import report written to ${reportPath}.`);
}

function main(): void {
  if (!existsSync(planPath)) fail(`Plan file not found: ${planPath}`);
  const plan = JSON.parse(readFileSync(planPath, "utf8")) as Plan;
  const nodes = validatePlan(plan);
  log(
    `Plan valid: ${plan.epics.length} epics, ` +
      `${nodes.filter((node) => node.type === "Story").length} stories, ` +
      `${nodes.filter((node) => node.type === "Task").length} tasks, 50 hours.`,
  );
  if (validateOnly) return;

  acquireLock();
  try {
    preflightAuth(plan);
    log(`Authenticated and authorized for ${plan.repository.fullName}.`);
    ensureIntegrationBranch(plan);
    ensureLabels(plan);
    const milestoneNumber = ensureMilestone(plan);
    const project = ensureProject(plan);
    const fields = ensureProjectFields(plan, project);
    ensureProjectViews(plan, project);
    const issueMap = upsertIssues(plan, nodes, milestoneNumber);
    ensureSubIssues(plan, nodes, issueMap);
    ensureDependencies(plan, nodes, issueMap);
    ensureProjectItems(plan, project, fields, nodes, issueMap);
    if (!dryRun) writeReport(plan, project, nodes, issueMap);
    log(
      dryRun
        ? "Dry run completed. No GitHub mutations were requested."
        : `Import complete: ${project.url}`,
    );
  } finally {
    releaseLock();
  }
}

try {
  main();
} catch (error) {
  releaseLock();
  process.stderr.write(`\nImport stopped safely.\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
