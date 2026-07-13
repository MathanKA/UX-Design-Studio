# UX Design Studio

A proof-of-work concept extension for InsaneSDD 2.0 that deepens UX review into a visual, per-screen approval workbench.

## Prerequisites

- Node.js 22 or newer
- pnpm through Corepack
- GitHub CLI (for planning/import and agent helpers)

```bash
corepack enable
corepack pnpm install
```

## Application scripts

| Script | Purpose |
|---|---|
| `pnpm run dev` | Start the Vite development server |
| `pnpm run lint` | Run ESLint |
| `pnpm run typecheck` | Run strict TypeScript checks |
| `pnpm run test` | Run Vitest suite |
| `pnpm run build` | Type-check and create the production build |
| `pnpm run preview` | Preview the production build locally |

## Planning and agent scripts

| Script | Purpose |
|---|---|
| `pnpm run plan:validate` | Validate `.github/import/development-plan.json` |
| `pnpm run github:import:dry` | Dry-run GitHub Project import |
| `pnpm run github:import` | Execute GitHub Project import |
| `pnpm run agent:validate` | Validate the agent-control layer |
| `pnpm run agent:project-status` | Update one GitHub Project status item |

Import commands can mutate GitHub; run them only when explicitly authorized.

```bash
gh auth login -h github.com
gh auth refresh -h github.com -s repo,project,workflow
corepack pnpm run plan:validate
corepack pnpm run github:import:dry
```

## Studio routes

```text
/                 -> redirect to /overview
/overview         -> specification overview placeholder
/review/:screenId -> screen review placeholder
/audit            -> audit log placeholder
```

Unknown routes render a controlled not-found fallback. Application and route error boundaries keep the shell available after feature failures.

## Branch policy

```text
feature/test/docs branch from staging
  -> pull request to staging
      -> squash merge
          -> final release pull request from staging to main
              -> tag v0.1.0-poc
```

## Development planning package

- Detailed plan: `docs/UX_Design_Studio_Development_Plan_v1.0.md`
- Import source: `.github/import/development-plan.json`
- Idempotent importer: `scripts/import-github-project.ts`
