---
name: pz-release-workflow
description: >-
  Step-by-step runbook for atomic version bumping, testing validation, Git tagging,
  GitHub release creation, and zero-downtime Docker container deployment for PZ-Panel.
  Use when executing or auditing releases.
---

# PZ-Panel Release & Deployment Runbook

This skill defines the strict, unbroken 8-step pipeline required to publish and deploy any release of PZ-Panel.

---

## The 8-Step Release Pipeline

### Step 1: Execute Version Bump
Choose the appropriate SemVer bump:
```bash
pnpm run version:patch   # Bug fixes, UI adjustments (e.g. 1.2.0 -> 1.2.1)
pnpm run version:minor   # New features, backwards-compatible additions (e.g. 1.2.0 -> 1.3.0)
pnpm run version:major   # Major breaking changes (e.g. 1.2.0 -> 2.0.0)
```
*This automatically synchronizes `package.json` and `src/version.json`.*

### Step 2: Full Quality Validation Battery
Run the comprehensive test and linting pipeline:
```bash
pnpm run validate:all
```
*Must pass 100% of ESLint, TypeScript check, Vitest unit tests (78 tests), and Playwright E2E tests (7 tests).*

### Step 3: Security & Secrets Check
Verify that:
- No hardcoded paths (`/home/...`) exist in modified files.
- No secrets or API keys are exposed.
- `.env.local` files remain gitignored.

### Step 4: Commit Changes to Git
```bash
git add .
git commit -m "chore(release): bump version to vX.Y.Z"
```

### Step 5: Create Annotated Git Tag
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

### Step 6: Push Commits and Tags to Remote
```bash
git push origin main && git push origin vX.Y.Z
```

### Step 7: Create GitHub Release
```bash
gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes
```

### Step 8: Mandatory Production Docker Deployment
Compile and restart the `pz-panel` production container on **Port 3000**:
```bash
docker compose up -d --build
```

Verify production health:
```bash
curl -I http://localhost:3000
```
*(Must respond with `HTTP 200 OK`).*

> [!CAUTION]
> **Zero Downtime Invariant:** Never stop or restart the `pz-server` game container during panel deployment. Only rebuild and restart the `pz-panel` web container.
