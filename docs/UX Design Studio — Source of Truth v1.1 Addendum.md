# UX Design Studio — Source of Truth v1.1 Addendum

**Status:** Approved product override  
**Effective date:** July 17, 2026  
**Supersedes:** Source of Truth v1.0 only where explicitly stated below

## Decision

The POC uses one fixed review actor: **Demo Approver**. The application must not
show a role switcher, role-simulation choices, or the active actor in the studio
chrome or Decision panel.

This replaces the v1.0 statements that the POC includes an
Approver / Reviewer / Viewer role switcher. The fixed actor remains synthetic
and must not be presented as production authentication, SSO, RBAC, or identity
verification.

## Unchanged governance requirements

- Approval, revision, and regeneration events remain attributed to Demo Approver.
- Application commands continue to enforce capability checks before appending
  governance events.
- Reviewer and Viewer fixtures may remain internal for authorization tests, but
  they are not selectable product features.
- UX personas remain separate from governance actors.
- Per-screen approval, version binding, append-only audit history, persistence,
  and gate-completion rules are unchanged.

## Product acceptance

- No role-simulation UI appears in the app shell, review toolbar, or Decision
  panel.
- Demo Approver is the default product actor without being displayed.
- Approve, request-revision, and regeneration workflows remain available under
  the same governance rules.
- Audit events continue to record actor metadata.

All other Source of Truth v1.0 requirements remain in force.
