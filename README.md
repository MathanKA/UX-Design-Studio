# UX Design Studio

A proof-of-work concept extension for InsaneSDD 2.0 that deepens UX review into a visual, per-screen approval workbench.

## Development planning package

- Detailed plan: `docs/UX_Design_Studio_Development_Plan_v1.0.md`
- Import source: `.github/import/development-plan.json`
- Idempotent importer: `scripts/import-github-project.ts`

## Automated GitHub setup

The downloadable `UXDS_Bootstrap_And_Import.ps1` script performs the repository and GitHub setup from an isolated temporary clone. It pushes the managed package to `main`, installs dependencies, validates the plan, performs a dry run, and then creates the `staging` branch, Project, views, fields, labels, milestone, issues, sub-issues, dependencies, and Project metadata.

Run from Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\UXDS_Bootstrap_And_Import.ps1
```

GitHub authentication or scope authorization is the only unavoidable interactive step.

## Direct importer usage

Prerequisites:

- Node.js 22 or newer
- pnpm through Corepack
- GitHub CLI
- GitHub CLI authenticated as `MathanKA` with repository and Project access

```bash
gh auth login -h github.com
gh auth refresh -h github.com -s repo,project
corepack pnpm install
corepack pnpm run plan:validate
corepack pnpm run github:import:dry
corepack pnpm run github:import
```

## Branch policy

```text
feature/test/docs branch from staging
  -> pull request to staging
      -> squash merge
          -> final release pull request from staging to main
              -> tag v0.1.0-poc
```

The importer never force-updates a diverged `staging` branch and never adopts an unmanaged same-name Project or same-title issue.
