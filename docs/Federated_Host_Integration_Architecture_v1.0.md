# Federated Host Integration Architecture v1.0

**Status:** Approved for E8 post-release demonstration  
**Depends on:** Technical Architecture v1.0, ADR-001 (historical), ADR-009  
**Scope:** Route-level Module Federation with a simulated InsaneSDD host

## 1. Purpose

Define the post-release architecture for packing UX Design Studio as a route-level
Module Federation remote and consuming it from a simulated host, without
invalidating the released standalone POC.

## 2. Execution modes

### Standalone

```text
BrowserRouter
  -> UX Design Studio
  -> /overview | /review/:screenId | /audit
```

### Federated

```text
Simulated InsaneSDD host BrowserRouter
  -> /projects/:projectId/ux-design-studio/*
  -> loads uxDesignStudio/App from remoteEntry.js
  -> remote owns relative overview, review/:screenId, audit
  -> onNavigateToAgileEditor -> /projects/:projectId/agile-editor
```

## 3. Workspace layout

```text
apps/ux-design-studio   # @uxds/studio — standalone + remote producer
apps/insanesdd-host     # @uxds/host — simulated consumer
packages/uxds-host-contract  # @uxds/host-contract — versioned props/schemas
```

Repository-owned tooling (`scripts/`, `docs/`, `.agents/`, `.github/`, root
Playwright) remains at the monorepo root.

## 4. Host contract

Public props (runtime-validated identity fields):

- `projectId`, `baselineVersion`, `basePath`
- `actor: { id, displayLabel, role }`
- `onGateStatusChange?: (status) => void`
- `onNavigateToAgileEditor?: (context) => void`

Rules:

- Do not place the full UXSpec in the shared package.
- Remote owns and validates AgentPilot UXSpec.
- Reject unsupported project identities rather than silently remapping seed data.
- Callbacks are TypeScript-validated function props, never serialized JSON.
- Gate status derives only from existing governance selectors.

Gate event semantics:

- Emit current status after hydration.
- Emit again only on status change.
- Do not navigate on mount when persisted state is already approved.
- Navigate once per user-driven `in_review` → `approved` transition.

## 5. Router ownership

- Host owns `BrowserRouter` and project shell routes.
- Remote never creates a second `BrowserRouter`.
- Remote route definitions and links are relative.
- Standalone mode retains root absolute URLs via its own outer router.

## 6. Shared dependencies

Singleton shared:

- `react` / `react-dom` 18.3.1
- `react-router-dom` 6.30.1 (and `react-router` if required by the plugin)

Federation surface:

- Producer name: `uxDesignStudio`
- Filename: `remoteEntry.js`
- Expose: `./App` → remote mount component

## 7. Style isolation

- Standalone-only global styles import from standalone `main.tsx` only.
- Embedded styles scope under `.uxdsRemoteRoot`.
- Remote must not restyle host `body`, `:root`, anchors, or focus globally.
- `--uxds-*` remains preview-root scoped; `--studio-*` remains remote-root scoped.

## 8. Host shell

Simulated project shell:

- Persistent left navigation matching the approved screenshot menu order.
- No InsaneSDD brand header.
- Discreet “Simulated integration host” labeling.
- Accessible loading and remote-failure fallbacks.
- Host remains usable when the remote fails.

## 9. Deployment topology

Independent deployables:

- Remote: exposes `remoteEntry.js`
- Host: configured with `VITE_UXDS_REMOTE_ENTRY`
- Standalone studio URL remains available

## 10. Explicit exclusions

- Real InsaneSDD host implementation
- Production SSO / OIDC / RBAC claims
- Real LLM, backend, or Agile plan generation
- Multi-project product support beyond rejecting unsupported IDs
- Treating workspace path imports as Module Federation proof
