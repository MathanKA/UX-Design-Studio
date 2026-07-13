# UX Design Studio POC Development Plan

> **Version:** 1.0  
> **Repository:** `MathanKA/UX-Design-Studio`  
> **Delivery model:** Solo Scrumban, two increments  
> **Effort cap:** 50 build hours  
> **Integration branch:** `staging`  
> **Release flow:** `staging` to `main`  
> **Release tag:** `v0.1.0-poc`

## 1. Purpose

This plan converts the frozen UX Design Studio scope, approved PRD, and Technical Architecture into an executable and traceable backlog. It covers implementation, verification, deployment, documentation, release, and interview rehearsal without adding production backend, real LLM, SSO, runtime Module Federation, or other excluded scope.

## 2. Planning summary

| Measure | Value |
|---|---:|
| Epics | 6 |
| User and enabler stories | 18 |
| Engineering tasks | 36 |
| Delivery increments | 2 |
| Hard gates | 5 |
| Work-in-progress limit | 1 implementation story |
| Total estimate | 50 hours |

### Effort allocation

| Epic | Hours | Increment |
|---|---:|---|
| E1 Application Foundation and UXSpec Contracts | 6 | A - Walking Skeleton |
| E2 Spec-Driven Rendering and Runtime Theming | 16 | A - Walking Skeleton |
| E3 Review Workbench and Contextual Lenses | 6 | A - Walking Skeleton |
| E4 Screen-Level Governance, Roles and Audit | 8 | B - Governance and Release |
| E5 Mock Regeneration and Review Hardening | 6 | B - Governance and Release |
| E6 Quality, Documentation, Deployment and Demonstration | 8 | B - Governance and Release |
| **Total** | **50** | |

## 3. Delivery model

Use a lightweight Scrumban board:

```text
Backlog -> Ready -> In Progress -> Verify -> Done
                         \-> Blocked
Backlog/Ready -----------> Cut
```

- Only one implementation story may be in progress at a time.
- A documentation or test-preparation item may run alongside it only when it does not create another coding stream.
- Work enters `Ready` only after the Definition of Ready passes.
- `Verify` requires acceptance, test, architecture, scope, and branch checks.
- Cut-line work moves to `Cut`, not `Done`.

### Increment A: Walking Skeleton

Primary outcome: validated AgentPilot UXSpec, one recursive rendering path, runtime tokens, five rendered screens, generated navigation, and the workbench shell.

### Increment B: Governance and Release

Primary outcome: version-bound approval, structured revision, persistent audit, mocked regeneration, roles, lenses, accessibility, tests, deployment, release, and rehearsal.

## 4. Branch, commit and pull-request policy

### Permanent branches

```text
main       Production and accepted POC release
staging    Integration and merge base for every implementation branch
```

### Working branch rules

- Create one short-lived branch per story from the latest `staging`.
- Default pattern: `<type>/uxds-<github-issue-number>-<slug>`.
- Examples: `feat/uxds-21-recursive-composer`, `test/uxds-54-governance-tests`, `docs/uxds-59-release-readme`.
- Every working pull request targets `staging`.
- Use squash merge after verification.
- Do not merge implementation branches directly to `main`.
- Final release uses one pull request from `staging` to `main`, followed by tag `v0.1.0-poc`.

### Conventional commits

```text
feat(renderer): compose nested UXSpec nodes [#21]
fix(governance): invalidate approval after regeneration [#38]
test(governance): cover current-version gate rules [#54]
docs(release): add POC setup and demo guide [#59]
```

### Pull-request checklist

- Parent issue and PRD requirement references
- Architecture section references
- Acceptance criteria completed
- Relevant tests and production build result
- Screenshots for visible changes
- Scope classification and any cut-line decision
- Base branch confirmed as `staging`, except final release PR

## 5. Definition of Ready

- Acceptance criteria are testable.
- UXSpec input and required registry types are identified.
- Dependencies are known.
- Mandatory or cut-line classification is explicit.
- Estimate fits the remaining 50-hour budget.

## 6. Definition of Done

- Acceptance criteria are verified.
- Relevant unit, contract, integration, accessibility, lint, type and build checks pass.
- No frozen Source of Truth, PRD or architecture rule is weakened.
- PR references its issue and targets staging.
- Documentation and screenshots are updated when applicable.

## 7. Hard planning gates

### G1: Plan and architecture baseline

