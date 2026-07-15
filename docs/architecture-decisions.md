# Architecture Decision Records

**Product positioning:** UX Design Studio is a proof-of-work concept extension for InsaneSDD 2.0 that deepens UX review into a visual, per-screen approval workbench.

It is **not** an official InfoBeans product or feature. This POC is not production-ready, does not implement real authentication, does not call a real LLM, does not generate Agile plans, and must never be described as proof that InsaneSDD lacks a capability.

## Document purpose

This file consolidates ADR-001 through ADR-008 from `docs/UX_Design_Studio_Technical_Architecture_v1.0.md` §34 into a dedicated release artifact for interview and release review.

## Status convention

| Status | Meaning |
|---|---|
| Accepted | Decision is binding for the v0.1.0-poc release |
| Documented only | Production evolution path recorded; **not implemented** in this POC |

All eight ADRs below are **Accepted** for the POC. Production evolution items are **Documented only**.

## Authority and relationship to architecture v1.0

- **Authority:** Subordinate to `docs/UX_Design_Studio_Technical_Architecture_v1.0.md` (Technical Architecture v1.0).
- This artifact **does not invent** new architecture. It restates Accepted decisions with implementation and test evidence paths.
- Controlling document order remains Source of Truth → PRD → Architecture → Development Plan → approved GitHub stories.
- If this file and Architecture v1.0 conflict, Architecture v1.0 wins.

---

## ADR-001: Standalone SPA with MFE-ready boundary

**Status:** Accepted

### Context

The InsaneSDD host build tool, React version, routing model, authentication contract, and deployment pipeline are unknown. Runtime Module Federation would add shared-dependency and host-version risk without proving the product hypothesis inside the 50-hour cap.

### Decision

Build a standalone SPA. Document and optionally expose a mount contract. Do not add Module Federation.

### Rationale

Delivers the product hypothesis within schedule and avoids unknown host coupling. A standalone URL is easier for interview evaluation.

### Consequences

Production integration requires a later packaging decision after host inspection. The POC ships as a static Vite SPA (`dist/`) with SPA deep-link fallback.

### Explicit exclusions

- Runtime Module Federation
- Route-level MFE remote packaging
- Host cookie, storage, or DOM access outside the app boundary
- Production host authentication wiring

### Production evolution path (documented only)

- Mount API or route-level remote after host inspection (Architecture §9, §29)
- OIDC/SSO and server-enforced RBAC at the host/API boundary
- Do **not** implement route-level MFE integration in this POC

### Implementation evidence

- `src/main.tsx` — SPA bootstrap
- `src/app/App.tsx` — application root
- `src/app/routes.tsx` — client routes (`/overview`, `/review/:screenId`, `/audit`)
- `src/app/error-boundary.tsx` — shell-preserving error boundaries
- `vercel.json` — static Vite build and SPA rewrite (no serverless functions)

Note: Architecture §9 documents a future `mountUxDesignStudio` contract. A `src/integration/` mount package is **not** required for the POC and is not present in this release.

### Test evidence

- `src/app/routes.test.tsx`
- `e2e/epic5-release-smoke.spec.ts` (direct routes against production preview)

---

## ADR-002: Spec-driven renderer with allowlisted registry

**Status:** Accepted

### Context

AgentPilot screens must render from UXSpec data without hard-coded page architectures. AI-shaped trees are untrusted and must fail safely.

### Decision

Render all screens through a recursive composer and fixed allowlisted registry (approximately 12–15 primitives).

### Rationale

Demonstrates the required architecture and safely handles untrusted structure. One common path covers all five seeded screens.

### Consequences

Unsupported node types and invalid props render placeholders without crashing the full screen. Component-tree depth is bounded.

### Explicit exclusions

- Hard-coded page-specific React screens as the primary model
- Arbitrary React component execution
- `eval`, `dangerouslySetInnerHTML`, runtime-generated JavaScript, model-generated event handlers
- Dynamic imports driven by UXSpec data

### Production evolution path (documented only)

Expand the allowlist deliberately; keep validation and depth guards. Do not open arbitrary component execution.

### Implementation evidence

- `src/renderer/registry/create-registry.ts`
- `src/renderer/registry/prop-schemas.ts`
- `src/renderer/composer/RecursiveComposer.tsx`
- `src/renderer/composer/ScreenComposer.tsx`
- `src/renderer/actions/create-action-resolver.ts`
- `src/renderer/fallbacks/UnknownComponent.tsx`
- `src/renderer/fallbacks/InvalidPropsFallback.tsx`
- `src/renderer/composer/DepthGuardFallback.tsx`
- `src/features/review/ReviewWorkbench.tsx`

### Test evidence

- `src/renderer/registry/registry.test.tsx`
- `src/renderer/composer/composer.test.tsx`
- `src/features/review/review.test.tsx`
- `src/infrastructure/seed/agentpilot-seed.test.ts`

---

## ADR-003: Runtime schema validation

**Status:** Accepted

### Context

