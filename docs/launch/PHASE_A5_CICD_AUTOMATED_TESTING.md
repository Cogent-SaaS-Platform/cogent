# Phase A5: CI/CD & Automated Testing Gates

> **Objective:** Fix all 168 ESLint errors, automate linting and test execution via GitHub Actions, and configure automated Vercel continuous deployment with Docker container build verification.  
> **Target Tooling:** GitHub Actions + ESLint 9 + Vitest + Playwright + Vercel + Docker.

---

## 1. Executive Summary & Deliverables

1. **Lint Remediation Plan:** Fix the 168 ESLint errors (predominantly `@typescript-eslint/no-explicit-any` and unused variables in `src/shared/types/index.ts` and presentation types).
2. **Deterministic CI Test Suite:** Ensure all 31 Vitest test files (145 tests) and Playwright E2E tests execute cleanly inside GitHub Actions runners.
3. **Continuous Integration (CI) Workflow:** Create `.github/workflows/ci.yml` that validates code hygiene (`lint` -> `typecheck` -> `test` -> `build`) on every pull request targeting `main`.
4. **Continuous Deployment (CD) Workflow:** Configure Vercel Git-integrated deployment on merge to `main`, and include a Docker container compilation check in CI to guarantee long-term container portability.

---

## 2. Technical Task Specifications (For the Coding Agent)

### Task A5.1: ESLint Remediation Strategy (Zero Errors Gate)
- **Current State:** 168 errors, 146 warnings (primarily `no-explicit-any` across shared schemas and UI event handlers).
- **Remediation Plan:**
  1. In `src/shared/types/index.ts` (lines 175, 187, etc.):
     - Replace `Record<string, any>` with type-safe `Record<string, unknown>`.
     - Replace untyped JSON payload definitions with explicit Zod inferred types.
  2. In `src/shared/auth/tenantSyncService.ts`:
     - Type the injected client properly as `SupabaseClient<Database>` instead of casting to `any`.
  3. Verify with:
     ```bash
     npx eslint src --max-warnings=0
     ```

### Task A5.2: GitHub Actions Continuous Integration (CI) Workflow
- **Target File:** `.github/workflows/ci.yml`
- **Workflow Definition:**
  ```yaml
  name: Cogent CI Pipeline

  on:
    pull_request:
      branches: [main]
    push:
      branches: [main]

  jobs:
    validate:
      name: Lint, Typecheck & Test
      runs-on: ubuntu-latest
      env:
        NODE_ENV: test
        NEXT_TELEMETRY_DISABLED: 1
      steps:
        - name: Checkout Code
          uses: actions/checkout@v4

        - name: Setup Node.js 22
          uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: 'npm'

        - name: Install Dependencies
          run: npm ci

        - name: ESLint Hygiene Gate
          run: npm run lint

        - name: TypeScript Static Typecheck
          run: npx tsc --noEmit

        - name: Vitest Unit & Integration Suite
          run: npm run test

        - name: Next.js Production Build Validation
          run: npm run build
          env:
            NEXT_PUBLIC_APP_URL: "https://ci-test.internal"
            NEXT_PUBLIC_SUPABASE_URL: "https://ci-test.supabase.co"
            NEXT_PUBLIC_SUPABASE_ANON_KEY: "ey-ci-mock-anon-key"
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_ci_mock"
  ```

### Task A5.3: Automated Deployment & Continuous Delivery (CD)
- **Deployment Engine:** Vercel Git-Integrated Releases + Container Build Smoke Check.
- **Workflow Architecture:**
  1. **Continuous Deployment via Vercel Git Integration:** When a PR passes CI and merges into `main`, Vercel immediately triggers an automated, zero-downtime production deployment pinned to Frankfurt (`fra1`).
  2. **Container Build Verification in CI:** Add a container build step to `.github/workflows/ci.yml` so that every PR verifies the multi-stage `Dockerfile` compiles cleanly, ensuring perpetual container readiness.
  ```yaml
        - name: Verify Multi-Stage Dockerfile Compilation
          run: docker build -t cogent:test .
  ```

---

## 3. Human-Operator Setup Guide (Your Step-by-Step Actions)

### Step 1: Connect GitHub Repository to Vercel
1. In your [Vercel Dashboard](https://vercel.com/), ensure your repository `cogent` is connected under Git settings.
2. In **Settings** -> **Git**:
   - Production Branch: `main`
   - Automatically deploy branch merges to Production.
   - Automatically generate isolated Preview deployments for Pull Requests.

### Step 2: Configure Environment Variables in Vercel
1. In Vercel -> **Settings** -> **Environment Variables**:
   - Add all required production secrets (Clerk, Supabase, Cloudflare R2, Paystack, Upstash, Inngest, Sentry).
   - Scope them to **Production** and **Preview** environments.

---

## 4. Acceptance Criteria & Phase A5 Verification Checklist

- [ ] `npm run lint` completes with zero errors and zero warnings.
- [ ] Pull requests trigger GitHub Actions CI and block merge if any test or lint check fails.
- [ ] Docker container build step succeeds in CI guaranteeing continuous container portability.
- [ ] Merging a PR into `main` automatically deploys a new production release to Vercel with zero downtime.
- [ ] Instant rollback can be triggered via Vercel dashboard in <1 second.
