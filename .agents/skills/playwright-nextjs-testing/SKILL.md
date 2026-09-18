---
name: playwright-nextjs-testing
description: >-
  Playwright testing guide and troubleshooting runbook for Next.js standalone builds.
  Use when writing, maintaining, or debugging E2E browser tests, responsive ergonomics,
  and local pre-push validation hooks.
---

# Playwright & Next.js Standalone Testing Guide

This skill details how to write, run, and troubleshoot Playwright E2E browser tests for Next.js 16 standalone builds in PZ-Panel.

---

## 1. Architecture & Port Rules

Port | Target | Description
:--- | :--- | :---
**3000** | Production Docker | Always running live panel. Never touched by Playwright.
**3001** | Ephemeral Standalone Server | Auto-spawned by Playwright's `webServer` during test execution and torn down immediately after.

---

## 2. Next.js Standalone Build & Static Assets Quirk

Next.js in standalone mode does not automatically serve static CSS/JS files from `.next/standalone` without explicitly copying them.

* **Requirement:** Before starting the standalone server, `.next/static` must be copied to `.next/standalone/.next/static` and `public` to `.next/standalone/public`.
* **Automated in `package.json`:**
  ```json
  "postbuild": "cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/ 2>/dev/null || true"
  ```
* **WebServer Configuration (`playwright.config.ts`):**
  ```typescript
  webServer: {
    command: 'HOSTNAME=127.0.0.1 PORT=3001 node .next/standalone/server.js',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: false,
    timeout: 15000,
  }
  ```

---

## 3. Headless & Unattended Execution Rule

Playwright must never block terminal execution or hang waiting for user interactions with test reports.

* **Reporter Setting in `playwright.config.ts`:**
  ```typescript
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ]
  ```

---

## 4. Viewport Matrix & Responsive Ergonomics

All E2E tests must validate across three primary form factors:

1. **Mobile (Pixel 5 - 393x851):** Tests hamburger drawer, mobile top bar, touch targets (>= 44px), and backdrop taps.
2. **Desktop (1280x720):** Tests fixed sidebar, wide data tables, and modal overlays.
3. **Compact Laptop (1024x600):** Validates that flex containers with `min-h-0` on `flex-1 overflow-y-auto` prevent footer and version watermark clipping.

---

## 5. Standard Test Commands

```bash
pnpm run test:e2e     # Run Playwright tests on port 3001
pnpm run test:all     # Run Vitest (78 tests) + Playwright (7 tests)
pnpm run validate:all # Run Lint + Typecheck + Vitest + Playwright
```
