# Phase A2: Core Identity & Security (AuthN, AuthZ & RLS)

> **Objective:** Secure identity, eliminate public API leaks, enforce strict tenant isolation via Row-Level Security (RLS) without admin client bypasses, and migrate to Next.js 16 Proxy.  
> **Target Tooling:** Clerk Organizations (AuthN & RBAC) + Supabase RLS + Next.js 16 `proxy.ts`.

---

## 1. Executive Summary & Deliverables

1. **Next.js 16 Proxy Migration:** Replace deprecated `src/middleware.ts` with `src/proxy.ts` in compliance with Next 16 architecture rules.
2. **API Route Protection:** Remove broad wildcard exclusions that left `/api/(.*)` publicly unprotected.
3. **Purge Admin-Client Bypasses:** Refactor the 14 service classes that default to `createAdminClient()`. Force services to accept and require an authenticated, RLS-scoped Supabase client.
4. **Hardened Dev Fallback:** Eliminate silent dev-fallback degradation in production mode inside `src/shared/auth/tenantContext.ts`.
5. **Role-Based Access Control (RBAC):** Implement an explicit server-side `authorize({ requiredRole })` function supporting:
   - `org:admin` (Full tenant configuration, billing, user management)
   - `org:compliance_officer` (Create/sign scans, ingest policies, export dossiers)
   - `org:viewer` (Read-only access to dashboards, reports, and radars)

---

## 2. Technical Task Specifications (For the Coding Agent)

### Task A2.1: Next.js 16 Proxy File Migration (`src/proxy.ts`)
- **Background:** In Next.js 16, `middleware.ts` is deprecated in favor of `proxy.ts`.
- **Target File:** Delete `src/middleware.ts` -> Create `src/proxy.ts`.
- **Implementation Rules:**
  - Public routes must be strictly narrowed:
    ```typescript
    const isPublicRoute = createRouteMatcher([
      '/',
      '/sign-in(.*)',
      '/sign-up(.*)',
      '/api/webhooks(.*)', // Paystack & Clerk incoming webhooks verified by crypto signatures
      '/api/inngest(.*)',  // Inngest worker endpoint verified by Inngest signing key
      '/api/health',       // Cloud Run uptime monitoring probe
    ]);
    ```
  - All standard cockpit pages (`/radar`, `/gap-matrix`, `/executive`, `/marketing`) and core `/api/*` routes MUST require an authenticated Clerk session with an active `orgId`.
  - Export standard Next 16 config matcher:
    ```typescript
    export const config = {
      matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
      ],
    };
    ```

### Task A2.2: Hardening `tenantContext.ts` & Removing Insecure Fallbacks
- **Target File:** `src/shared/auth/tenantContext.ts`
- **Modifications:**
  1. In `NODE_ENV === 'production'`, throw an immediate `401 Unauthorized` / `403 Forbidden` error if either:
     - No Clerk user session exists.
     - No active Clerk organization (`orgId`) is attached to the session.
  2. Forbid fallback to `DEFAULT_DEV_ORG_ID` (`00000000-0000-0000-0000-000000000001`) whenever running outside explicit `NODE_ENV === 'test'` or `NODE_ENV === 'development'`.
  3. Wire the `requiredRole` option:
     ```typescript
     export async function requireRole(
       context: TenantContext,
       allowedRoles: ('org:admin' | 'org:compliance_officer' | 'org:viewer')[]
     ): Promise<void> {
       const userRole = context.userOrgRole; // resolved from clerk token claims
       if (!userRole || !allowedRoles.includes(userRole)) {
         throw new ForbiddenError(
           `User role '${userRole}' is not authorized. Required: ${allowedRoles.join(', ')}`
         );
       }
     }
     ```