**Pass condition:** Source of Truth, PRD, architecture, development plan, ticket structure and cut-line are approved before implementation.

### G2: Rendering walking skeleton

**Pass condition:** All five screens render through one validated registry/composer path with runtime tokens and generated navigation.

### G3: Governance end to end

**Pass condition:** Approval, revision, role policy, append-only audit and valid reload persistence work together.

### G4: Version-bound regeneration

**Pass condition:** Mock regeneration creates a validated new current version and prior approval does not approve it.

### G5: Release-ready demo

**Pass condition:** CI, production build, static deployment, accessibility checks, reset flow, complete demo and release acceptance pass.

When a hard gate fails, stop new feature work and restore the gate. Do not hide a mandatory failure by moving optional work to Done.

## 8. Scope cut-line

| Order | Remove | Retain |
|---:|---|---|
| 1 | Journey walkthrough | Core screen navigation |
| 2 | Screen-version history UI | Current-version regeneration and reapproval semantics |
| 3 | Full accessibility overlay | Minimum contrast badges |
| 4 | Tablet preview | Mobile and desktop |

**Never cut:**
- Specification-driven rendering engine
- Runtime design-token theming
- Per-screen approval
- Audit log
- AgentPilot seed-data fidelity

## 9. Detailed backlog

Every imported issue receives a stable plan key marker. GitHub supplies the repository issue number used by branches, commits, and pull requests.

### E1: Application Foundation and UXSpec Contracts (6h)

**Objective:** Establish the reproducible SPA foundation, immutable domain contracts, runtime validation, and AgentPilot seed baseline.

**Increment:** A - Walking Skeleton  
**Priority:** P0  
**PRD:** FR-001–004, FR-010, FR-015, SC-001, SC-011  
**Architecture:** §8, §10–13, §28, ADR-001, ADR-003

#### US-1.1: Bootstrap the frontend engineering foundation (1.5h)

As an engineer, I need a strict, reproducible React and TypeScript workspace so that every later capability is built and verified consistently.

**Classification:** P0 | Mandatory | A - Walking Skeleton | Area: Foundation

**Acceptance criteria**

- [ ] Vite, React 18, strict TypeScript, React Router, CSS Modules, Vitest, and React Testing Library are configured.
- [ ] The application exposes /overview, /review/:screenId, and /audit routes.
- [ ] Lint, type-check, test, build, and preview commands are documented and executable.
- [ ] Application and route error boundaries prevent an unhandled shell failure.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-1.1.1 | Initialize Vite, React, TypeScript and quality tooling | 0.75 | A reproducible pnpm workspace with strict compiler and quality checks. |
| T-1.1.2 | Create application shell, routes and root boundaries | 0.75 | A navigable shell with isolated route failure handling. |

**PRD:** FR-001, FR-004, FR-015, NFR 16.5, SC-011  
**Architecture:** §8, §10, §11, §24, §28

#### US-1.2: Define and validate immutable UXSpec contracts (2h)

As the rendering system, I need a typed and runtime-validated UX specification so that generated data cannot bypass domain and safety constraints.

**Classification:** P0 | Mandatory | A - Walking Skeleton | Area: Domain

**Acceptance criteria**

- [ ] UXSpec, ScreenSpec, ComponentNode, Persona, Journey, DesignTokens, navigation, responsive, and accessibility contracts are defined.
- [ ] Runtime schemas validate raw specification data and reject unsafe or malformed values.
- [ ] Cross-reference invariants verify unique IDs and valid persona, journey, navigation, and screen references.
- [ ] Validated source data is exposed as readonly and is not used to store governance state.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-1.2.1 | Implement UXSpec TypeScript models and runtime schemas | 1 | Compile-time and runtime contracts for every required UXSpec entity. |
| T-1.2.2 | Implement normalization, invariants and specification loader | 1 | A single validated readonly input boundary for the application. |

**Depends on:** US-1.1

**PRD:** FR-010, FR-013, FR-015, BR-003, NFR 16.3, NFR 16.4  
**Architecture:** §5.1–5.3, §12, §13, ADR-003, ADR-004

#### US-1.3: Author and verify the AgentPilot seed baseline (2.5h)

As a reviewer, I need the POC to use a faithful AgentPilot UXSpec so that the demo represents the same personas, journeys, screens, navigation, and design system shown in the source workflow.

**Classification:** P0 | Mandatory | A - Walking Skeleton | Area: Domain

**Acceptance criteria**

