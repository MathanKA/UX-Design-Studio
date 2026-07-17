# Traceability matrix

**Product positioning:** UX Design Studio is a proof-of-work concept extension for InsaneSDD 2.0 that deepens UX review into a visual, per-screen approval workbench.

It is **not** an official InfoBeans product. This matrix maps PRD requirements through architecture, GitHub delivery, implementation, tests, and release evidence. It does not claim production readiness, real auth, real LLM integration, or real Agile plan generation.

## How to read this matrix

Evidence chain:

```text
Source of Truth / PRD
  → Architecture section
  → GitHub epic / story / task
  → Implementation modules
  → Tests
  → Delivery PR (where known)
  → Release evidence
```

**Citation note:** Numbers such as #12, #15, #18, #21, #25, #28, #31, #35, #38, #41, #44, #48, and #51 are GitHub **story issues**. Delivery merge PRs are listed separately where known. Maintenance and release PRs #94–#96, #98, #99, and #100 are pull requests.

**Pending release items** (not yet claimed complete):

| Item | Status |
|---|---|
| Production URL | https://ux-design-studio-poc.vercel.app (verified deep links + external Playwright 2026-07-15) |
| Release tag `v0.1.0-poc` | pending final main release |
| GitHub Release | pending final main release |
| Spoken human demo rehearsal | not claimed (automated Playwright rehearsal only until performed) |

Critical RTL and Playwright evidence for E6:

- `src/app/critical-demo-flow.integration.test.tsx` (PR #100)
- `e2e/epic5-release-smoke.spec.ts` (PRs #94–#96 reuse; CI Playwright job)

---

## FR-001–004 — Overview

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-001 | Display overview of loaded UX specification | §14 workbench / overview surfaces | E3 #24, US-3.1 #25, T-3.1.1 #26 | `src/features/overview/OverviewPage.tsx`, `src/domain/ux-spec/overview-selectors.ts` | `src/features/overview/overview.test.tsx`, `src/domain/ux-spec/overview-selectors.test.ts` | Story #25; PR #76; epic PR #80 |
| FR-002 | Persona, journey, screen, component, approval counts | Overview selectors + governance selectors | #25, #26 | `OverviewPage.tsx`, `deriveUXSpecOverviewSummary`, gate progress from governance selectors | `overview.test.tsx`, `overview-selectors.test.ts` | #25 / #76 |
| FR-003 | Per-screen approval state and overall progress | Governance selectors | US-4.2 #38, T-4.2.2 #40; overview #25 | `src/domain/governance/selectors.ts`, overview cards | `src/features/governance/approval.test.tsx`, `overview.test.tsx` | #38 / #83; #25 / #76 |
| FR-004 | Open any of five AgentPilot screens | Routes + review workbench | #25, #27 | `src/app/routes.tsx`, `src/features/review/ReviewPage.tsx` | `src/app/routes.test.tsx`, `src/features/review/review.test.tsx` | #25 / #76 |

**Release evidence:** Critical RTL opens overview and review (`critical-demo-flow.integration.test.tsx`). Playwright smoke opens all five reviews (`e2e/epic5-release-smoke.spec.ts`).

---

## FR-010–015 — Renderer and failure states

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-010 | Render screen definitions from typed UXSpec | §10–13 renderer | E2 #11, US-2.4 #21 | `ScreenComposer.tsx`, seed loaders | `composer.test.tsx`, `agentpilot-seed.test.ts` | #21 / #72; epic #73 |
| FR-011 | Resolve nodes through component registry | Registry | US-2.1 #12 | `src/renderer/registry/create-registry.ts` | `registry.test.tsx` | #12 / #69 |
| FR-012 | ~12–15 component types | Allowlisted registry | #12, #13, #14 | Twelve primitives in `create-registry.ts` + components under `src/renderer/components/` | `registry.test.tsx` | #12 / #69 |
| FR-013 | All five screens on common path | Recursive composer | #21, #22, #23 | `RecursiveComposer.tsx`, AgentPilot seed screens | `composer.test.tsx`, `review.test.tsx`, `agentpilot-seed.test.ts` | #21 / #72 |
| FR-014 | No hard-coded page architectures as primary model | Composer invariants | E2 stories | Review uses composer; no page-specific screen switch trees | `composer.test.tsx`, `review.test.tsx` | #15 / #70; #21 / #72 |
| FR-015 | Loading, empty, error, partial-data states | Shell states | #25, #51 / #53 | `src/ui/states/*`, review/overview error paths, `error-boundary.tsx` | `overview.test.tsx`, `review.test.tsx`, accessibility/version-history resilience tests | #76; #90 |

**Release evidence:** Renderer unit suite + five-screen smoke in Playwright.

---

## FR-020–023 — Design tokens

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-020 | Apply palette, typography, spacing, layout tokens | Theming | US-2.3 #18, #19, #20 | `token-mapper.ts`, `PreviewThemeRoot.tsx` | `theming.test.tsx` | #18 / #71 |
| FR-021 | Tokens affect all screens consistently | Preview root scoping | #18 | Shared token map on preview root | `theming.test.tsx`, `review.test.tsx` | #18 / #71 |
| FR-022 | Token changes update preview without reload | Runtime CSS variables | #20 | `--uxds-*` custom properties | `theming.test.tsx` | #18 / #71 |
| FR-023 | InsaneSDD-aligned visual language (light chrome, red accent, sidebar) | Seed tokens + chrome | Seed US-1.3 #8; theming #18 | AgentPilot seed tokens; shell/preview chrome | Seed + theming tests | #8; #18 / #71 |

---

## FR-030–034 — Navigation and journey

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-030 | Desktop sidebar navigation | Generated navigation | US-2.4 #21; US-3.3 #31 | `GeneratedNavigation.tsx`, navigation registry primitive | `review.test.tsx`, `responsive-preview.test.tsx` | #21 / #72; #31 / #78 |
| FR-031 | Mobile compact / hamburger model | Breakpoint preview | #31, #32 | `PreviewViewport.tsx`, preview breakpoint controls | `responsive-preview.test.tsx` | #31 / #78 |
| FR-032 | Navigation moves between seeded screens | Declarative actions | US-2.2 #15; #21 | `create-action-resolver.ts` | `composer.test.tsx`, `registry.test.tsx` | #15 / #70; #21 / #72 |
| FR-033 | Active screen identifiable | Review workbench | #25, #21 | Review heading / active nav treatment | `review.test.tsx` | #25 / #76 |
| FR-034 | Guided journey walkthrough (Should / cuttable) | Optional module | US-3.3 #31, #33 | `src/features/journey-walkthrough/*`; flag `enableJourneyWalkthrough` | `journey-walkthrough.test.tsx` | #31 / #78 — **retained** (cut line not activated) |

---

## FR-040–042 — Persona lens

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-040 | Select Alex, Jordan, or Taylor lens | Persona lens | US-3.2 #28, #29, #30 | `PersonaLensPanel.tsx`, `persona-lens-selectors.ts` | `persona-lens.test.tsx` | #28 / #77 |
| FR-041 | Goals, frustrations, journey touchpoints for current screen | Selectors | #29 | `src/domain/ux-spec/persona-lens-selectors.ts` | `persona-lens.test.tsx` | #28 / #77 |
| FR-042 | Annotations visually distinct from product screen | Lens panel chrome | #30 | Persona panel separate from preview root | `persona-lens.test.tsx` | #28 / #77 |

**Note:** UX personas are review-lens context only — not authentication.

---

## FR-050–053 — Responsive preview

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-050 | Mobile, tablet, desktop preview (tablet cuttable) | Breakpoint controls | US-3.3 #31, #32 | `PreviewBreakpointControls.tsx`; flag `enableTabletPreview` | `responsive-preview.test.tsx` | #31 / #78 — tablet **retained** |
| FR-051 | Layout recomposes without reload | Preview context | #32 | Breakpoint state in review workbench | `responsive-preview.test.tsx` | #31 / #78 |
| FR-052 | Mobile stacked / mobile-first behavior | Seed + viewport | #22, #31 | Seed responsive rules + mobile viewport | `responsive-preview.test.tsx`, seed tests | #21 / #72; #31 / #78 |
| FR-053 | Larger previews support multi-column / grid | Grid primitive + desktop viewport | #21, #31 | `Grid.tsx`, desktop breakpoint | `registry.test.tsx`, `responsive-preview.test.tsx` | #12 / #69; #31 / #78 |

---

## FR-060–062 — Accessibility evidence

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-060 | Enable/disable accessibility overlay (Should / cuttable) | Optional overlay | US-5.2 #51, #53 | `AccessibilityOverlayPanel.tsx`; flag `enableAccessibilityOverlay` | `accessibility-overlay.test.tsx` | #51 / #90 — **retained** |
| FR-061 | Contrast, ARIA/label, screen-reader notes from seed | Overlay selectors | #53 | `accessibility-selectors.ts` | `accessibility-overlay.test.tsx` | #51 / #90 |
| FR-062 | Minimum contrast badges if overlay cut | Contrast badges | #51 | `ContrastBadges.tsx`; flag `enableContrastBadges` | `accessibility-overlay.test.tsx` | #51 / #90 |

**NFR 16.1 note:** Automated keyboard coverage exists in overlay/review tests and Playwright. Spoken/manual full WCAG rehearsal is **not claimed** in `docs/release-acceptance.md` unless performed.

---

## FR-070–075 — Approval and gate

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-070 | Per-screen approval state | Event-driven governance | US-4.1 #35, US-4.2 #38 | `selectors.ts`, decision UI | `governance.test.ts`, `approval.test.tsx` | #35 / #82; #38 / #83 |
| FR-071 | Approver can approve active screen | Approve command + roles | #38, #39 | `approve-screen.ts`, `DecisionPanel.tsx` | `approve-screen.test.ts`, `approval.test.tsx` | #38 / #83 |
| FR-072 | Record actor, action, screen, baseline, timestamp, payload | Event metadata | #35, #36 | `events.ts`, `event-metadata.ts` | `governance.test.ts` | #35 / #82 |
| FR-073 | Progress updates after each decision | Selectors + overview | #40 | Gate/progress selectors | `approval.test.tsx`, `overview.test.tsx` | #38 / #83 |
| FR-074 | One screen approval does not approve another | Per-screen selectors | #37 | Screen-scoped status | `governance.test.ts` | #35 / #82 |
| FR-075 | Completion only when every required screen approved | Gate selector | #37, #40 | `selectIsGateComplete` | `governance.test.ts`, `approval.test.tsx`, critical RTL, Playwright | #38 / #83; #100 |

---

## FR-080–083 — Revision

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-080 | Approver can request revision | Revision command | US-4.3 #41, #42 | `request-revision.ts`, `DecisionPanel.tsx` | `request-revision.test.ts`, `revision-roles.test.tsx` | #41 / #84 |
| FR-081 | Capture components, category, description | Revision form | #42 | Decision panel revision fields | `revision-roles.test.tsx`, critical RTL | #41 / #84 |
| FR-082 | Reference screen, screen version, spec version, baseline | Command payload | #36, #42 | Governance commands / events | `governance.test.ts`, `request-revision.test.ts` | #35 / #82; #41 / #84 |
| FR-083 | Revision creates audit event | Append-only events | #41, US-4.4 #44 | Reducer append + audit view | `governance.test.ts`, `audit.test.tsx` | #41 / #84; #44 / #85 |

---

## FR-090–095 — Regeneration

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-090 | Expose regeneration through `DesignAgentProvider` | Provider port | US-5.1 #48, #49 | `src/ports/design-agent-provider.ts` | `design-agent-provider.test.ts` | #48 / #89 |
| FR-091 | Deterministic pre-authored variant | Mock adapter | #49 | `mock-design-agent-provider.ts`, `agentpilot-variants.ts` | `mock-design-agent-provider.test.ts` | #48 / #89 |
| FR-092 | Simulated latency and loading state | Regeneration use case | #50 | Latency constant + UI loading/announcements | `regenerate.test.tsx`, Playwright | #48 / #89 |
| FR-093 | New screen-version reference (Should / history cuttable) | Version activation | #48, US-5.2 #51, #52 | Regenerated version IDs + history panel | `regenerate-screen.test.ts`, `version-history.test.tsx` | #48 / #89; #51 / #90 — history **retained** |
| FR-094 | Demonstrate prior and regenerated version | Dashboard target | #48, #51 | `REGENERATION_TARGET_SCREEN_ID = screen-dashboard` | regenerate + version-history tests; Playwright | #48 / #89; #51 / #90 |
| FR-095 | No real LLM required | Mock only | #48 | No network provider; no secrets | Provider tests assert mock boundary | #48 / #89; epic #92 |

---

## FR-100–105 — Audit and persistence

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-100 | Audit-log view | Audit feature | US-4.4 #44, #46 | `AuditPage.tsx` | `audit.test.tsx` | #44 / #85 |
| FR-101 | Approval, revision, regeneration as append-only events | Event log | #35, #44 | Reducer append-only | `governance.test.ts`, `audit.test.tsx` | #35 / #82; #44 / #85 |
| FR-102 | Chronological display | Selectors | #46 | `selectChronologicalEvents`, audit formatting | `governance.test.ts`, `audit.test.tsx` | #44 / #85 |
| FR-103 | Actor, action, screen, baseline, timestamp, payload | Event schema | #36 | `format-audit-event.ts`, event types | `audit.test.tsx` | #44 / #85 |
| FR-104 | Survive reload via browser persistence | Repository port | #45 | `local-storage-governance-repository.ts` | persistence tests; critical RTL remount; Playwright reload | #44 / #85 |
| FR-105 | Inspect events for an individual screen | Audit filters | #46 | Audit page screen filtering | `audit.test.tsx` | #44 / #85 |

Managed reset: `ResetDemoStateControl.tsx` removes only `uxds:v1:project-agentpilot:spec-agentpilot:1.0.0` — never `localStorage.clear()`.

---

## FR-110–112 — Fixed review actor

| ID | PRD requirement (summary) | Architecture | GitHub | Implementation | Tests | Delivery evidence |
|---|---|---|---|---|---|---|
| FR-110 | Fixed Demo Approver; no role-simulation UI | Fixed actor composition | US-4.3 #41, #43; v1.1 addendum | `GovernanceProvider.tsx`; role-switcher module removed | `revision-roles.test.tsx`; Playwright absence assertion | v1.1 product override |
| FR-111 | Only Approver may approve, revise, regenerate | Command capability enforcement | #43 | Application capability checks | `revision-roles.test.tsx` unauthorized bypass coverage | #41 / #84; v1.1 verification |
| FR-112 | Not production-secure authorization | Synthetic fixed actor | README; v1.1 addendum | No auth or identity UI/claim | Documentation review | v1.1 product override |

---

## NFR 16.1–16.6

| ID | Requirement (summary) | Architecture | Implementation / process | Tests / evidence | Status |
|---|---|---|---|---|---|
| 16.1 Accessibility | WCAG 2.1 AA target; keyboard; overlay must not block preview | §26 adjacent; overlay § optional | Overlay + studio controls; dialogs in reset/revision flows | `accessibility-overlay.test.tsx`; Playwright overlay keyboard path; **manual spoken rehearsal not claimed** | Partial automated PASS; manual full audit pending/not claimed |
| 16.2 Performance | Responsive on modern laptop; no production SLA | Static seeded SPA | Vite production build `dist/` | `pnpm run build`; Playwright against preview | PASS for POC expectations |
| 16.3 Reliability | Demo path without unhandled exceptions; storage recovery | Error boundaries + envelope validation | `error-boundary.tsx`, persistence recovery | routes/audit/persistence tests; Playwright console guard | PASS (automated) |
| 16.4 Security / privacy | No production credentials/customer data; demo roles not auth | §26 | No app secrets; synthetic AgentPilot seed | Source review; release-acceptance security section | PASS for POC scope |
| 16.5 Maintainability | Strict TS; renderer + governance tests; README + ADR | §27–§28, §34 | `docs/architecture-decisions.md`, README, Vitest suite | `pnpm run typecheck`, `pnpm run test`; ADR artifact (this release) | PASS |
| 16.6 Portability | No server; Vercel/Netlify deployable; mocked providers | §28–§29 | `vercel.json`, static `dist/`, mock provider | `pnpm run build`; SPA rewrites; deep-link HTTP 200; `PLAYWRIGHT_BASE_URL=https://ux-design-studio-poc.vercel.app` PASS | PASS — https://ux-design-studio-poc.vercel.app |

---

## SC-001–012 — POC success criteria

| ID | Criterion | Primary evidence | GitHub / PR | Status |
|---|---|---|---|---|
| SC-001 | Five screens via spec-driven renderer | Seed + composer + review | #21 / #72; tests above | PASS |
| SC-002 | Same design-token source on all screens | Theming | #18 / #71 | PASS |
| SC-003 | Navigate + persona + breakpoint lenses | Review workbench | #25–#31 / #76–#78 | PASS |
| SC-004 | Approve screens individually | Governance approval | #38 / #83 | PASS |
| SC-005 | Structured revision request | Revision flow | #41 / #84 | PASS |
| SC-006 | Mock provider revised variant, no real LLM | Provider mock | #48 / #89 | PASS |
| SC-007 | Approval/revision/regeneration in persistent audit | Audit + persistence | #44 / #85 | PASS |
| SC-008 | Events traceable to screen and baseline | Event metadata | #35 / #82; #44 / #85 | PASS |
| SC-009 | Agile-plan readiness only after all required approvals | Gate selector (readiness signal only — not real plan generation) | #38 / #83; critical RTL; Playwright | PASS |
| SC-010 | Deployed core workflow demonstrable end to end | Playwright + deployment | #94–#96, #100; Vercel `ux-design-studio-poc` | PASS — https://ux-design-studio-poc.vercel.app deep links + external Playwright 2026-07-15 (tag/GitHub Release still pending final main) |
| SC-011 | Unit tests, ADR, README, explicit exclusions | README #98; ADR this story #58; tests | #98, #58 docs, test suite | PASS for docs/tests once this story merges; exclusions documented |
| SC-012 | Delivery within 50 planned hours | Planned allocation E1–E6 = 50 | Development plan; `docs/release-acceptance.md` | PASS against **planned** allocation (actual-hours not invented) |

---

## Cross-cutting E6 quality evidence

| Concern | Evidence | PR / issue |
|---|---|---|
| Critical RTL demo flow | `src/app/critical-demo-flow.integration.test.tsx` | US-6.1 #55 / PR #100 |
| Playwright release smoke | `e2e/epic5-release-smoke.spec.ts` | #93 / #94–#96 |
| CI Quality gate, Playwright E2E, Commit signatures | `.github/workflows/quality.yml` | #94–#96 |
| README operator baseline | `README.md` | #97 / #98 |
| E6 authorization manifest | `.agents/runs/e6.yml` | #99 |
| ADR / traceability / release / demo docs | `docs/architecture-decisions.md`, this file, `docs/release-acceptance.md`, `docs/demo-script.md` | US-6.2 #58 (in progress on this branch) |

---

## Related artifacts

- [`docs/architecture-decisions.md`](architecture-decisions.md)
- [`docs/release-acceptance.md`](release-acceptance.md)
- [`docs/demo-script.md`](demo-script.md)
- [`README.md`](../README.md)
