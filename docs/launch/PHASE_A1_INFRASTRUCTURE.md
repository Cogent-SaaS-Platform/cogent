# Phase A1: The Infrastructure & Project Foundation

> **Objective:** Establish the production source control, container runtime, compute hosting, database consistency, and object storage baseline.  
> **Target Cloud Environment:** Vercel (Edge & Serverless Compute) + Cloudflare (Edge/R2) + Supabase (Database).

---

## 1. Executive Summary & Deliverables

1. **Version Control:** Initialize Git repository, configure `.gitignore` for security hygiene, and define strict GitHub branch protection rules on `main`.
2. **Container Engine (Zero Vendor Lock-in):** Create a multi-stage `Dockerfile` leveraging Next.js 16 standalone output on `node:22-alpine` with non-root security execution to guarantee future container portability.
3. **Compute Runtime:** Vercel Edge & Serverless hosting pinned to Frankfurt (`fra1`) collocated with Supabase Frankfurt (`eu-central-1`) infrastructure ($0 upfront, no credit card required).
4. **Database Migration Consistency:** Fix Supabase migration timestamp collision (`20261006_connected_compliance_cascade.sql` vs `20261006_radar_circulars_and_lineage.sql`) so `supabase db push` runs deterministically.
5. **Object Storage (Cloudflare R2):** Establish S3-compatible credentials and bucket topology for zero-egress document and database backup storage.

---

## 2. Technical Task Specifications (For the Coding Agent)

### Task A1.1: Git Repository Initialization & Security Hardening
- **Target File:** `.gitignore`
- **Actions:**
  - Ensure `.env*` files are strictly excluded except `.env.example`.
  - Add missing test artifacts and cache directories:
    ```gitignore
    # Testing & Reports
    /test-results/
    /playwright-report/
    /coverage/
    
    # Antigravity & IDE Brain artifacts
    .system_generated/
    
    # Internal references not intended for repo release
    /ref/
    /ui_ref/
    ```
  - Run terminal commands:
    ```bash
    git init
    git branch -M main
    git add .
    git commit -m "chore(core): initial production-ready commit for Cogent enterprise SaaS"
    ```

### Task A1.2: Multi-Stage Next.js Standalone Dockerfile
- **Prerequisite in `next.config.ts`:**
  Set `output: 'standalone'` to produce a minimal production bundle without copying all of `node_modules`.
  ```typescript
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    output: 'standalone',
    serverExternalPackages: ['pino', 'pino-pretty'],
  };

  export default nextConfig;
  ```
- **Target File:** `Dockerfile` (create in root)
  ```dockerfile
  # Stage 1: Dependencies
  FROM node:22-alpine AS deps
  RUN apk add --no-cache libc6-compat
  WORKDIR /app
  COPY package.json package-lock.json ./
  RUN npm ci

  # Stage 2: Builder
  FROM node:22-alpine AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  ENV NEXT_TELEMETRY_DISABLED=1
  ENV NODE_ENV=production
  RUN npm run build

  # Stage 3: Minimal Production Runner
  FROM node:22-alpine AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1
  ENV PORT=8080
  ENV HOSTNAME="0.0.0.0"

  RUN addgroup --system --gid 1001 nodejs && \
      adduser --system --uid 1001 nextjs

  COPY --from=builder /app/public ./public
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

  USER nextjs
  EXPOSE 8080
  CMD ["node", "server.js"]
  ```
- **Target File:** `.dockerignore`
  ```
  Dockerfile
  .dockerignore
  node_modules
  npm-debug.log
  .next
  .git
  .env*.local
  test-results
  playwright-report
  ref
  ui_ref
  ```

### Task A1.3: Supabase Migration Timestamp Disambiguation
- **Current State:** Two migrations share the identical prefix `20261006_`:
  1. `supabase/migrations/20261006_connected_compliance_cascade.sql`
  2. `supabase/migrations/20261006_radar_circulars_and_lineage.sql`