- [ ] Seed data contains three personas, three journeys, five screens, navigation rules, design tokens, accessibility metadata, and approximately 30 composed nodes.
- [ ] Dashboard and Login are authored first, followed by Task Detail, Workflow Templates, and Reports Export.
- [ ] The seed passes the same runtime validation used for future API or AI input.
- [ ] No screen depends on a page-specific React implementation.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-1.3.1 | Create AgentPilot personas, journeys, tokens and navigation seed | 1 | A validated shared baseline containing non-screen UX context. |
| T-1.3.2 | Create five screen trees and seed contract tests | 1.5 | Five valid screen definitions ready for the common renderer. |

**Depends on:** US-1.2

**PRD:** FR-002, FR-004, FR-012–014, SC-001, SC-012  
**Architecture:** §12–14, §27.3, §33

### E2: Spec-Driven Rendering and Runtime Theming (16h)

**Objective:** Prove the highest-risk technical capability: safely compose every screen through one renderer and apply one runtime token source.

**Increment:** A - Walking Skeleton  
**Priority:** P0  
**PRD:** FR-010–023, FR-030–033, SC-001, SC-002  
**Architecture:** §14–15, §21, §24–27, ADR-002, ADR-008

#### US-2.1: Implement the allowlisted component registry (4h)

As the composer, I need an immutable registry of reusable primitives so that UXSpec nodes resolve safely without arbitrary imports or executable content.

**Classification:** P0 | Mandatory | A - Walking Skeleton | Area: Renderer

**Acceptance criteria**

- [ ] Approximately 12 to 15 component types cover layout, forms, navigation, data display, feedback, and chart placeholders.
- [ ] Every registry entry owns a prop validator and declares whether it accepts children.
- [ ] Unknown types and invalid props return accessible fallbacks.
- [ ] Registry components consume render context and scoped tokens without importing governance state.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-2.1.1 | Define registry contracts and core layout, content and form primitives | 2 | A typed immutable registry with the foundational reusable component set. |
| T-2.1.2 | Add navigation, data, feedback and chart primitives with fallbacks | 2 | The complete capped registry required by all five seed screens. |

**Depends on:** US-1.3

**PRD:** FR-011, FR-012, FR-015, SC-001  
**Architecture:** §14.2, §14.5–14.6, §24, §26

#### US-2.2: Implement recursive composition and safe actions (4h)

As a reviewer, I need every selected screen recursively composed from UXSpec data so that the POC proves a single rendering path rather than hard-coded pages.

**Classification:** P0 | Mandatory | A - Walking Skeleton | Area: Renderer

**Acceptance criteria**

- [ ] The composer recursively renders nested children through registry lookup.
- [ ] A depth guard, node boundary, invalid-prop placeholder, and unknown-type placeholder isolate failures.
- [ ] Only declarative allowlisted actions such as navigate, open dialog, submit demo form, and no-op are supported.
- [ ] All five screens render without page-specific branches.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-2.2.1 | Build recursive composer, render context and node isolation | 2 | A safe recursive screen renderer with bounded failure scope. |
| T-2.2.2 | Implement declarative action resolver and renderer tests | 2 | Controlled screen interactions with verified renderer invariants. |

**Depends on:** US-2.1

**PRD:** FR-010, FR-013–015, FR-032, SC-001, SC-010  
**Architecture:** §14.1–14.5, §24, §27.1

#### US-2.3: Apply safe runtime design tokens (3h)

As a design reviewer, I need specification tokens to reskin the preview instantly so that visual consistency can be evaluated across every screen.

**Classification:** P0 | Mandatory | A - Walking Skeleton | Area: Theming

**Acceptance criteria**

- [ ] Semantic color, typography, spacing, radius, and layout tokens map to --uxds-* CSS variables.
- [ ] Token values are allowlisted and validated before assignment.
- [ ] Tokens are scoped to the preview root and never restyle the studio shell.
- [ ] A preview token override updates the active screen without page reload or source mutation.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-2.3.1 | Implement semantic token validation and CSS variable mapper | 1.5 | A safe deterministic token-to-variable boundary. |
| T-2.3.2 | Apply scoped theme and live preview overrides | 1.5 | One effective token source visibly updates all registered components. |

**Depends on:** US-2.2

**PRD:** FR-020–023, SC-002  
**Architecture:** §15, §26, ADR-008

#### US-2.4: Render five screens with generated navigation (5h)

