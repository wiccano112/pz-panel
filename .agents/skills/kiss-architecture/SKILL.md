---
name: kiss-architecture
description: >-
  Practical guide and philosophy for maintaining a simple, monolithic, personal-project
  architecture for PZ-Panel. Use when designing features, evaluating libraries, refactoring,
  or reviewing technical proposals to prevent over-engineering, cloud dependencies, and
  unnecessary distributed complexity.
---

# KISS Architecture Guide for PZ-Panel

## 1. Core Philosophy: Keep It Simple, Stupid (KISS)
PZ-Panel is a **personal, self-hosted web administration panel** designed to manage a single Project Zomboid dedicated server on the same host or local network. 

### Fundamental Tenets:
1. **$0 Budget & Zero Cloud Lock-in:** No managed cloud services, no paid CI/CD runners, no external SaaS dependencies. Everything runs locally on the host machine.
2. **Monolithic & Minimalist Stack:** A single Next.js 16 (App Router) + React 19 application running in one lightweight Docker container.
3. **No Over-Engineering:**
   - ❌ **NO** microservices, Kubernetes, or container orchestration layers.
   - ❌ **NO** external message brokers (Kafka, RabbitMQ) or distributed caching (Redis).
   - ❌ **NO** heavy enterprise ORMs or multi-tier database clusters.
   - ❌ **NO** unnecessary state management libraries (Redux, MobX); use native React 19 hooks and Context.
4. **Fast, Bare-Metal Local Workflows:** Development, testing, and validations run directly on the host using `pnpm`, taking seconds rather than minutes.

---

## 2. Technical Stack Boundaries

Component | Chosen Solution | Why It Was Chosen | What to AVOID
:--- | :--- | :--- | :---
**Framework** | Next.js 16 + React 19 | Server Actions + SSR + Single process | Express/Fastify separate backend microservices
**Styling** | Tailwind CSS v4 | Zero runtime CSS, minimal bundle size | Heavy component libraries (Radix, MUI, AntD)
**Database** | SQLite (`data/db/<server>.db`) | Single file embedded DB, native to PZ | Postgres/MySQL containers
**Config Storage** | Direct INI & Lua files + `.staged` | Native PZ formats, filesystem atomic writes | Complex external configuration servers
**Testing** | Vitest (Unit) + Playwright (E2E) | Sub-second test execution on 4 cores | Bulky testing frameworks or cloud runners
**Deployment** | `docker compose` (Standalone image) | Simple, single-container lifecycle | K8s, Nomad, Helm, multi-container meshes

---

## 3. Decision Matrix for New Features & Refactoring

Before writing any new code or introducing a dependency, ask:

1. **Can this be solved with native Node.js / React features?**
   * *Example:* Use native `fs/promises` and React Server Actions instead of adding an external API framework.
2. **Does this introduce background memory overhead?**
   * *Rule:* Never leave persistent background workers or daemon processes running outside the Next.js process.
3. **Is it easy to debug with simple `console.log` or standard tests?**
   * *Rule:* Keep logic synchronous or simple single-promise async. Avoid complex reactive event streams unless strictly required.
4. **Does this protect the live Project Zomboid server?**
   * *Rule:* The PZ game server container (`pz-server`) must remain untouched during panel builds and updates.

---

## 4. Code Smells & Red Flags (Reject in Reviews)

🚩 **Red Flag 1: Distributed Architecture Proposals**
* Proposing Redis for caching when in-memory JavaScript `Map` or Next.js `cache()` suffices.

🚩 **Red Flag 2: Complex CI/CD Pipelines**
* Proposing remote GitHub Action runners or heavy containerized runners when local Git pre-push hooks (`pnpm run validate:all`) execute in <5 seconds.

🚩 **Red Flag 3: Over-Abstraction**
* Introducing 4 layers of interfaces, factories, and adapters for a simple file parser that only needs a pure TypeScript function and Zod validation.

---

## 5. Feature Ownership Pattern (Vertical Slicing vs Horizontal Splitting)

In Next.js (App Router), frontend components and backend Server Actions are tightly coupled. 

* ❌ **Anti-Pattern (Horizontal Splitting):** Splitting one feature across two developers/agents (Developer A writes the Server Action, Developer B writes the UI component). This creates Git merge conflicts, type desynchronizations, and unnecessary communication overhead.
* ✅ **Recommended Pattern (Vertical Slicing):** A single Full-Stack Builder owns the feature end-to-end (Server Action + Zod validation + UI component + Unit tests in Vitest).
* ✅ **Validation Pipeline:** Once built, an independent QA specialist writes and validates Playwright E2E browser tests, while an Auditor reviews security and linting.