TypeScript does not validate JSON seed data, provider output, or browser storage envelopes at runtime.

### Decision

Validate UXSpec, provider output, and persisted governance envelopes at runtime (Zod schemas at the application boundary). Normalize once; keep the validated source UXSpec immutable.

### Rationale

Untrusted structured data must fail closed with explicit recovery rather than silently corrupting the demo.

### Consequences

Adds a schema dependency (`zod`) and explicit loading/error/recovery states. Invalid provider output never activates as current content.

### Explicit exclusions

- Trusting TypeScript compile-time types as runtime guarantees
- Mutating frozen seed UXSpec to store governance or regenerated content
- Accepting executable content from validated trees

### Production evolution path (documented only)

Keep shared validation at API and client boundaries; server remains authority for accepted writes (Architecture §29).

### Implementation evidence

- `src/domain/ux-spec/schemas.ts`
- `src/domain/ux-spec/normalize.ts`
- `src/domain/ux-spec/load-ux-spec.ts`
- `src/domain/governance/schemas.ts`
- `src/infrastructure/persistence/persisted-governance-envelope.ts`
- `src/infrastructure/providers/mock-design-agent-provider.ts`

### Test evidence

- `src/domain/ux-spec/load-ux-spec.test.ts`
- `src/infrastructure/seed/agentpilot-seed.test.ts`
- `src/infrastructure/persistence/local-storage-governance-repository.test.ts`
- `src/infrastructure/providers/mock-design-agent-provider.test.ts`
- `src/ports/design-agent-provider.test.ts`

---

## ADR-004: Immutable source plus event-driven governance

**Status:** Accepted

### Context

Approval, revision, and regeneration must remain auditable and version-bound. Storing status inside UXSpec would diverge UI state from audit history.

### Decision

Keep UXSpec immutable and append governance events. Derive visible review status and audit history through selectors from the same event source.

### Rationale

Prevents audit/UI divergence and preserves baseline and screen-version traceability. Approvals bind to the current screen version only.

### Consequences

Selectors are more important than a mutable status map. Regeneration creates a new current version; prior approvals do not carry forward. Revision invalidates effective approval for that version.

### Explicit exclusions

- Mutable second status source of truth
- Approving stale screen versions
- Storing approval/revision/regeneration state inside UXSpec
- Real Agile plan generation (gate readiness is a POC signal only)

### Production evolution path (documented only)

- Durable append-only event storage
- Signed or integrity-protected audit events
- Retention and legal-hold policies
- Server authority for event ordering and gate completion

None of the above are implemented in this POC.

### Implementation evidence

- `src/domain/governance/events.ts`
- `src/domain/governance/governance-reducer.ts`
- `src/domain/governance/selectors.ts`
- `src/domain/governance/policies.ts`
- `src/application/approve-screen.ts`
- `src/application/request-revision.ts`
- `src/application/regenerate-screen.ts`
- `src/features/governance/DecisionPanel.tsx`
- `src/features/audit/AuditPage.tsx`

### Test evidence

- `src/domain/governance/governance.test.ts`
- `src/application/approve-screen.test.ts`
- `src/application/request-revision.test.ts`
- `src/application/regenerate-screen.test.ts`
- `src/features/governance/approval.test.tsx`
- `src/app/critical-demo-flow.integration.test.tsx`

---

## ADR-005: Pure reducer with Context wiring

**Status:** Accepted

### Context

The POC needs testable governance transitions without a third-party global store.

### Decision

Use a pure governance reducer and React Context wiring rather than Redux or similar.

### Rationale

Fits POC scale, meets unit-test requirements, and minimizes dependencies. Domain stays free of React.

### Consequences

Production may replace the React wiring; domain events and selectors remain reusable. Clock and ID generation are injected outside the reducer.

### Explicit exclusions

- Domain imports of React, routing, or browser APIs
- Global application stores outside the governance provider boundary
- Production RBAC frameworks

### Production evolution path (documented only)

Replace Context adapters with host-provided session/command ports while retaining the pure reducer and selectors. Server-enforced RBAC remains out of POC scope.

### Implementation evidence

- `src/domain/governance/governance-reducer.ts`
- `src/features/governance/GovernanceProvider.tsx`
- `src/features/governance/governance-context.ts`
- `src/infrastructure/platform/system-clock.ts`
- `src/infrastructure/platform/browser-id-generator.ts`
- `src/app/providers.tsx`

### Test evidence

- `src/domain/governance/governance.test.ts`
- `src/features/governance/approval.test.tsx`
- `src/features/governance/revision-roles.test.tsx`
- `src/features/governance/regenerate.test.tsx`

---

## ADR-006: localStorage behind a repository port

**Status:** Accepted

### Context

The POC needs reload persistence for governance events without coupling domain logic to browser APIs or introducing a backend.

### Decision

Use `localStorage` only through a versioned persistence adapter behind `GovernanceRepository`. Demo reset removes only the managed AgentPilot key.

### Rationale