As a Product Owner, I need to move through all five rendered AgentPilot screens so that complete product flow can be evaluated before Agile planning.

**Classification:** P0 | Mandatory | A - Walking Skeleton | Area: Renderer

**Acceptance criteria**

- [ ] Dashboard, Task Detail, Workflow Templates, Reports Export, and Login render through the same composer.
- [ ] Desktop navigation uses the seeded sidebar model and mobile uses the compact model.
- [ ] Valid generated navigation changes the /review/:screenId route and identifies the active destination.
- [ ] Screen switching feels immediate and does not reload the application.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-2.4.1 | Complete screen composition fidelity and responsive node rules | 2.5 | All five wireframes render with intentional structure, content, states and reusable primitives. |
| T-2.4.2 | Integrate generated navigation, routing and rendering gate tests | 2.5 | A complete navigable walking skeleton and evidence for Hard Gate 2. |

**Depends on:** US-2.3

**PRD:** FR-004, FR-013, FR-030–033, SC-001, SC-003  
**Architecture:** §10, §14, §21, §27

### E3: Review Workbench and Contextual Lenses (6h)

**Objective:** Turn the renderer into a review experience with overview, persona, responsive, and optional journey context.

**Increment:** A - Walking Skeleton  
**Priority:** P1  
**PRD:** FR-001–004, FR-040–053, FR-034, SC-003  
**Architecture:** §10, §21–24, §32

#### US-3.1: Deliver specification overview and review workbench (2h)

As a Product Owner, I need a summary and screen review workspace so that I can understand the UXSpec and enter any screen's decision flow.

**Classification:** P1 | Mandatory | A - Walking Skeleton | Area: Workbench

**Acceptance criteria**

- [ ] Overview displays three personas, three journeys, five screens, component count, design-system summary, and approval progress placeholder.
- [ ] Every screen card exposes its current review status and opens the review route.
- [ ] Workbench separates screen navigation, preview canvas, lens controls, and decision panel.
- [ ] Loading, empty, partial, and route error states preserve the application shell.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-3.1.1 | Build UXSpec overview and screen status entry points | 1 | A concise project-level summary with direct screen access. |
| T-3.1.2 | Build screen review workbench layout and shell states | 1 | A stable workspace around the renderer. |

**Depends on:** US-2.4

**PRD:** FR-001–004, FR-015, US-1.1, US-1.2  
**Architecture:** §7, §10–11, §24

#### US-3.2: Add persona review lens (2h)

As a stakeholder, I need to review a screen as Alex, Jordan, or Taylor so that goals, frustrations, and journey touchpoints inform the decision.

**Classification:** P1 | Mandatory | B - Governance and Release | Area: Workbench

**Acceptance criteria**

- [ ] Alex, Jordan, and Taylor can be selected.
- [ ] Current-screen goals, frustrations, and touchpoints are derived from UXSpec.
- [ ] Annotations appear in a side panel or separate layer and do not mutate component props.
- [ ] The underlying preview remains pointer and keyboard accessible.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-3.2.1 | Implement persona selectors and current-screen context resolution | 1 | Deterministic persona context derived from the immutable specification. |
| T-3.2.2 | Build accessible persona lens presentation | 1 | A review annotation layer distinct from the product wireframe. |

**Depends on:** US-3.1

**PRD:** FR-040–042, SC-003  
**Architecture:** §22, §23

#### US-3.3: Add responsive preview and optional journey walkthrough (2h)

As a design reviewer, I need mobile, tablet, and desktop simulation, with an optional guided journey, so that layout and flow can be evaluated without page reload.

**Classification:** P2 | Cut 1 | B - Governance and Release | Area: Workbench

**Acceptance criteria**

- [ ] Mobile, tablet, and desktop widths update the preview frame and render context.
- [ ] Mobile stacks and larger breakpoints use seeded multi-column rules.
- [ ] One guided journey can move forward and backward through related screens while in scope.
- [ ] Journey is Cut 1 and tablet is Cut 4, each removable without changing the renderer.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-3.3.1 | Implement breakpoint preview context and recomposition | 1.25 | Responsive screen review across the required device modes. |
| T-3.3.2 | Implement isolated guided journey module and feature flags | 0.75 | A delete-safe optional walkthrough controlled by the cut-line configuration. |

**Depends on:** US-3.1

**PRD:** FR-034, FR-050–053, SC-003, BR-010  
**Architecture:** §21, §28, §32

