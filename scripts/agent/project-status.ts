#!/usr/bin/env node
/**
 * Deterministic GitHub Project status helper for UX Design Studio agents.
 * Discovers Project metadata dynamically and updates exactly one item.
 */
import { execFileSync } from "node:child_process";

const OWNER = "MathanKA";
const PROJECT_TITLE = "UX Design Studio POC";
const ALLOWED_STATUSES = [
  "Backlog",
  "Ready",
  "In Progress",
  "Verify",
  "Done",
  "Blocked",
] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

type CliOptions = {
  issue: number;
  status: AllowedStatus;
  dryRun: boolean;
  owner: string;
  projectTitle: string;
  repo: string;
};

type ProjectDiscovery = {
  projectId: string;
  projectNumber: number;
  statusFieldId: string;
  statusOptions: Record<string, string>;
};

function fail(message: string): never {
  console.error(
    JSON.stringify({ ok: false, error: message }, null, 2),
  );
  process.exit(1);
}

function runGh(args: string[], input?: string): string {
  try {
    return execFileSync("gh", args, {
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, GH_PROMPT_DISABLED: "1" },
    }).trim();
  } catch (error) {
    const err = error as { stderr?: unknown };
    fail(`GitHub CLI failed: gh ${args.join(" ")}\n${String(err.stderr ?? error)}`);
  }
}

function runGhJson<T>(args: string[], input?: string): T {
  const output = runGh(args, input);
  try {
    return JSON.parse(output) as T;
  } catch {
    fail(`Expected JSON from: gh ${args.join(" ")}\nReceived:\n${output}`);
  }
}

function parseArgs(argv: string[]): CliOptions {
  let issue: number | undefined;
  let status: AllowedStatus | undefined;
  let dryRun = false;
  let owner = OWNER;
  let projectTitle = PROJECT_TITLE;
  let repo = `${OWNER}/UX-Design-Studio`;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--issue" && next) {
      issue = Number(next);
      i += 1;
      continue;
    }
    if (arg === "--status" && next) {
      status = next as AllowedStatus;
      i += 1;
      continue;
    }
    if (arg === "--owner" && next) {
      owner = next;
      i += 1;
      continue;
    }
    if (arg === "--project-title" && next) {
      projectTitle = next;
      i += 1;
      continue;
    }
    if (arg === "--repo" && next) {
      repo = next;
      i += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: pnpm exec tsx scripts/agent/project-status.ts --issue <n> --status <Status> [--dry-run]",
      );
      process.exit(0);
    }
    fail(`Unknown argument: ${arg}`);
  }

  if (!issue || !Number.isInteger(issue) || issue < 1) {
    fail("Missing or invalid --issue <positive integer>.");
  }
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    fail(
      `Missing or invalid --status. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
    );
  }

  return { issue, status, dryRun, owner, projectTitle, repo };
}

function discoverProject(owner: string, projectTitle: string): ProjectDiscovery {
  const query = `
    query($login: String!) {
      user(login: $login) {
        projectsV2(first: 30) {
          nodes {
            id
            number
            title
            fields(first: 50) {
              nodes {
                __typename
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options { id name }
                }
              }
            }
          }
        }
      }
    }`;

  const result = runGhJson<{
    data: {
      user: {
        projectsV2: {
          nodes: Array<{
            id: string;
            number: number;
            title: string;
            fields: {
              nodes: Array<{
                __typename: string;
                id?: string;
                name?: string;
                options?: Array<{ id: string; name: string }>;
              }>;
            };
          }>;
        } | null;
      } | null;
    };
  }>(["api", "graphql", "-f", `query=${query}`, "-f", `login=${owner}`]);

  const projects = result.data.user?.projectsV2?.nodes ?? [];
  const project = projects.find((node) => node.title === projectTitle);
  if (!project) {
    fail(`Project titled "${projectTitle}" not found for owner ${owner}.`);
  }

  const statusField = project.fields.nodes.find(
    (field) => field.__typename === "ProjectV2SingleSelectField" && field.name === "Status",
  );
  if (!statusField?.id || !statusField.options) {
    fail(`Status field not found on Project "${projectTitle}".`);
  }

  const statusOptions: Record<string, string> = {};
  for (const option of statusField.options) {
    statusOptions[option.name] = option.id;
  }

  return {
    projectId: project.id,
    projectNumber: project.number,
    statusFieldId: statusField.id,
    statusOptions,
  };
}

function resolveIssueItemId(
  owner: string,
  projectNumber: number,
  repo: string,
  issueNumber: number,
): { itemId: string; issueUrl: string } {
  const issue = runGhJson<{ url: string }>([
    "api",
    `repos/${repo}/issues/${issueNumber}`,
    "--jq",
    "{url:.html_url}",
  ]);

  const query = `
    query($login: String!, $number: Int!) {
      user(login: $login) {
        projectV2(number: $number) {
          items(first: 100) {
            nodes {
              id
              content {
                __typename
                ... on Issue {
                  number
                  url
                  repository { nameWithOwner }
                }
              }
            }
          }
        }
      }
    }`;

  const result = runGhJson<{
    data: {
      user: {
        projectV2: {
          items: {
            nodes: Array<{
              id: string;
              content: {
                __typename: string;
                number?: number;
                url?: string;
                repository?: { nameWithOwner: string };
              } | null;
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
    `login=${owner}`,
    "-F",
    `number=${projectNumber}`,
  ]);

  const nodes = result.data.user?.projectV2?.items?.nodes ?? [];
  const match = nodes.find(
    (node) =>
      node.content?.__typename === "Issue" &&
      node.content.number === issueNumber &&
      node.content.repository?.nameWithOwner === repo,
  );

  if (!match) {
    fail(
      `Issue #${issueNumber} (${issue.url}) is not present on Project ${owner}/${projectNumber}.`,
    );
  }

  return { itemId: match.id, issueUrl: issue.url };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const project = discoverProject(options.owner, options.projectTitle);
  const optionId = project.statusOptions[options.status];
  if (!optionId) {
    fail(
      `Status option "${options.status}" not found. Available: ${Object.keys(project.statusOptions).join(", ")}`,
    );
  }

  const { itemId, issueUrl } = resolveIssueItemId(
    options.owner,
    project.projectNumber,
    options.repo,
    options.issue,
  );

  const payload = {
    ok: true,
    dryRun: options.dryRun,
    issue: options.issue,
    issueUrl,
    status: options.status,
    project: {
      id: project.projectId,
      number: project.projectNumber,
      title: options.projectTitle,
    },
    itemId,
    statusFieldId: project.statusFieldId,
    statusOptionId: optionId,
  };

  if (options.dryRun) {
    console.log(JSON.stringify({ ...payload, updated: false }, null, 2));
    return;
  }

  const mutation = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }
      ) {
        projectV2Item { id }
      }
    }`;

  runGhJson([
    "api",
    "graphql",
    "-f",
    `query=${mutation}`,
    "-f",
    `projectId=${project.projectId}`,
    "-f",
    `itemId=${itemId}`,
    "-f",
    `fieldId=${project.statusFieldId}`,
    "-f",
    `optionId=${optionId}`,
  ]);

  console.log(JSON.stringify({ ...payload, updated: true }, null, 2));
}

main();
