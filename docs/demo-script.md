# Demo script — AgentPilot interview demonstration

**Product positioning:** UX Design Studio is a proof-of-work concept extension for InsaneSDD 2.0 that deepens UX review into a visual, per-screen approval workbench.

It is **not** an official InfoBeans product or feature. Do not claim production readiness, real authentication, real LLM quality, real Agile plan generation, or that InsaneSDD lacks a capability.

**Format:** 75-second positioning statement, then a 6–8 minute primary live flow. Optional architecture close, failure-recovery route, and Q&A follow.

---

## 1. Setup and prerequisites

- Node.js 22+, pnpm via Corepack (`packageManager`: `pnpm@10.13.1`)
- No application environment variables or secrets
- Prefer the deployed production or preview URL when available; otherwise:

```bash
corepack enable
corepack pnpm install
pnpm run build
pnpm run preview
```

Open `http://127.0.0.1:4173` (or the deployment URL).

- Set **POC demo role** to **Demo Approver** for approval, revision, and regeneration.
- UX personas (Alex, Jordan, Taylor) are review-lens context only — not auth.
- Regeneration target in this POC: **Dashboard** (`screen-dashboard`).

Routes used in the demo:

```text
/overview
/review/screen-dashboard
/audit
```

---

## 2. Clean demo state

1. Open `/audit`.
2. Choose **Reset demo state**.
3. Confirm with **Confirm reset**.

Expected:

- Removes only the managed governance key `uxds:v1:project-agentpilot:spec-agentpilot:1.0.0`
- Does **not** call `localStorage.clear()`
- Does not mutate the frozen AgentPilot UXSpec seed
- Returns governance to the deterministic seed state

Never paste arbitrary JSON into browser storage to “fix” state.

---

## 3. Prepared demo state

Do not add product features only to create a prepared state. Use normal UI controls:

1. Start from clean demo state (section 2).
2. As **Demo Approver**, open each of the four non-Dashboard screens and approve the current version:
   - Login
   - Task Detail
   - Workflow Templates
   - Reports Export
3. Leave **Dashboard** unapproved (or reset only Dashboard’s path by not approving it) so the live flow can show revision → controlled failure → regeneration → reapproval.
4. Confirm Overview shows partial gate progress with Dashboard still outstanding.
5. Optional: reload the browser once to prove persistence of the four approvals via the managed key.

Re-preparation uses only documented product controls. Reset via the managed-key control on `/audit`, then re-approve the four screens.

---

## 4. Seventy-five-second positioning statement

Suggested spoken text (~75 seconds):

> InsaneSDD 2.0 uses human-supervised approval gates before downstream planning work. UX Design Studio is a proof-of-work concept extension that deepens the UX gate into a visual, per-screen approval workbench. For the AgentPilot demonstration project, a generated UX specification is rendered before Agile plan generation—not as a claim that planning already runs here, but so reviewers can see screens, not only text. Review happens per screen. Revisions are structured and traceable. Regeneration is mocked through a provider boundary with no real LLM. Approvals bind to the current screen version and the frozen baseline, so a regenerated screen must be reapproved. This is a concept extension for interview evaluation—not an official InfoBeans product, and not proof that InsaneSDD lacks a capability.

---

## 5. Primary live flow (6–8 minutes)

Suggested timing for AgentPilot:

### 0:00–0:45 — Positioning and project context

- Deliver the positioning statement (or a tightened version if already spoken).
- Name AgentPilot, five screens, demo roles vs UX personas.

### 0:45–1:30 — Overview

- Open `/overview`.
- Point out 3 personas, 3 journeys, 5 screens, component count, and approval progress.
- Note gate incomplete until every required current screen version is approved.

### 1:30–2:30 — Dashboard render path

- Open Dashboard review.
- Explain UXSpec → allowlisted registry → recursive composer (one path for all five screens).
- Show runtime tokens via `--uxds-*` theming on the preview root.

### 2:30–3:20 — Lenses

- Switch responsive preview (mobile / desktop; tablet available and retained).
- Open persona lens; briefly show Taylor accessibility-oriented context.
- Keep annotations visually separate from the rendered product screen.

### 3:20–4:45 — Revision and regeneration

- Submit a structured revision (affected nodes, category, description).
- Enable **Simulate controlled provider failure**, trigger **Regenerate**, confirm failure announcement and prior version retained.
- Disable the failure toggle; regenerate successfully; note loading/announcement and deterministic regenerated content (for example Priority operations view).

### 4:45–5:40 — Version history and reapproval

- Open version history: baseline vs regenerated, source labels, timestamps.
- Show that prior approval does not cover the new current version.
- Reapprove the current Dashboard version; restore gate when the other four remain approved.

### 5:40–6:25 — Accessibility evidence