### E4: Screen-Level Governance, Roles and Audit (8h)

**Objective:** Deliver version-bound approvals, structured revisions, append-only audit truth, browser recovery, and mocked role enforcement.

**Increment:** B - Governance and Release  
**Priority:** P0  
**PRD:** FR-070–083, FR-100–112, SC-004, SC-005, SC-007–009  
**Architecture:** §12.6–12.7, §16–18, §20, §27, ADR-004–006

#### US-4.1: Implement event-driven governance domain (2h)

As the application, I need pure commands, events, reducer transitions, and selectors so that visible status and audit evidence cannot diverge.

**Classification:** P0 | Mandatory | B - Governance and Release | Area: Governance

**Acceptance criteria**

- [ ] Approval, revision-request, regeneration-started, regenerated, and regeneration-failed events share stable baseline and version metadata.
- [ ] Reducer operations are pure, deterministic, immutable, and reject duplicate event IDs.
- [ ] Status, current screen version, progress, and gate completion are derived through selectors.
- [ ] Clock and ID generation are injected outside the reducer.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-4.1.1 | Define governance commands, events, policies and reducer | 1 | A stable append-only governance contract independent of React and browser APIs. |
| T-4.1.2 | Implement current-version status and gate selectors with unit tests | 1 | One derivation path for review status, progress and gate truth. |

**Depends on:** US-2.4

**PRD:** FR-070, FR-074–075, FR-101–103, BR-001–003, BR-007  
**Architecture:** §12.6–12.7, §16, §27.1, ADR-004

#### US-4.2: Approve current screen versions and complete the UX gate (2h)

As an Approver, I need to approve one current screen version independently so that accepted work remains traceable and the gate completes only at the correct time.

**Classification:** P0 | Mandatory | B - Governance and Release | Area: Governance

**Acceptance criteria**

- [ ] Approval applies only to the active screen and version.
- [ ] Actor, action, screen, spec, baseline, version, timestamp, and optional comment are recorded.
- [ ] Overview and workbench update immediately without affecting other screens.
- [ ] The final approval displays readiness for Agile plan generation.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-4.2.1 | Implement approve-screen use case and decision UI | 1 | A validated application command and accessible approval interaction. |
| T-4.2.2 | Integrate progress and final gate-completion presentation | 1 | Consistent screen and project-level approval feedback. |

**Depends on:** US-4.1

**PRD:** FR-070–075, US-4.1, US-4.5, SC-004, SC-009  
**Architecture:** §16.3–16.5, §20

#### US-4.3: Request structured revisions with role enforcement (2h)

As an Approver, I need to submit component-specific revision evidence, while Reviewer and Viewer remain read-only, so that feedback is actionable and the permission model is demonstrable.

**Classification:** P0 | Mandatory | B - Governance and Release | Area: Governance

**Acceptance criteria**

- [ ] Revision form captures affected node IDs, category, and required description.
- [ ] The request references active screen, screen version, spec version, baseline, actor, and timestamp.
- [ ] Approver can approve, revise, and regenerate; Reviewer and Viewer cannot invoke those commands.
- [ ] The role switcher is explicitly identified as a POC demonstration mechanism.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-4.3.1 | Build revision form, validation and request use case | 1 | Structured screen-level feedback recorded as a governance event. |
| T-4.3.2 | Implement role capabilities and dual-layer enforcement | 1 | Mocked role behavior enforced in both UI and application commands. |

**Depends on:** US-4.2

**PRD:** FR-080–083, FR-110–112, BR-006, SC-005  
**Architecture:** §16.3, §18, §20

#### US-4.4: Persist governance state and expose the audit log (2h)

As a reviewer, I need governance history to survive reload and remain inspectable chronologically so that the POC demonstrates traceable decisions against the frozen baseline.

**Classification:** P0 | Mandatory | B - Governance and Release | Area: Persistence

**Acceptance criteria**

- [ ] A versioned localStorage repository persists only governance events and screen versions.
- [ ] Stored data is validated against project, spec, and baseline before rehydration.
- [ ] Corrupted or unavailable storage degrades to clean in-memory state with a visible notice.
- [ ] Audit view lists events chronologically and supports per-screen inspection and reset-demo-state.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-4.4.1 | Implement versioned localStorage repository and recovery path | 1 | Validated, bounded browser persistence isolated behind a port. |
| T-4.4.2 | Build chronological audit view, filters and reset action | 1 | Persistent governance evidence suitable for the demo flow. |

