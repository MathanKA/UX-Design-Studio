# UX Design Studio

UX Design Studio is a proof-of-work concept extension for InsaneSDD 2.0 that deepens UX review into a visual, per-screen approval workbench. It visually renders a generated UX specification before Agile plan generation, and supports per-screen review, structured revision, mocked regeneration, approval, and audit traceability.

It is **not** an official InfoBeans product or feature. The deterministic demonstration project is **AgentPilot**. The POC delivery cap is 50 build hours. This repository must never be described as proof that the internal InsaneSDD product lacks a capability.

It is not production-ready. It does not implement real authentication, a real LLM, real Agile plan generation, or a production InsaneSDD backend.

## What it does

Mandatory capabilities preserved by the released POC:

- Specification-driven rendering of all five AgentPilot screens through one common path
- Runtime design-token theming with namespaced `--uxds-*` CSS custom properties
- Per-screen, version-bound approval
- Append-only audit log derived from governance events
- AgentPilot seed-data fidelity
- Approval bound only to the current screen version
- Agile-plan readiness only after every required current screen version is approved

Optional surfaces present in the current build include persona review lens, responsive preview (including tablet), journey walkthrough, screen-version history UI, and the full accessibility evidence overlay.

## How it works

### Layering

```text
src/app            bootstrap, routes, providers, feature flags
src/features       overview, review, governance UI, audit, lenses, overlays
src/application    command orchestration (approve, revise, regenerate)
src/domain         UXSpec model + governance rules (framework-free)
src/ports          persistence, provider, clock, ID contracts
src/infrastructure seed data, browser persistence, mock design-agent provider
src/renderer       allowlisted registry, recursive composer, theming, actions
src/ui             shared shell and presentation primitives
```

Dependency direction: UI and infrastructure depend on application; application depends on domain and ports; renderer depends on the UXSpec domain model; domain stays free of React, routing, and browser APIs.

### UXSpec boundary

- Seed UXSpec, persisted browser state, and provider output are treated as untrusted.
- Structured data is runtime-validated and normalized once at the application boundary.
- The validated source UXSpec remains immutable.
- Approval, revision, regeneration, and audit state are **not** stored inside UXSpec.

### Renderer and theming

- Every screen is composed by the same recursive composer and allowlisted component registry.
- Registry entries validate props. Unknown types and invalid props fail safely without crashing the full screen.
- Component-tree depth is bounded. There is no `eval`, `dangerouslySetInnerHTML`, runtime-generated JavaScript, or model-generated event handlers.
- Semantic design tokens map only to allowlisted values and are scoped to the preview root as `--uxds-*` variables.

### Governance, regeneration, and persistence

- Approval, revision, and regeneration append domain events. Visible review status and audit history derive from that event stream.
- Approval belongs to one screen version and is effective only for that current version.
- Regeneration uses a mocked `DesignAgentProvider` (no real LLM, no provider network, no secrets). Dashboard is the regeneration target in this POC.
- A successful regeneration creates a new current version; prior approvals do not carry forward.
- A later revision request invalidates effective approval for that screen version.
- Governance persistence uses one managed browser-storage key for AgentPilot:

```text
uxds:v1:project-agentpilot:spec-agentpilot:1.0.0
```

Demo reset removes only that managed key. It never calls `localStorage.clear()`.

## Demo project

| Item | Value |
|---|---|
| Project | AgentPilot |
| Screens | Dashboard, Login, Task Detail, Workflow Templates, Reports Export |
| UX personas | Alex, Jordan, Taylor (review lens context; not auth) |
| Review actor | Demo Approver (fixed; no role-switching UI) |

Demo Approver is separate from UX personas and is not production
authentication, SSO, or RBAC.

## Prerequisites

- Node.js **22** or newer (CI uses Node 22)
- pnpm via Corepack, pinned as `pnpm@10.13.1` in `package.json`
- Optional: GitHub CLI (`gh`) for planning/import and agent Project helpers

The application itself requires **no environment variables and no secrets**.

## Install and run

This repository is a pnpm workspace. The standalone UX Design Studio app lives in
`apps/ux-design-studio` (`@uxds/studio`).