- **Fix:** Rename them to strict ISO timestamp sequences:
  - Rename `supabase/migrations/20261006_radar_circulars_and_lineage.sql` -> `supabase/migrations/20261006000005_radar_circulars_and_lineage.sql`
  - Rename `supabase/migrations/20261006_connected_compliance_cascade.sql` -> `supabase/migrations/20261006000006_connected_compliance_cascade.sql`
- **Verification:** Execute `npx supabase db lint` or verify filename order matching semantic dependency order (radar circulars must exist before connected cascade refers to circular IDs).

### Task A1.4: Cloudflare R2 Client Configuration
- **Target File:** `src/shared/storage/r2Client.ts`
- **Purpose:** Standard S3-compatible client interacting with Cloudflare R2 bucket (`cogent-storage-prod`) for uploaded regulatory documents and generated audit defense packages.
- **Dependencies:** Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.

---

## 3. Human-Operator Setup Guide (Your Step-by-Step Actions)

### Step 1: Create GitHub Remote & Branch Protection
1. Log into your GitHub account and create a new private repository named `cogent` (or `cogent-saas`).
2. Link your local project and push:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USER>/cogent.git
   git push -u origin main
   ```
3. In GitHub repo settings:
   - Navigate to **Settings** -> **Branches** -> **Add branch ruleset**.
   - Rule name: `Protect Main`.
   - Enforcement status: **Active**.
   - Target branch: `main`.
   - Check **Require a pull request before merging** (Require approvals: 1).
   - Check **Require status checks to pass before merging** (We will hook this up in Phase A5).
   - Check **Block force pushes** and **Prevent deletions**.

### Step 2: Vercel Project Setup ($0 / Zero Credit Card Required)
1. Visit [Vercel](https://vercel.com/) and sign in with your GitHub account.
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository: `cogent` (or `cogent-saas`).
4. Framework Preset: Automatically detected as **Next.js**.
5. Build and Output Settings:
   - Build Command: `npm run build` (or default `next build`)
   - Output Directory: `.next`
   - Serverless Function Region: Set to **Frankfurt, Germany (`fra1`)** (collocated with Supabase Frankfurt `eu-central-1` database). This is also pinned via `vercel.json`.
6. Environment Variables:
   - Enter initial variables from `.env.example` (or configure after Phase A2/A3).
7. Click **Deploy**. Vercel will build and assign an immediate preview URL (e.g. `cogent.vercel.app`) with automatic SSL/TLS.

### Step 3: Cloudflare R2 Storage Provisioning
1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **R2 Object Storage** in the sidebar.
3. Click **Create bucket**:
   - Bucket name: `cogent-prod-storage`
   - Location: **Western Europe (WNAM/WEUR)** to keep latency minimal.
4. Generate API tokens for the application:
   - Click **Manage R2 API Tokens** -> **Create API Token**.
   - Permissions: **Object Read & Write**.
   - Apply to bucket: `cogent-prod-storage`.
   - Note the **Access Key ID**, **Secret Access Key**, and **Endpoint URL** (e.g. `https://<account_id>.r2.cloudflarestorage.com`).
   - Store these securely for `.env.local` and Phase A7 production secrets.

---

## 4. Acceptance Criteria & Phase A1 Verification Checklist

- [ ] Repository is tracked by Git on branch `main` with zero tracked secrets in history.
- [ ] Next.js 16 standalone build succeeds cleanly with zero type errors.
- [ ] Multi-stage `Dockerfile` and `.dockerignore` exist for zero-vendor-lockin container deployment.
- [ ] `vercel.json` configured with Frankfurt (`fra1`) region collocation.
- [ ] Supabase migrations directory has unique, sequentially ordered timestamp prefixes with zero naming collisions.
- [ ] Cloudflare R2 client wrapper (`src/shared/storage/r2Client.ts`) created and tested with unit tests passing.
