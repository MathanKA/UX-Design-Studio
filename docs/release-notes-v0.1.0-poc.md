# UX Design Studio v0.1.0 POC — release notes

## Product problem

InsaneSDD 2.0 uses human-supervised approval gates. Before Agile planning, UX specifications need visual, per-screen review with structured revision and version-bound approval.

## Delivered POC

UX Design Studio is a proof-of-work concept extension for InsaneSDD 2.0 that deepens UX review into a visual, per-screen approval workbench.

It is **not** an official InfoBeans product or feature. It does not claim that InsaneSDD lacks this capability.

## Core architecture

- Spec-driven recursive renderer with allowlisted registry
- Runtime schema validation for UXSpec, provider output, and persistence
- Immutable UXSpec with append-only governance events
- Pure reducer + React Context
- localStorage behind a repository port
- Deterministic mock `DesignAgentProvider`
- CSS Modules with `--uxds-*` token variables

## Review and governance capabilities

- Five AgentPilot screens on one common composition path
- Persona lens, responsive preview, journey walkthrough
- Version-bound approval and project gate readiness
- Structured revision with role enforcement
- Mock regeneration with reapproval rules
- Version history and accessibility evidence overlay
- Append-only audit log with managed-key demo reset

## Quality evidence

- Vitest unit, contract, and critical RTL integration coverage
- Playwright Epic 5 release smoke (local preview and deployed URL)
- GitHub Actions: Quality gate, Playwright E2E, Commit signatures

## Deployment

- Static Vercel SPA: https://ux-design-studio-poc.vercel.app
- Deep links for `/overview`, `/review/*`, `/audit`, and controlled unknown routes
- No application secrets required

## Scope exclusions

- No real LLM, backend, production authentication, or Module Federation
- No multi-project / multi-repository support
- No real Agile plan generation
- No Expona impact-analysis functionality

## Known limitations

- Single-browser demo persistence
- Deterministic mock provider only (AI quality not evaluated)
- Demo roles are POC simulation, not production auth
- Spoken interview rehearsal is a presentation plan; automated technical rehearsal is recorded separately

## Production evolution path

Documented in `docs/architecture-decisions.md` (OIDC/SSO, durable audit storage, real Design Agent API, route-level MFE) — not implemented in this POC.

## Documentation

- [README](../README.md)
- [Architecture decisions](architecture-decisions.md)
- [Traceability](traceability.md)
- [Release acceptance](release-acceptance.md)
- [Demo script](demo-script.md)

## Planned effort

| Epic | Hours |
|---|---:|
| E1–E6 | 6 + 16 + 6 + 8 + 6 + 8 |
| **Total** | **50** |