### Task A2.3: Refactoring Service Constructors to Eliminate Default Admin Client
- **Impacted Services (14 files):**
  - `src/modules/radar/services/applicabilityEngine.ts`
  - `src/modules/radar/services/circularIngestionService.ts`
  - `src/modules/radar/services/lineageService.ts`
  - `src/modules/radar/services/radarNotificationService.ts`
  - `src/modules/radar/services/roleSynthesisService.ts`
  - `src/modules/radar/services/cascadeTriggerService.ts`
  - `src/modules/marketing-shield/services/marketingCascadeListener.ts`
  - `src/modules/gap-matrix/services/statutoryBenchmarkService.ts`
  - `src/modules/gap-matrix/services/policyVectorIndexService.ts`
  - `src/modules/gap-matrix/services/policyIngestionService.ts`
  - `src/modules/gap-matrix/services/gapSynthesisService.ts`
  - `src/modules/gap-matrix/services/concordanceEngine.ts`
  - `src/modules/executive/services/executiveOverviewService.ts`
  - `src/modules/audit/auditService.ts`
- **Specification:**
  - Change constructor signature from `constructor(options?: { dbClient?: SupabaseClient })` to **strictly require** the client:
    ```typescript
    constructor(options: { dbClient: SupabaseClient<Database>; ... }) {
      if (!options?.dbClient) {
        throw new ConfigurationError("Service requires an RLS-bound SupabaseClient");
      }
      this.dbClient = options.dbClient;
    }
    ```
  - In route handlers (`src/app/api/.../route.ts`), obtain the RLS client from `const { dbClient } = await getTenantContext();` and inject it into the service.
  - The only components allowed to use `createAdminClient()` are:
    1. Background worker tasks triggered by signed Inngest events with system-level batching.
    2. Data seeding scripts (`scripts/seedCorpus.ts`).

### Task A2.4: Supabase Clerk JWT Integration & RLS Policy Verification
- **Target File:** `supabase/migrations/20261006000002_harden_clerk_jwt_rls.sql`
- **Verify:**
  Ensure all RLS policies on tables (`organizations`, `users`, `policies`, `policy_clauses`, `radar_circulars`, `marketing_scans`, `audit_ledger`) extract `auth.jwt() ->> 'org_id'` rather than relying on application-level filtering.

---

## 3. Human-Operator Setup Guide (Your Step-by-Step Actions)

### Step 1: Configure Clerk B2B Organizations
1. Log into your [Clerk Dashboard](https://dashboard.clerk.com/).
2. Select your Cogent application.
3. Under **Configure** -> **Organizations**:
   - Toggle **Enable Organizations** to `ON`.
   - Set **Max allowed members per organization**: e.g., `25` (or unlimited).
   - Under **Roles & Permissions**, verify default roles exist:
     - `Admin` (identifier: `org:admin`)
     - `Member` (identifier: `org:compliance_officer` - rename or create custom role)
     - Create a read-only role: `Viewer` (identifier: `org:viewer`).

### Step 2: Supabase Third-Party Auth Integration with Clerk
1. In Clerk Dashboard:
   - Navigate to **Configure** -> **JWT Templates**.
   - Click **New template** -> Select **Supabase**.
   - Note the **JWKS URL** and **Signing Key**.
2. In Supabase Dashboard:
   - Go to **Project Settings** -> **Authentication**.
   - Under **Third-Party Auth**, configure Clerk:
     - Enable Clerk as an OIDC provider or configure custom JWT verification with Clerk's JWKS URI.
   - This allows Supabase PostgreSQL to validate incoming Clerk bearer tokens natively and set `auth.jwt()` claims automatically.

---

## 4. Acceptance Criteria & Phase A2 Verification Checklist

- [ ] File `src/proxy.ts` replaces `src/middleware.ts` and successfully intercepts unauthenticated API and page requests.
- [ ] No route handler falls back to the default mock tenant when `NODE_ENV=production`.
- [ ] All 14 service classes enforce constructor injection of an RLS-authenticated `SupabaseClient`.
- [ ] Attempting to access an organization’s scans using another tenant's Clerk token returns an empty result set (enforced by PostgreSQL RLS).
- [ ] Security test suite in `tests/security/rls-multitenancy.test.ts` passes with zero regressions.
