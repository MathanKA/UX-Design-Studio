---
name: uxds-story-loop
description: >-
  Canonical UX Design Studio story execution loop: readiness, branch, implement,
  verify, signed commit, PR, CI, gated merge commit, Project updates, and
  manifest-authorized autonomous chaining. Use for repository-aware story delivery.
---

# UX Design Studio Story Loop

## Purpose

Execute one approved GitHub user story end to end with independent verification,
signed commits, CI gates, Project status updates, and merge-commit into `staging`.

Autonomous next-story chaining and gated self-merge are allowed only when an
explicit active run manifest exists under `.agents/runs/`. Without a valid active
manifest, autonomy is prohibited.

## Inputs

- Repository root and remote `MathanKA/UX-Design-Studio`
- Active run manifest path under `.agents/runs/` when autonomy applies
- Active story issue number and child task numbers
- Base branch from the manifest (default `staging`)
- Exact feature branch name from the manifest and ticket
- Controlling document paths under `docs/`
- GitHub Project title: `UX Design Studio POC`

## Required source reads

Before editing, read in authority order:

1. `docs/UX Design Studio — Source of Truth.pdf`
2. `docs/UX_Design_Studio_PRD_v1.0.md`
3. `docs/UX_Design_Studio_Technical_Architecture_v1.0.md`
4. `docs/UX_Design_Studio_Development_Plan_v1.0.md`
5. `AGENTS.md`
6. The active run manifest under `.agents/runs/` when autonomy applies
7. The approved GitHub story and child tasks
8. Existing implementation patterns in the repository

Also inspect `package.json` dynamically before selecting scripts.

## Run manifest loading

- Discover manifests under `.agents/runs/*.yml`
- Require schema validation before autonomy
- Repository validation allows zero or one `active: true` manifest; more than one active manifest is always invalid
- Autonomy requires exactly one valid active manifest at execution time
- Inactive historical manifests provide evidence only and never authorize execution
- Determine the active epic, ordered story queue, tasks, branches, dependencies, retry budgets, merge method, branch retention, workspace mode, finalization, and final release action from the manifest
- Recognize optional manifest `roles` policy metadata when present (default role, allowed options, demo-only flag, persona separation)
- Recognize optional manifest `resetPolicy` metadata when present (managed-key-only reset, preserved seed surfaces, prohibition of `localStorage.clear()`)
- Recognize optional manifest `scopeBoundary` metadata when present and enforce declared epic-boundary exclusions (for example provider-backed regeneration owned by a later epic)
- Recognize optional manifest `provider`, `regenerationPolicy`, `scope`, and `featureFlags` metadata when present and enforce declared provider, regeneration-safety, cut-scope, and feature-flag constraints
- Recognize optional story `authorizedCutScope` / `authorizedScope` metadata when present for cut-line authorization without activating undeclared cuts
- Manifest `branch` is authoritative for execution
- When manifest branch and ticket-suggested branch match, proceed
- When they differ, require `ticketSuggestedBranch`, `branchOverrideReason`, and explicit human authorization represented by the reviewed active manifest; missing override evidence is a hard stop
- Never invent a third branch name and never alter the ticket body automatically to force a match
- Honor `workspace.mode`; when `workspace.useWorktrees` is false, do not use Git worktrees
- After every merged story, return to a clean base branch checkout and verify no untracked story files remain before switching branches
- Stop when the authorized epic is Done or Blocked
- Do not start a later epic automatically
- When finalization is declared, deactivate the completed run manifest through the closure branch before starting any later epic

## Ticket readiness validation

Confirm all of the following:

- Story is open and acceptance criteria are testable
- Child tasks are present
- PRD and architecture references exist
- Scope classification is explicit (Mandatory or approved cut)
- Estimate fits remaining budget for the active epic
- Branch name matches the manifest and story, and the base branch is specified
- Working tree is clean
- Latest base branch is checked out
- No conflicting open PR exists for the same story branch

## Dependency validation

- Confirm listed blockers from the active manifest are closed as completed
- Do not start a story whose dependency is open
- Validate dependency order dynamically from the manifest; do not hard-code epic-specific issue pairs

## Project status transitions

Use `scripts/agent/project-status.ts` (or the published package script) to update
exactly one Project item at a time. Discover Project metadata dynamically; never
hard-code GraphQL node IDs.

Canonical state machine:

```text
Backlog -> Ready -> In Progress -> Verify -> Done
Any active state -> Blocked (hard stop)
```

Apply transitions to the active story and its child tasks. Preserve WIP limit 1.
Do not move the next story to In Progress until the current story PR is merged
and the current story is Done.

## Branch creation

- Create the exact branch name from the manifest on latest remote base
- When the ticket suggests a different branch, use only the manifest branch and require override evidence fields
- Never improvise a different branch name
- Never reuse a stale local branch without comparing to remote state
- Never include work from a previous story branch
- Never delete the feature branch after merge when the manifest retains branches
- Prefer single-checkout sequential workflow; do not create or use Git worktrees when the manifest disables them

## Implementation boundaries