```bash
corepack enable
corepack pnpm install
```

### Development server

```bash
pnpm run dev
# equivalent: pnpm run dev:standalone
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) (Vite `server.port` is `5173`).

### Production build and local preview

```bash
pnpm run build:studio
pnpm run preview
```

- Production build command: `pnpm run build:studio` (or `pnpm run build` for all workspace packages)
- Output directory: `apps/ux-design-studio/dist/` (includes `remoteEntry.js`)
- Vercel root directory for the standalone/remote studio: `apps/ux-design-studio`
- Standalone/remote preview port: **4174**
- Simulated host preview port: **4173**
- Playwright runs standalone (`4174`) and federation (`4173`) projects unless `PLAYWRIGHT_BASE_URL` is set

### Federated host mode (E8)

```bash
pnpm run build:studio
VITE_UXDS_REMOTE_ENTRY=http://127.0.0.1:4174/remoteEntry.js pnpm run build:host
pnpm --filter @uxds/studio exec vite preview --host 127.0.0.1 --port 4174
pnpm --filter @uxds/host exec vite preview --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/projects/project-agentpilot/ux-design-studio/overview`.

- Host package: `apps/insanesdd-host` (`@uxds/host`)
- Remote entry env: `VITE_UXDS_REMOTE_ENTRY`
- Host is simulated; actor is synthetic Demo Approver; no real auth, backend, LLM, or Agile plan generation
- See [`docs/Federated_Host_Integration_Architecture_v1.0.md`](docs/Federated_Host_Integration_Architecture_v1.0.md)

## Demo walkthrough

1. Open **Overview** (`/overview`) and confirm AgentPilot summary, five screen cards, and gate progress.
2. Use **POC demo role** to select **Demo Approver** when exercising approval or regeneration.
3. Open each screen review (or start with Dashboard via **Review** / `Open Dashboard review`).
4. Approve current versions until the gate shows readiness for Agile plan generation, or intentionally leave the gate incomplete to explore status UI.
5. On Dashboard, submit a structured revision (node selection, category, description ≥ 8 characters).
6. Optionally enable **Simulate controlled provider failure**, click **Regenerate**, confirm the failure announcement and that the prior current version is retained, then disable the failure toggle.
7. Regenerate successfully; confirm loading / live announcement, regenerated content (for example **Priority operations view**), and a new current version.
8. Inspect **Version history** for baseline vs regenerated entries, source labels, and timestamps.
9. Confirm the gate is incomplete until the new current Dashboard version is reapproved; approve it to restore the gate when other required screens remain approved.
10. Open **Accessibility evidence**, exercise markers with keyboard focus, and confirm the preview remains operable.
11. Open **Audit** (`/audit`) to review the append-only event history.
12. Use **Reset demo state** on Audit to return to the deterministic seed governance state.

## Reset demo state

On `/audit`:

1. Choose **Reset demo state**.
2. Confirm in the dialog (**Confirm reset**).

Behavior:

- Removes only the managed governance key `uxds:v1:project-agentpilot:spec-agentpilot:1.0.0`
- Does **not** call `localStorage.clear()`
- Does not mutate the frozen AgentPilot UXSpec seed
- Announces that demo governance state was reset

Never paste arbitrary JSON into browser storage to prepare a demo. Use the UI to approve screens, then reset with the managed-key control only. See [`docs/demo-script.md`](docs/demo-script.md) for clean and prepared demo states.

## Routes

```text
/                 -> redirect to /overview
/overview         -> specification overview and approval gate summary
/review/:screenId -> per-screen review workbench (preview, decision panel, optional overlays)
/audit            -> append-only audit log and demo reset
*                 -> controlled not-found page
```

Application and route error boundaries keep the shell available after feature failures.

Canonical review IDs include `screen-dashboard`, `screen-login`, `screen-task-detail`, `screen-workflow-templates`, and `screen-reports-export`.

## Scripts

### Application

| Script | Purpose |
|---|---|
| `pnpm run dev` | Start the Vite development server |
| `pnpm run build` | Type-check the app project and create the production build in `dist/` |
| `pnpm run preview` | Preview the production build locally |
| `pnpm run lint` | Run ESLint |
| `pnpm run typecheck` | Strict TypeScript checks (`tsconfig.app`, `tsconfig.node`, `tsconfig.scripts`) |

### Testing

| Script | Purpose |
|---|---|
| `pnpm run test` | Vitest unit/integration suite |
| `pnpm run test:watch` | Vitest watch mode |
| `pnpm run test:e2e` | Playwright Chromium Epic 5 smoke against production preview |
| `pnpm run test:e2e:headed` | Playwright headed smoke |
| `pnpm run test:e2e:report` | Open the Playwright HTML report |

Before first E2E run locally, install the Chromium browser Playwright expects:

```bash
pnpm exec playwright install chromium
```

Generated Playwright evidence (`playwright-report/`, `test-results/`) is gitignored.

### Planning and agent tooling

| Script | Purpose |
|---|---|
| `pnpm run plan:validate` | Validate `.github/import/development-plan.json` |
| `pnpm run github:import:dry` | Dry-run GitHub Project import |
| `pnpm run github:import` | Execute GitHub Project import |
| `pnpm run github:import:verbose` | Verbose import |
| `pnpm run agent:validate` | Validate the agent-control layer and run manifests |
| `pnpm run agent:project-status` | Update one GitHub Project status item (`--issue` required) |
| `pnpm run ci:verify-signatures` | Verify GitHub commit signature status for a commit range |

Import commands can mutate GitHub. Run them only when explicitly authorized.

```bash
gh auth login -h github.com
gh auth refresh -h github.com -s repo,project,workflow
corepack pnpm run plan:validate
corepack pnpm run github:import:dry
```

## Testing and CI

- **Vitest** covers domain governance, renderer safety, application commands, feature flows (approval, revision, regeneration, version history, accessibility overlay, audit reset), seed/persistence contracts, and routes.
- **Playwright** (`e2e/epic5-release-smoke.spec.ts`) exercises the released Epic 5 browser journey against the production preview, including managed-key reset, controlled provider failure, regeneration, reapproval, accessibility overlay keyboard use, and reload persistence.

GitHub Actions workflow [`.github/workflows/quality.yml`](.github/workflows/quality.yml) runs on pull requests and pushes to `staging` / `main`, plus `workflow_dispatch`. Stable required job names:

| Job | What it enforces |
|---|---|
| Quality gate | `agent:validate`, `plan:validate`, lint, typecheck, test, build |
| Playwright E2E | Chromium install, `test:e2e`, evidence artifact upload |
| Commit signatures | Fail-closed GitHub commit verification for the PR or push range |

## Branch and release

```text
feature / fix / chore / test / docs branch from staging
  -> pull request to staging
      -> merge commit (retain feature branch; no squash)
          -> release pull request from staging to main
              -> tag v0.1.0-poc