**Depends on:** US-4.3

**PRD:** FR-100–105, NFR 16.3, SC-007–008  
**Architecture:** §17, §24, §27.3, ADR-006

### E5: Mock Regeneration and Review Hardening (6h)

**Objective:** Demonstrate replaceable AI regeneration, version invalidation, accessibility evidence, studio states, and InsaneSDD-aligned polish.

**Increment:** B - Governance and Release  
**Priority:** P1  
**PRD:** FR-060–062, FR-090–095, SC-006, SC-010  
**Architecture:** §19, §23–26, §32, ADR-007

#### US-5.1: Regenerate one screen through the provider boundary (2.5h)

As an Approver, I need a structured revision to produce a deterministic new screen version through DesignAgentProvider so that future AI replacement is proven without external service risk.

**Classification:** P0 | Mandatory | B - Governance and Release | Area: Provider

**Acceptance criteria**

- [ ] The UI depends only on DesignAgentProvider, not the mock implementation.
- [ ] Mock provider returns a deterministic pre-authored variant after visible simulated latency.
- [ ] Provider result passes the same runtime screen validation before activation.
- [ ] Regeneration can be cancelled, can show one controlled failure, and never requires a real LLM.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-5.1.1 | Define provider port and deterministic mock adapter | 1.25 | A transport-agnostic regeneration boundary with pre-authored variants. |
| T-5.1.2 | Implement regeneration use case, loading, validation and failure flow | 1.25 | A complete safe mocked regeneration sequence. |

**Depends on:** US-4.4

**PRD:** FR-090–095, SC-006  
**Architecture:** §19, §24, ADR-007

#### US-5.2: Enforce reapproval and finish accessibility and studio states (3.5h)

As a reviewer, I need regenerated output to require fresh approval and the studio to communicate accessibility, loading, empty, error, and partial states clearly so that the demo is trustworthy.

**Classification:** P1 | Cut 2 | B - Governance and Release | Area: Accessibility

**Acceptance criteria**

- [ ] Regeneration creates a new current version and any prior-version approval does not approve it.
- [ ] A minimal prior/current version comparison remains while version-history UI is in scope.
- [ ] Accessibility overlay presents seeded contrast, ARIA, screen-reader, and keyboard notes; contrast badges remain if the overlay is cut.
- [ ] Studio controls meet the primary WCAG 2.1 AA keyboard, focus, naming, live-region, and reduced-motion expectations.
- [ ] Visual treatment aligns with the demonstrated light chrome, red accent, and sidebar language without claiming pixel-perfect fidelity.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-5.2.1 | Implement version activation, reapproval rule and optional history panel | 1.5 | Correct version-bound governance and evidence for Hard Gate 4. |
| T-5.2.2 | Implement accessibility evidence, resilient states and visual polish | 2 | A presentable, keyboard-usable and failure-aware review experience. |

**Depends on:** US-5.1

**PRD:** FR-015, FR-060–062, FR-093–094, NFR 16.1–16.3, SC-010  
**Architecture:** §12.7, §23–26, §32

### E6: Quality, Documentation, Deployment and Demonstration (8h)

**Objective:** Produce verifiable engineering evidence, reproducible delivery, static deployment, release traceability, and a rehearsed interview workflow.

**Increment:** B - Governance and Release  
**Priority:** P0  
**PRD:** NFR 16.1–16.6, SC-010–012, Release acceptance checklist  
**Architecture:** §27–30, §35–38

#### US-6.1: Automate critical quality gates and CI (4h)

As an engineering lead, I need targeted automated evidence so that renderer safety, governance correctness, persistence, provider contracts, and the production build are continuously verified.

**Classification:** P0 | Mandatory | B - Governance and Release | Area: Quality

**Acceptance criteria**

- [ ] Renderer unit tests cover known, nested, unknown, invalid, depth-guard, and declarative-action cases.
- [ ] Governance tests cover independence, duplicate events, revision invalidation, regeneration, reapproval, gate completion, role rejection, and chronology.
- [ ] Contract tests validate seed, registry coverage, provider output, and persistence round trips.
- [ ] One critical RTL integration flow covers overview to review, revision, regeneration, approval, reload, and role restriction.
- [ ] CI runs install, lint, type-check, tests, and production build for pull requests targeting staging and main.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-6.1.1 | Complete unit, contract and critical integration test suite | 2.5 | Focused regression evidence for the core technical and product proof. |
| T-6.1.2 | Configure minimal GitHub Actions quality pipeline | 1.5 | Repeatable checks for staging and release pull requests. |