- Implement only the active story and listed child tasks
- Smallest coherent vertical slice
- No unrelated refactoring, speculative frameworks, or unapproved dependencies
- No excluded capabilities (real LLM, production backend/auth, Module Federation)
- Honor manifest `scopeBoundary` exclusions; do not implement provider-backed regeneration, DesignAgentProvider adapters, or generated screen variants when the active run declares those false
- When optional manifest `provider`, `regenerationPolicy`, `scope`, and `featureFlags` sections authorize provider-bound work, implement only through the declared port and policy; never introduce a real LLM, external network, or secrets
- When `authorizedCutScope` or `authorizedScope` is present, deliver only the authorized cut-line items and never activate a cut when `activateCutLine` is false
- For provider-bound stories, verify async cancellation, controlled failure, provider-result schema evidence, stale-response rejection, and atomic version activation
- No test deletion or type-safety / lint / accessibility / security weakening
- Domain modules remain framework-independent
- When `roles` metadata is present, keep demo roles separate from UX personas and label role switching as demonstration-only
- When `resetPolicy` metadata is present, reset only the managed governance persistence key and preserve declared seed and configuration surfaces

## Focused verification

Run the narrowest relevant checks first for the active story. Record command and result.
One failed focused check caused by the implementation may use the one implementation-repair budget from the manifest.

## Full verification

Inspect `package.json`, then run every currently available applicable check:

- `pnpm install --frozen-lockfile`
- plan validation when present
- agent-control validation when present
- formatting, lint, typecheck, tests, build when present
- `git diff --check`

Classify each check as `PASS`, `FAIL`, `NOT AVAILABLE`, or `NOT APPLICABLE`.
Never report skipped checks as passed.

## Independent verifier invocation

Invoke a fresh read-only verifier using `.agents/verifiers/uxds-story-verifier.md`.

Provide only:

- repository location
- active manifest path when applicable
- story and task numbers
- controlling document paths
- base branch and feature branch
- changed diff
- executed check results
- visual evidence when available

Do not provide the implementer reasoning transcript.
Continue only on `VERDICT: PASS` with `SAFE_TO_COMMIT: YES`.

## Retry accounting

Per story budgets from the active manifest (default one each when declared):

- One implementation repair
- One verifier rerun
- One CI rerun for demonstrably transient failure

Do not reset counters by restarting the agent. Exhausted budget => Block and stop.

## Signed commit gate

- Stage only story-related files
- No secrets, Cursor/AI attribution, or unapproved dependencies
- Create signed commit with `git commit -S`
- Run `git verify-commit HEAD` and inspect `git log --show-signature -1`
- Signing failure is an immediate hard stop

## PR creation

- Push only the active story branch
- Open one PR targeting the base branch from the manifest
- Use the repository pull-request template structure
- No Cursor/AI attribution, model names, or promotional text
- Do not rely on closing keywords alone when the PR targets `staging`

## CI monitoring

- Confirm pushed SHA and PR head SHA match
- Confirm GitHub reports the feature commit as verified
- Wait for all required checks
- Rerun CI once only for transient infrastructure failure
- Deterministic defects require a repair within budget, then re-verify

## Remote signature verification

Before merge, confirm GitHub remote verification reports the feature commit verified.

## Automatic merge commit

Merge automatically only when every merge gate passes, and only when the active
run manifest authorizes automatic story merge.

Gates include: targets base branch, mergeable, required checks PASS, verifier PASS,
signed local and remote verification, no unresolved review threads, no conflicts,
no unexpected files, complete PR body, no AI attribution.

Use a merge commit (`gh pr merge --merge`) so personally signed feature commits
remain on history with the author's Verified signature. Do not squash.
Do not delete the remote feature branch after merge (no `--delete-branch`; keep
repo `delete_branch_on_merge` false) when the manifest retains feature branches.
Never bypass branch protection. Never push directly to `staging` or `main`.

## Issue and Project updates

After merge:

- Fast-forward local base branch
- Close child tasks, then the story
- Set Project status to Done
- Add one concise completion comment with PR number, merge commit, and verifier verdict

## Next-story selection

Automatic selection is allowed only when the active run manifest sets
`autonomy.automaticNextStory: true`.

Selection rules:

- Current story Done and PR merged
- Child tasks Done
- Next dependency closed per the manifest
- No other story In Progress or Verify
- Authorized epic open and not Blocked
- Retry budgets not exceeded
- Working tree clean and base branch healthy

## Recovery after interruption

Inspect git status, branch, open/merged PRs, issue and Project states, CI, and
signed-commit status. Resume from the latest confirmed durable state.
Never repeat a merge, recreate an existing PR, or close issues without merge proof.

## Hard-stop conditions

Stop for missing auth, dirty unrelated tree, document conflict, signing failure,
exhausted retries, merge conflicts, unresolved review threads, unexpected PR head
change, excluded capability need, missing Project item, missing or invalid active
run manifest, multiple active autonomous manifests, or out-of-epic work.

On stop: do not merge, do not begin the next story, preserve branch state, mark
Blocked when possible, and report exact evidence plus minimum user action.

## Final epic convergence verification

After the last authorized story is Done, synchronize the base branch, run the full
available quality gate, and invoke the verifier in epic mode (including any
declared hard-gate convergence checks such as provider-bound regeneration gates).
Close the epic only on PASS. Execute only the final release action declared in
the manifest. Do not automatically start the next epic.