```

- `main` is the accepted POC release branch; `staging` is the integration branch.
- Use signed commits (`git commit -S`); local `git verify-commit` and CI Commit signatures complement each other.
- Do not push directly to `staging` or `main`, and do not force-push protected branches.
- Branch protection / rulesets require pull requests, conversation resolution, signed commits, and the three CI jobs above. Merge commits remain permitted; linear history is not required.

## Non-goals / explicit exclusions

Do not expect this POC to include:

- Drag-and-drop or freeform design editing
- A real LLM integration or production backend
- Production authentication, SSO, OIDC, or RBAC
- Persistence beyond the approved browser-storage adapter (no durable signed audit store)
- Multi-project or multi-repository support (E8 may reject unsupported project IDs in the simulated host only)
- Runtime Module Federation outside the authorized E8 post-release demonstration, or production event streaming / Live Terminal publication
- Production APIs, a real Design Agent API, or a general-purpose low-code builder
- Arbitrary React component execution
- Arbitrary HTML, JavaScript, CSS, or dynamic imports from UXSpec data
- Pixel-perfect production design
- Real Agile plan generation (gate readiness is a POC signal only)
- Unapproved dependencies or architecture frameworks

`v0.1.0-poc` shipped as a standalone SPA under ADR-001. Post-release E8 (SoT v1.2, ADR-009) authorizes a separate federated demo with `@module-federation/vite`, a simulated InsaneSDD host, and preserved standalone execution. See [`docs/Federated_Host_Integration_Architecture_v1.0.md`](docs/Federated_Host_Integration_Architecture_v1.0.md).

Production evolution paths for OIDC/SSO, server RBAC, durable event storage, signed audit events, retention/legal hold, real Design Agent API, and Live Terminal publication remain documented in [`docs/architecture-decisions.md`](docs/architecture-decisions.md) and Architecture §29 — not implemented here.

## Controlling documents

Document authority order:

1. SoT v1.2 addendum: [`docs/UX Design Studio — Source of Truth v1.2 Addendum.md`](docs/UX%20Design%20Studio%20—%20Source%20of%20Truth%20v1.2%20Addendum.md)
2. SoT v1.1 addendum: [`docs/UX Design Studio — Source of Truth v1.1 Addendum.md`](docs/UX%20Design%20Studio%20—%20Source%20of%20Truth%20v1.1%20Addendum.md)
3. Frozen Source of Truth: [`docs/UX Design Studio — Source of Truth.pdf`](docs/UX%20Design%20Studio%20—%20Source%20of%20Truth.pdf)
4. [`docs/UX_Design_Studio_PRD_v1.0.md`](docs/UX_Design_Studio_PRD_v1.0.md)
5. [`docs/Federated_Host_Integration_Architecture_v1.0.md`](docs/Federated_Host_Integration_Architecture_v1.0.md) (E8)
6. [`docs/UX_Design_Studio_Technical_Architecture_v1.0.md`](docs/UX_Design_Studio_Technical_Architecture_v1.0.md)
7. [`docs/UX_Design_Studio_Development_Plan_v1.0.md`](docs/UX_Design_Studio_Development_Plan_v1.0.md)
8. Approved GitHub stories and acceptance criteria
9. [`AGENTS.md`](AGENTS.md) for repository-wide agent and delivery policy

Related planning tooling notes: [`docs/GitHub_Import_Instructions.md`](docs/GitHub_Import_Instructions.md).

### Release documentation

| Document | Purpose |
|---|---|
| [`docs/architecture-decisions.md`](docs/architecture-decisions.md) | Accepted ADR-001–008 with implementation and test evidence |
| [`docs/traceability.md`](docs/traceability.md) | PRD → architecture → GitHub → code → tests → PR evidence |
| [`docs/release-acceptance.md`](docs/release-acceptance.md) | Hard gates G1–G5, cut-line, PRD checklist, 50-hour accounting |
| [`docs/demo-script.md`](docs/demo-script.md) | 75-second positioning, 6–8 minute live flow, rehearsal log |

## Deployment

The approved target is a static SPA from `dist/` on Vercel. No application secrets are required. There are no serverless functions or API routes.

### Build

```bash
pnpm run build
```

Output: `dist/`.

### Vercel / SPA deep links

[`vercel.json`](vercel.json) configures:

- `framework`: `vite`
- `buildCommand`: `pnpm run build`
- `outputDirectory`: `dist`
- SPA rewrite to `/index.html` for non-asset routes (so `/overview`, `/review/:screenId`, and `/audit` survive refresh)

Verify after deploy:

- `/` → app redirect to `/overview`
- `/overview`, `/review/screen-dashboard`, `/audit` load on direct navigation
- Unknown paths show the controlled in-app not-found page
- `/assets/*` continue to load as static files

### Release URLs and tag

| Item | Value |
|---|---|
| Preview / project domain | https://ux-design-studio-poc.vercel.app |
| Production URL | https://ux-design-studio-poc.vercel.app |
| Release tag | `v0.1.0-poc` — pending final main release |
| GitHub Release | pending final main release |

### Playwright against a deployment

```bash
PLAYWRIGHT_BASE_URL=https://example.vercel.app pnpm run test:e2e
```

When `PLAYWRIGHT_BASE_URL` is set, Playwright does not start the local Vite preview server.