Meets POC persistence needs, validates envelopes at the boundary, and recovers from corruption without wiping unrelated browser storage.

### Consequences

Persistence is single-browser and non-secure by design. Not suitable for regulated audit retention.

Managed key:

```text
uxds:v1:project-agentpilot:spec-agentpilot:1.0.0
```

### Explicit exclusions

- Durable server-side event storage
- Signed audit events
- Retention / legal hold
- Calling `localStorage.clear()` for demo reset
- Multi-browser collaborative persistence
- Production credentials or customer data in storage

### Production evolution path (documented only)

Replace the adapter with API-backed repositories; keep the port. Add durable append-only storage, signing, and retention controls server-side.

### Implementation evidence

- `src/ports/governance-repository.ts`
- `src/infrastructure/persistence/local-storage-governance-repository.ts`
- `src/infrastructure/persistence/governance-storage-key.ts`
- `src/infrastructure/persistence/persisted-governance-envelope.ts`
- `src/features/audit/ResetDemoStateControl.tsx`

### Test evidence

- `src/infrastructure/persistence/local-storage-governance-repository.test.ts`
- `src/features/audit/audit.test.tsx`
- `e2e/epic5-release-smoke.spec.ts` (managed-key reset path)

---

## ADR-007: AI provider port with deterministic mock

**Status:** Accepted

### Context

Regeneration must prove a replaceable provider boundary without external service risk, secrets, or real LLM evaluation.

### Decision

Isolate regeneration behind `DesignAgentProvider` and ship only a deterministic mock adapter. Dashboard is the regeneration target in this POC.

### Rationale

Proves replaceability and version-bound reapproval without evaluating AI quality or requiring network access.

### Consequences

AI quality is not evaluated by the POC. Provider output is runtime-validated before activation. Controlled failure retains the prior current version.

### Explicit exclusions

- Real Design Agent API / LLM network calls
- Provider secrets in the repository or runtime
- Mutating frozen seed UXSpec with regenerated trees
- Claiming the mock evaluates production AI quality

### Production evolution path (documented only)

Swap the mock for a real Design Agent API adapter behind the same port; keep validation, cancellation, stale-completion rejection, and version uniqueness rules (Architecture §29).

### Implementation evidence

- `src/ports/design-agent-provider.ts`
- `src/infrastructure/providers/mock-design-agent-provider.ts`
- `src/application/regenerate-screen.ts`
- `src/infrastructure/seed/agentpilot-variants.ts`
- `src/app/config.ts` (`REGENERATION_TARGET_SCREEN_ID`, controlled failure flag)

### Test evidence

- `src/ports/design-agent-provider.test.ts`
- `src/infrastructure/providers/mock-design-agent-provider.test.ts`
- `src/application/regenerate-screen.test.ts`
- `src/features/governance/regenerate.test.tsx`
- `src/app/critical-demo-flow.integration.test.tsx`
- `e2e/epic5-release-smoke.spec.ts`

---

## ADR-008: CSS Modules plus namespaced token variables

**Status:** Accepted

### Context

Runtime design tokens must theme all five screens consistently without leaking styles into a future host.

### Decision

Scope shell and component styles with CSS Modules, and apply allowlisted semantic design tokens as `--uxds-*` custom properties on the preview root.

### Rationale

Supports runtime theming and future host isolation. Token values are validated before application.

### Consequences

Token mapping must remain allowlisted and semantic. Preview-local overrides must not mutate frozen tokens.

### Explicit exclusions

- Arbitrary global CSS mutation from generated tokens
- Unvalidated color/length/URL token injection
- Pixel-perfect production design claims

### Production evolution path (documented only)

Retain namespaced variables and CSS Modules (or equivalent encapsulation) under route-level MFE packaging. Host theme bridging remains a later integration decision.

### Implementation evidence

- `src/renderer/theming/token-mapper.ts`
- `src/renderer/theming/PreviewThemeRoot.tsx`
- `src/renderer/styles/css-class.ts`
- `src/styles/global.css`
- Registry component CSS Modules under `src/renderer/components/`

### Test evidence

- `src/renderer/theming/theming.test.tsx`
- `src/features/review/review.test.tsx`

---

## Production capabilities documented but not implemented

The following appear in Architecture §26 and §29 as production evolution only. They are **out of scope** for v0.1.0-poc:

| Capability | Status |
|---|---|
| OIDC / platform SSO | Documented only |
| Production RBAC | Documented only |
| Server authority for identity, permissions, ordering, and gate completion | Documented only |
| Durable append-only event storage | Documented only |
| Signed / integrity-protected audit events | Documented only |
| Retention / legal-hold policies | Documented only |
| Real Design Agent API | Documented only |
| Live Terminal event publication | Documented only |
| Route-level MFE integration | Documented only |

---

## Related release artifacts

- [`docs/traceability.md`](traceability.md)
- [`docs/release-acceptance.md`](release-acceptance.md)
- [`docs/demo-script.md`](demo-script.md)
- [`README.md`](../README.md)