**Depends on:** US-5.2

**PRD:** NFR 16.5–16.6, SC-010–011  
**Architecture:** §27, §28

#### US-6.2: Document, deploy, rehearse and release the POC (4h)

As an evaluator, I need a deployed, explainable and correctly positioned artifact so that product judgment and Lead Frontend engineering can be reviewed end to end.

**Classification:** P0 | Mandatory | B - Governance and Release | Area: Deployment

**Acceptance criteria**

- [ ] README explains setup, architecture, demo reset, scope, exclusions, concept-extension positioning, and production path.
- [ ] ADR records accepted architecture decisions and explicitly excludes real AI, backend, auth, and Module Federation.
- [ ] Static deployment works through direct and deep-linked routes without secrets or external services.
- [ ] The complete demo flow is rehearsed, timed, and validated against release acceptance.
- [ ] All feature work merges to staging by squash PR; final staging to main release PR is tagged v0.1.0-poc.

**Engineering tasks**

| Key | Task | Hours | Outcome |
|---|---|---:|---|
| T-6.2.1 | Complete README, ADR, traceability and deployment configuration | 2 | A self-contained repository and static preview suitable for interview review. |
| T-6.2.2 | Run release acceptance, demo rehearsal and staging-to-main release | 2 | A stable presentation build and controlled v0.1.0-poc release. |

**Depends on:** US-6.1

**PRD:** SC-010–012, Release acceptance checklist, BR-009–010  
**Architecture:** §28, §34–39

## 10. Dependency and execution order

```text
E1 Foundation and contracts
  -> E2 Renderer and theming
      -> E3 Workbench and review lenses
      -> E4 Governance and audit
          -> E5 Regeneration and hardening
              -> E6 Quality, deployment and release
```

Risk order overrides visual appeal. Complete and verify the renderer before optional lenses, and complete version-bound governance before presentation polish.

## 11. Verification strategy

| Boundary | Required evidence |
|---|---|
| UXSpec | Seed, provider output, persisted envelope and cross-reference contract tests |
| Renderer | Known, nested, invalid, unknown, depth and action tests |
| Governance | Version-bound approval, independence, revision invalidation, gate and chronology tests |
| Persistence | Valid round trip, corrupt state, baseline mismatch and unavailable storage |
| Integration | Overview to review, revision, regeneration, approval, reload and role restriction |
| Accessibility | Keyboard path, focus management, names, announcements and reduced motion |
| Release | Lint, type-check, tests, production build, direct route refresh and complete demo |

## 12. GitHub Project design

The importer creates:

- A private personal Project named `UX Design Studio POC`
- A board view named `Delivery Board`
- A table view named `Backlog Table`
- Status, Work Type, Scope, Increment, Priority, Area, Estimate Hours, PRD References, Architecture References, and Plan Key fields
- Repository labels, the `v0.1.0 POC` milestone, 6 epic issues, 18 story sub-issues, and 36 task sub-issues
- Story and task dependency relationships
- The `staging` branch from `main`

## 13. Import conflict policy

- Stable markers, not issue numbers or titles, identify managed items.
- Re-running updates managed metadata instead of creating duplicates.
- The importer is sequential and uses a local lock file to block concurrent runs.
- It never deletes issues, comments, unrelated labels, unrelated project items, or existing branches.
- A same-name Project without the managed marker causes a preflight stop before issue creation.
- An unmanaged issue with an exact planned title causes a preflight stop instead of being overwritten.
- Existing item status is preserved on re-run; only new project items begin in Backlog.
- Existing `staging` must point to a history compatible with `main`; otherwise the importer stops rather than forcing it.

## 14. Release acceptance

- All five screens render through the common composer.
- Runtime tokens visibly apply across screens.
- Persona and mobile/desktop review work.
- Per-screen, per-version approval and structured revision work.
- Mock regeneration produces a validated version requiring reapproval.
- Audit events survive reload and remain baseline-linked.
- Role restrictions work at UI and command layers.
- Critical tests and production build pass.
- README, ADR, exclusions, deployment and demo reset instructions are present.
- Total recorded plan estimate remains 50 hours.
- Final release is merged from `staging` to `main` and tagged `v0.1.0-poc`.
