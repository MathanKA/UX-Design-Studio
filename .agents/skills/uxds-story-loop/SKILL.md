---
name: uxds-story-loop
description: >-
  Canonical UX Design Studio story execution loop: readiness, branch, implement,
  verify, signed commit, PR, CI, gated merge commit, Project updates, and optional
  E1-only autonomous chaining. Use for repository-aware story delivery.
---

# UX Design Studio Story Loop

## Purpose

Execute one approved GitHub user story end to end with independent verification,
signed commits, CI gates, Project status updates, and merge-commit into `staging`.

Autonomous next-story chaining is allowed only for Epic E1 (`#1`) while that epic
remains open and not Blocked, covering stories `#2`, `#5`, and `#8` only.
Future stories may reuse this workflow; autonomous chaining for later epics
requires explicit human authorization.

## Inputs

- Repository root and remote `MathanKA/UX-Design-Studio`
- Active story issue number and child task numbers
- Base branch: `staging`
- Exact feature branch name from the story
- Controlling document paths under `docs/`
- GitHub Project title: `UX Design Studio POC`

## Required source reads

Before editing, read in authority order:

1. `docs/UX Design Studio — Source of Truth.pdf`
2. `docs/UX_Design_Studio_PRD_v1.0.md`
3. `docs/UX_Design_Studio_Technical_Architecture_v1.0.md`
4. `docs/UX_Design_Studio_Development_Plan_v1.0.md`
5. `AGENTS.md`
6. The approved GitHub story and child tasks
7. Existing implementation patterns in the repository

Also inspect `package.json` dynamically before selecting scripts.

## Ticket readiness validation

Confirm all of the following:

- Story is open and acceptance criteria are testable
- Child tasks are present
- PRD and architecture references exist
- Scope classification is explicit (Mandatory or approved cut)
- Estimate fits remaining budget for the active epic
- Branch name and `staging` base are specified
- Working tree is clean
- Latest `staging` is checked out
- No conflicting open PR exists for the same story branch

## Dependency validation

- Confirm listed blockers are closed as completed
- Do not start a story whose dependency is open
- For E1: `#5` requires `#2` Done; `#8` requires `#5` Done

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

- Create the exact branch name from latest remote `staging`
- Never improvise a different branch name
- Never reuse a stale local branch without comparing to remote state
- Never include work from a previous story branch

## Implementation boundaries

- Implement only the active story and listed child tasks
- Smallest coherent vertical slice
- No unrelated refactoring, speculative frameworks, or unapproved dependencies
- No excluded capabilities (real LLM, production backend/auth, Module Federation)
- No test deletion or type-safety / lint / accessibility / security weakening
- Domain modules remain framework-independent

## Focused verification

Run the narrowest relevant checks first for the active story. Record command and result.
One failed focused check caused by the implementation may use the one implementation-repair budget.

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
- story and task numbers
- controlling document paths
- base branch and feature branch
- changed diff
- executed check results

Do not provide the implementer reasoning transcript.
Continue only on `VERDICT: PASS` with `SAFE_TO_COMMIT: YES`.

## Retry accounting

Per story budgets:

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
- Open one PR targeting `staging`
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

Merge automatically only when every merge gate passes, and only when authorized:

- Under the E1 exception for `#2`, `#5`, and `#8`
- Or under a later human-authorized epic exception

Gates include: targets `staging`, mergeable, required checks PASS, verifier PASS,
signed local and remote verification, no unresolved review threads, no conflicts,
no unexpected files, complete PR body, no AI attribution.

Use a merge commit (`gh pr merge --merge`) so personally signed feature commits
remain on `staging` history with the author's Verified signature. Do not squash.
Do not delete the remote feature branch after merge (no `--delete-branch`; keep
repo `delete_branch_on_merge` false).
Never bypass branch protection. Never push directly to `staging` or `main`.

## Issue and Project updates

After merge:

- Fast-forward local `staging`
- Close child tasks, then the story
- Set Project status to Done
- Add one concise completion comment with PR number, merge commit, and verifier verdict

## Next-story selection

Automatic selection is limited to the E1 queue unless a human authorizes another epic.

Selection rules:

- Current story Done and PR merged
- Child tasks Done
- Next dependency closed
- No other story In Progress or Verify
- Epic `#1` open and not Blocked
- Retry budgets not exceeded
- Working tree clean and `staging` healthy

## Recovery after interruption

Inspect git status, branch, open/merged PRs, issue and Project states, CI, and
signed-commit status. Resume from the latest confirmed durable state.
Never repeat a merge, recreate an existing PR, or close issues without merge proof.

## Hard-stop conditions

Stop for missing auth, dirty unrelated tree, document conflict, signing failure,
exhausted retries, merge conflicts, unresolved review threads, unexpected PR head
change, excluded capability need, missing Project item, or out-of-epic work.

On stop: do not merge, do not begin the next story, preserve branch state, mark
Blocked when possible, and report exact evidence plus minimum user action.

## Final epic convergence verification

After the last authorized story is Done, synchronize `staging`, run the full
available quality gate, and invoke the verifier in epic mode. Close the epic only
on PASS. Do not automatically start the next epic.
