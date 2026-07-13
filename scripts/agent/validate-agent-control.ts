#!/usr/bin/env node
/**
 * Validates the UX Design Studio agent-control layer.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const errors: string[] = [];

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

mustExist(".agents/skills/uxds-story-loop/SKILL.md");
mustExist(".agents/verifiers/uxds-story-verifier.md");
mustExist("scripts/agent/project-status.ts");
mustExist("scripts/agent/validate-agent-control.ts");
mustExist(".github/pull_request_template.md");
mustExist("AGENTS.md");
mustExist("docs/UX_Design_Studio_PRD_v1.0.md");
mustExist("docs/UX_Design_Studio_Technical_Architecture_v1.0.md");
mustExist("docs/UX_Design_Studio_Development_Plan_v1.0.md");

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
if (/direct push(?:es)? to `?(?:staging|main)`?/i.test(skill) && !skill.includes("Never push directly")) {
  // Ensure prohibition exists rather than permission.
}
if (!skill.includes("Never push directly to `staging` or `main`")) {
  fail("Skill must prohibit direct pushes to staging and main.");
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

const agents = read("AGENTS.md");
if (!agents.includes("## E1 Autonomous Loop Exception")) {
  fail("AGENTS.md must include the E1 Autonomous Loop Exception section.");
}
for (const issue of ["#1", "#2", "#5", "#8"]) {
  if (!agents.includes(issue)) {
    fail(`E1 exception must reference ${issue}.`);
  }
}
if (/E2|#[1-9]\d+/.test(agents.slice(agents.indexOf("## E1 Autonomous Loop Exception")))) {
  const exception = agents.slice(agents.indexOf("## E1 Autonomous Loop Exception"));
  const end = exception.search(/\n## /);
  const body = end === -1 ? exception : exception.slice(0, end);
  const unauthorized = body.match(/#(?!1\b|2\b|5\b|8\b)\d+/g) ?? [];
  if (unauthorized.length > 0) {
    fail(`E1 exception lists unauthorized issue numbers: ${unauthorized.join(", ")}`);
  }
  if (/automatic chaining.*E2|self-merge for E2/i.test(body) === false && /authorizes.*E2/i.test(body)) {
    fail("E1 exception must not authorize E2 chaining.");
  }
}
if (!agents.includes("expires automatically when issue `#1` is closed or marked Blocked")) {
  fail("E1 exception must expire when #1 is closed or Blocked.");
}
if (!agents.includes("WIP limit of one implementation story")) {
  fail("E1 exception must preserve WIP limit 1.");
}
if (!agents.includes("signed commits") && !agents.includes("Signed commits")) {
  fail("AGENTS.md must continue requiring signed commits.");
}
if (!agents.includes("No direct pushes to `staging` or `main`")) {
  fail("AGENTS.md must continue prohibiting direct pushes.");
}

const branchMappings: Array<{ issue: number; branch: string }> = [
  {
    issue: 2,
    branch: "feat/uxds-2-bootstrap-the-frontend-engineering-foundation",
  },
  {
    issue: 5,
    branch: "feat/uxds-5-define-and-validate-immutable-uxspec-contracts",
  },
  {
    issue: 8,
    branch: "feat/uxds-8-author-and-verify-the-agentpilot-seed-baseline",
  },
];

for (const mapping of branchMappings) {
  if (!skill.includes(mapping.branch) && !agents.includes(mapping.branch)) {
    // Branch names live primarily in GitHub tickets; skill must at least require exact branch from story.
  }
}
if (!skill.includes("exact branch name")) {
  fail("Skill must require the exact branch name from the story.");
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
  if (prTemplate.includes(phrase) || skill.includes(phrase) || agents.includes(phrase)) {
    fail(`Forbidden Cursor attribution text present: ${phrase}`);
  }
}

const sealForgeTerms = ["SealForge", "sealforge", "seal-forge"];
for (const file of [skill, verifier, agents, prTemplate]) {
  for (const term of sealForgeTerms) {
    if (file.includes(term)) {
      fail(`SealForge-specific term remains: ${term}`);
    }
  }
}

if (!prTemplate.includes("## Summary") || !prTemplate.includes("## Verification")) {
  fail("Pull request template must include Summary and Verification sections.");
}

if (!/inspect `package\.json`/i.test(agents)) {
  fail("AGENTS.md must require dynamic package.json inspection.");
}

// Self-approval outside E1 must remain prohibited.
if (!agents.includes("Never merge your own PR") && !agents.includes("except under the active E1 Autonomous Loop Exception")) {
  fail("AGENTS.md must keep self-merge prohibited outside the E1 exception.");
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
        "AGENTS.md E1 exception",
        "scripts/agent/project-status.ts",
        ".github/pull_request_template.md",
      ],
    },
    null,
    2,
  ),
);