- Enable accessibility overlay.
- Exercise a marker with keyboard focus; confirm preview remains operable.
- Point to contrast / ARIA evidence from the seed—studio AA target, not a claim of full production audit completion.

### 6:25–7:05 — Audit and reset

- Open `/audit`.
- Show chronological append-only events with actor, screen, baseline, timestamps.
- Demonstrate **Reset demo state** (managed key only).

### 7:05–8:00 — Architecture close inside the live window (if time)

- Layering: domain governance free of React; ports; mock provider; Vitest + Playwright + CI.
- Mention deployment URL: https://ux-design-studio-poc.vercel.app
- Point to `docs/architecture-decisions.md` and production evolution path (documented only).
- Closing line: concept extension workbench—not official product, not real LLM, not real auth.

---

## 6. Architecture close (if separated from the live window)

Keep under ~90 seconds:

- Immutable UXSpec; governance as append-only events + selectors
- Allowlisted renderer safety (unknown/invalid/depth)
- `DesignAgentProvider` replaceability without evaluating AI quality
- localStorage behind a port; durable signed audit store is production-only documentation
- Standalone SPA now; route-level MFE / OIDC / server RBAC documented, not built

---

## 7. Failure-recovery route (backup path)

Use when the happy path is interrupted:

1. Reset demo state (managed key only).
2. Re-select Demo Approver.
3. If regeneration fails unexpectedly, enable then disable controlled provider failure and retry once.
4. If storage looks corrupt, use Reset demo state—never `localStorage.clear()`, never paste arbitrary JSON.
5. If a deep link 404s on static hosting, confirm SPA rewrite (`vercel.json`) and reload `/overview`.

---

## 8. Questions and concise answers

| Question | Answer |
|---|---|
| Is this an InfoBeans product? | No. It is a proof-of-work concept extension for interview evaluation. |
| Does this prove InsaneSDD is missing UX review? | No. Never frame it that way. |
| Is the role switcher real auth? | No. Demo Approver / Reviewer / Viewer are POC simulation only. |
| Is regeneration real AI? | No. Deterministic mock behind `DesignAgentProvider`; no network LLM. |
| Does approval generate an Agile plan? | No. The gate signals readiness only; planning is outside this POC. |
| Is localStorage production audit storage? | No. Port-shaped adapter for the POC; durable signed storage is a documented production path. |
| Why not Module Federation? | Unknown host; SPA with MFE-ready boundaries first (ADR-001). |
| What was cut? | Nothing. Cut line activated: No. Optional journey, history, overlay, and tablet are retained. |

---

## 9. Final closing statement

> UX Design Studio shows how a generated UX specification can be reviewed visually, revised with structure, regenerated through a safe provider boundary, and approved per screen version—with an append-only audit trail—before Agile planning. It is a concept extension for InsaneSDD 2.0 evaluation, not an official InfoBeans product release.

---

## 10. Rehearsal log

### Presentation rehearsal plan

Spoken timings in section 5 are the **presentation rehearsal plan**. They are targets, not measured human run results.

### Automated Playwright technical rehearsal

Technical rehearsal uses `e2e/epic5-release-smoke.spec.ts`.

| Slot | Command | Base URL | Measured duration | Failed steps | Retries | Console errors | Page errors | Failed assets | Result |
|---|---|---|---|---|---|---|---|---|---|
| Local production preview | `CI=true pnpm run test:e2e` | `http://127.0.0.1:4173` (webServer) | ~9.8s wall / 8.2s test | 0 | 0 | none observed | none observed | none observed | 2026-07-15 PASS |
| Deployed Vercel URL | `PLAYWRIGHT_BASE_URL=https://ux-design-studio-poc.vercel.app pnpm run test:e2e` | https://ux-design-studio-poc.vercel.app | ~9.1s wall / 8.4s test | 0 | 0 | none observed | none observed | none observed | 2026-07-15 PASS |

Notes:

- Without `PLAYWRIGHT_BASE_URL`, Playwright builds/starts local Vite preview on `127.0.0.1:4173`.
- With `PLAYWRIGHT_BASE_URL`, Playwright does **not** start `webServer` and targets the provided URL.
- This automated run is the technical rehearsal.
- A human spoken rehearsal is **not claimed** in this log unless explicitly performed and recorded below.

### Spoken human rehearsal

| Field | Value |
|---|---|
| Performed? | No — not claimed |
| Date | — |
| Duration | — |
| Facilitator | — |
| Notes | Fill only after an actual spoken run |

---

## Related artifacts

- [`docs/release-acceptance.md`](release-acceptance.md)
- [`docs/architecture-decisions.md`](architecture-decisions.md)
- [`docs/traceability.md`](traceability.md)
- [`README.md`](../README.md)
