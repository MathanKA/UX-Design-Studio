# Release acceptance — v0.1.0-poc

**Product positioning:** UX Design Studio is a proof-of-work concept extension for InsaneSDD 2.0 that deepens UX review into a visual, per-screen approval workbench.

It is **not** an official InfoBeans product or feature. This release does not claim production readiness, real authentication, real LLM integration, real Agile plan generation, or that InsaneSDD lacks a capability.

## 1. Release identity

| Field | Value |
|---|---|
| Version | `0.1.0` (`package.json`) |
| Release tag | `v0.1.0-poc` — **pending final main release** |
| Target date | 2026-07-15 (documentation prepared; tag pending main merge) |
| Integration branch | `staging` |
| Release branch | `main` |
| Story branch | `docs/uxds-58-document-deploy-rehearse-and-release-the-poc` |
| Deployment provider | Vercel (static SPA from `dist/`) |
| Preview / project domain | https://ux-design-studio-poc.vercel.app |
| Production URL | https://ux-design-studio-poc.vercel.app |
| Deployment ID (story verify) | `dpl_J9KZQbCGfQGFp9dUdyD65H3X372n` |
| Vercel CLI | 56.2.0 |
| GitHub Release | **pending final main release** |
| Application secrets required | None |

## 2. Scope accounting (planned effort)

Release scope is evaluated against the approved 50-hour planned allocation.

| Epic | Planned hours |
|---|---:|
| E1 | 6 |
| E2 | 16 |
| E3 | 6 |
| E4 | 8 |
| E5 | 6 |
| E6 | 8 |
| **Total** | **50** |

Actual wall-clock hours are not invented here. Planned allocation is authoritative for SC-012.

## 3. Cut-line decision

| Optional item | Decision |
|---|---|
| Journey walkthrough | Retained |
| Screen-version history UI | Retained |
| Full accessibility evidence overlay | Retained |
| Tablet preview | Retained |
| **Cut line activated** | **No** |

Mandatory never-cut capabilities remain present:

- Specification-driven rendering engine
- Runtime design-token theming
- Per-screen approval
- Append-only audit log
- AgentPilot seed-data fidelity

Feature flags in `src/app/config.ts` keep optional modules independently removable without activating a cut.

## 4. Hard gates G1–G5

### G1: Plan and architecture baseline

| Field | Value |
|---|---|
| Status | PASS |
| Evidence | Frozen Source of Truth PDF; PRD v1.0; Architecture v1.0; Development Plan v1.0; imported GitHub backlog |
| Commands | `pnpm run plan:validate`; `pnpm run agent:validate` |
| Links | Controlling docs under `docs/`; Project issues E1–E6 |

### G2: Rendering walking skeleton

| Field | Value |
|---|---|
| Status | PASS |
| Evidence | Five AgentPilot screens via registry + recursive composer; runtime `--uxds-*` tokens; generated navigation |
| Commands | `pnpm run test` (renderer/theming/review); `pnpm run build` |
| Tests / PRs | `registry.test.tsx`, `composer.test.tsx`, `theming.test.tsx`, `review.test.tsx`; stories #12–#21; PRs #69–#73 |

### G3: Governance end to end

| Field | Value |
|---|---|
| Status | PASS |
| Evidence | Approval, structured revision, demo roles, append-only audit, managed-key persistence and reload |
| Commands | `pnpm run test` |
| Tests / PRs | `governance.test.ts`, `approval.test.tsx`, `revision-roles.test.tsx`, `audit.test.tsx`, persistence tests; stories #35–#44; PRs #82–#87 |

### G4: Version-bound regeneration

| Field | Value |
|---|---|
| Status | PASS |
| Evidence | Mock regeneration creates validated new current Dashboard version; prior approval does not approve it; reapproval restores gate |
| Commands | `pnpm run test`; `CI=true pnpm run test:e2e` |
| Tests / PRs | `regenerate-screen.test.ts`, `regenerate.test.tsx`, `version-history.test.tsx`, critical RTL, Playwright; stories #48–#51; PRs #89–#92 |

### G5: Release-ready demo

