# GitHub Import Instructions

The package supports a one-run bootstrap and direct importer execution. Both paths are conflict-safe and repeatable.

## Recommended: one-run Windows bootstrap

Download `UXDS_Bootstrap_And_Import.ps1`, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\UXDS_Bootstrap_And_Import.ps1
```

The script automatically:

- Checks `git`, `gh`, `node`, and `corepack`
- Authenticates GitHub when needed
- Clones `MathanKA/UX-Design-Studio` into an isolated temporary directory
- Refuses to overwrite unmanaged target files
- Installs this managed package
- Commits and pushes the package to `main` without force
- Installs pnpm dependencies and commits the generated lockfile
- Validates the 50-hour plan
- Runs the importer in dry-run mode
- Runs the real importer
- Prints the created GitHub Project URL

GitHub authentication or authorization is the only unavoidable interactive operation.

## Direct importer execution

```bash
git clone https://github.com/MathanKA/UX-Design-Studio.git
cd UX-Design-Studio
gh auth login -h github.com
gh auth refresh -h github.com -s repo,project
corepack pnpm install
corepack pnpm run plan:validate
corepack pnpm run github:import:dry
corepack pnpm run github:import
```

The importer automatically creates or reconciles:

- `staging` from `main`
- Repository labels
- `v0.1.0 POC` milestone
- Private personal Project `UX Design Studio POC`
- Delivery Board and Backlog Table views
- Project fields and select options
- 6 epic issues
- 18 story sub-issues
- 36 task sub-issues
- Dependency links
- Project item metadata and initial Backlog status

## Re-running

Use the same command:

```bash
corepack pnpm run github:import
```

Stable markers identify managed resources. Existing managed issues are updated instead of duplicated. Existing Project Status values are preserved. Unrelated repository and Project content is not deleted.

## Safe-stop conditions

The importer stops without forcing changes when:

- The authenticated account is not `MathanKA`
- Repository push access is missing
- `staging` has diverged from `main`
- A same-name Project exists without the managed marker
- An unmanaged issue has an exact planned title
- Duplicate plan keys or dependency cycles exist
- The task estimate does not total 50 hours
- A conflicting sub-issue parent exists
- Required GitHub permissions are unavailable

After a successful run, `.github/import/import-report.json` contains the Project URL and plan-key-to-issue-number mapping.
