# UX Design Studio — Source of Truth v1.2 Addendum

**Status:** Approved product override  
**Effective date:** July 17, 2026  
**Supersedes:** Source of Truth v1.0 and v1.1 only where explicitly stated below

## Decision

Authorize a post-release **E8 Federated Host Integration** demonstration that:

- Converts the repository into a pnpm monorepo.
- Preserves the independently runnable UX Design Studio standalone SPA.
- Exposes UX Design Studio as a route-level Module Federation remote.
- Consumes that remote through a **simulated** InsaneSDD host shell.

This is a production-oriented integration demonstration after `v0.1.0-poc`. It does
not rewrite the frozen 50-hour POC scope, the `v0.1.0-poc` release evidence, or
ADR-001’s historical correctness for that release.

## What changes

- Runtime Module Federation is permitted **only** under approved E8 stories.
- The approved federation dependency is `@module-federation/vite`.
- React, React DOM, and React Router DOM must be shared as singletons between
  host and remote at aligned versions.
- The host must remain visibly documented as simulated; actor identity remains
  synthetic and must not be presented as SSO, OIDC, or production RBAC.
- The remote continues to own AgentPilot UXSpec validation; the shared host
  contract carries project/baseline/actor identity and callbacks, not the full
  UXSpec document.
- Final gate completion may navigate the host to an Agile Editor placeholder via
  callback; no real Agile plan generation is authorized.

## Unchanged requirements

- Spec-driven rendering, runtime theming, per-screen approval, append-only audit,
  AgentPilot seed fidelity, and version-bound approval remain mandatory.
- No real LLM, production backend, production authentication, or production
  InsaneSDD host implementation is authorized.
- Demo-state reset still must not call `localStorage.clear()`.
- Source of Truth v1.1 fixed Demo Approver product composition remains in force
  unless a later addendum changes it; the host may inject the same synthetic
  Demo Approver through the integration contract.

## Product acceptance

- Standalone UX Design Studio remains independently runnable.
- Federated mode loads under `/projects/:projectId/ux-design-studio/*`.
- Remote failure must not crash the host shell.
- Historical POC records and the frozen 50-hour import plan remain unchanged.

All other Source of Truth v1.0 and v1.1 requirements remain in force where not
explicitly overridden above.