| Field | Value |
|---|---|
| Status | PARTIAL — static deploy, deep links, and automated rehearsal PASS; signed tag / GitHub Release pending final main merge |
| Evidence | CI workflow; production build; `vercel.json` SPA deep links; ADR/traceability/demo/release docs; Playwright local + `PLAYWRIGHT_BASE_URL=https://ux-design-studio-poc.vercel.app`; managed reset |
| Commands | `pnpm run lint`; `pnpm run typecheck`; `pnpm run test`; `pnpm run build`; `CI=true pnpm run test:e2e`; `PLAYWRIGHT_BASE_URL=https://ux-design-studio-poc.vercel.app pnpm run test:e2e` |
| Tests / PRs | `critical-demo-flow.integration.test.tsx` (#100); `e2e/epic5-release-smoke.spec.ts` (#94–#96); README #98; this story #58 |
| Remaining risks | Spoken interview rehearsal not claimed; tag and GitHub Release only after G5 final PASS on main |

## 5. PRD release checklist

### Product behavior

| Checklist item | Status | Evidence / method |
|---|---|---|
| Specification overview is complete | PASS | `overview.test.tsx`; Overview UI |
| Five screens are available | PASS | Seed + review routes; Playwright |
| Screens render from UXSpec data | PASS | Composer + seed contract tests |
| Design tokens apply globally | PASS | `theming.test.tsx` |
| Navigation works across core screens | PASS | Review + action resolver tests; Playwright |
| Persona lens works | PASS | `persona-lens.test.tsx` |
| Mobile and desktop previews work | PASS | `responsive-preview.test.tsx` (tablet retained) |
| Accessibility badges or overlay per cut-line | PASS | Overlay retained; `accessibility-overlay.test.tsx` |
| Per-screen approval works | PASS | `approval.test.tsx`; critical RTL |
| Structured revision requests work | PASS | `revision-roles.test.tsx`; critical RTL |
| Mock regeneration works | PASS | Regenerate tests; Playwright |
| Audit events persist across reloads | PASS | Persistence tests; critical RTL remount; Playwright |
| Gate-completion state works | PASS | Gate selectors; critical RTL; Playwright |
| Fixed Demo Approver with no role-simulation UI | PASS | `revision-roles.test.tsx`; critical RTL; Playwright absence assertion |

### Quality

| Checklist item | Status | Evidence / method |
|---|---|---|
| No unhandled errors in demonstration path | PASS (automated) | Playwright console/pageerror guard on local preview |
| Loading, empty, and error states present | PASS | UI state components + feature tests |
| Keyboard navigation through primary path | PASS (automated partial) | Overlay/review tests + Playwright overlay keyboard; **full spoken manual audit not claimed** |
| Rendering-engine unit tests pass | PASS | `pnpm run test` renderer suite |
| Approval-state unit tests pass | PASS | Governance + approval tests |
| Production build succeeds | PASS | `pnpm run build` → `dist/` |

### Documentation and positioning

| Checklist item | Status | Evidence / method |
|---|---|---|
| README states concept extension, not official InfoBeans product | PASS | `README.md` (PR #98 baseline + US-6.2 updates) |
| README lists POC exclusions | PASS | README Non-goals / Explicit exclusions |
| ADR documents decisions and production path | PASS | `docs/architecture-decisions.md` |
| Demo script avoids claims about unavailable capabilities | PASS | `docs/demo-script.md` |
| Final implementation within 50 hours | PASS | Planned allocation table above (SC-012) |

## 6. Accessibility verification

| Area | Automated evidence | Manual / spoken |
|---|---|---|
| Keyboard route navigation | Playwright + RTL flows | Not claimed as completed spoken rehearsal |
| Role control | `revision-roles.test.tsx`, critical RTL | Not claimed |
| Breakpoint control | `responsive-preview.test.tsx` | Not claimed |
| Persona control | `persona-lens.test.tsx` | Not claimed |
| Revision form | revision + critical RTL | Not claimed |
| Regeneration controls | regenerate tests + Playwright | Not claimed |
| Accessibility overlay controls | `accessibility-overlay.test.tsx` + Playwright | Not claimed |
| Focus visibility | Partial via component tests | Not claimed as full visual audit |
| Dialog focus and restoration | Reset/revision dialog tests where covered | Not claimed as complete |
| Live-region announcements | Regeneration/reset announcements in feature tests | Not claimed |
| Reduced-motion behavior | Prefer-reduced-motion respected where implemented | Not claimed as separate rehearsal |

**Statement:** Automated accessibility-related checks support release readiness. A spoken human accessibility rehearsal is **not claimed** unless and until it is performed and logged.

## 7. Deployment verification

| Field | Value |
|---|---|
| Build command | `pnpm run build` |
| Output directory | `dist/` |
| Config | `vercel.json` (framework `vite`, SPA rewrite excluding `/assets/`) |
| Preview / project domain | https://ux-design-studio-poc.vercel.app |
| Production URL | https://ux-design-studio-poc.vercel.app |
| Deep-link routes verified | `/`, `/overview`, `/review/screen-dashboard`, `/review/screen-login`, `/audit`, unknown path → SPA `index.html` (HTTP 200) |
| External Playwright | PASS — `PLAYWRIGHT_BASE_URL=https://ux-design-studio-poc.vercel.app` (~8.4s test / ~9.1s wall, 2026-07-15) |
| Reset-state result | Managed-key reset verified in unit/e2e; Epic 5 smoke includes reset on deployed URL |
| Required environment secrets | None |

## 8. Security and scope exclusions

Confirmed for this POC release:

- No production credentials or repository secrets required by the app
- No production customer or personal data
- No external Design Agent / LLM network call
- No real LLM evaluation
- No production backend
- No production authentication, SSO, or RBAC
- No runtime Module Federation
- No production Live Terminal / event-stream integration
- Demo roles are simulation only
- Browser storage is not durable regulated audit storage
- Gate readiness is not real Agile plan generation

## 9. Related artifacts

- [`docs/architecture-decisions.md`](architecture-decisions.md)
- [`docs/traceability.md`](traceability.md)
- [`docs/demo-script.md`](demo-script.md)
- [`README.md`](../README.md)
