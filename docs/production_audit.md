# Cogent — Production Readiness Audit

**Target:** `https://cogent-app-ecru.vercel.app` · **Codebase:** `Cogent/` (Next.js 16.3.8, Clerk 7, Supabase, Vercel `fra1`)
**Method:** 13 screenshots reviewed → code traced → live endpoints probed (`/api/health`, anonymous API calls) → Upstash credentials tested.

---

## 1. Engineering Assessment

**Verdict: 🔴 NOT production-ready. Hold the launch.**

The UI looks finished, but much of it sits on **hardcoded demo state, made-up compliance data, and silent error handling**. Three problems are bigger than the individual bugs:

1. **Demo data shows up as the customer's own data.** Settings, Team, Gap Matrix, CCO signatory, and the Audit metrics all start from hardcoded "Apex FinTech / Folake Adeyemi / Olumide Adebayo" values. **This is not a cross-tenant database leak.** The cause is client-side `useState` seeds. In a RegTech product it is still a legal problem: attestations and dossiers can go out under someone else's name.
2. **The platform reports compliance it has not checked.** A brand-new tenant with zero data gets **"100% EXEMPLARY"**. Signup adds a fake `COMMERCIAL_BANK` license. Onboarding adds marketing scans already marked `APPROVED_BY_CCO`. If a board relies on those numbers, the risk is regulatory as well as reputational.
3. **Server errors go unseen.** Sentry server instrumentation never loads (file is in the wrong place). Most API routes catch DB errors and return `success: true` or an empty array. Several authenticated endpoints return **plain-text** `Internal Server Error`, which the client then fails to parse as JSON (`Unexpected token 'I'`).

### Live probe results
| Check | Result |
|---|---|
| `/api/health` → Database | ✅ OK (948 ms) |
| `/api/health` → **R2 object storage** | ❌ **FAILED** (`UnknownError`): policy uploads and dossier storage will break |
| `/api/health` → Gemini key | ✅ Present (key presence only; no live call made) |
| Anonymous `/api/library`, `/api/audit`, `/api/radar/sync` | ✅ 401 JSON from proxy (auth gate works) |
| Upstash Redis (local `.env.local` creds) | ✅ PONG (Vercel env values not verifiable from here) |

### Why the plain-text 500s happen
All route handlers checked (`library`, `audit`, `radar/sync`, `marketing/signoff`, `gap-matrix/evaluate`) wrap their logic in `try/catch` and return **JSON**. A **non-JSON** 500 therefore comes from **outside the handler body**. Ranked suspects:

1. **The proxy throws on an authenticated request.** [`checkRateLimit`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/shared/security/rateLimiter.ts#L138-L151) **re-throws** on any Upstash error, and [`proxy.ts:L88-96`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/proxy.ts#L88-L96) has no catch around it. Anonymous calls return 401 *before* this line, which fits the probe results.
2. **A module fails to load** somewhere in the shared import chain of authenticated routes.
3. **A platform-level function crash.**

> [!IMPORTANT]
> **Settle this in 5 minutes:** Vercel → Project → Logs → filter `status:500`, then open one failed `POST /api/marketing/signoff`. The stack trace names the layer. Today nobody sees these traces because Sentry server capture is dead (see A-1).

---

## 2. Ticket Breakdown (Requested 4)

| # | Feature / Location | Bug Description | Priority | Root Cause (from code) | Proposed Engineering Fix |
|---|---|---|---|---|---|
| **T1** | Sign-up → Onboarding → `/overview` | After email + org name, the user lands on `/overview`. The 5-step wizard never shows. | 🔴 **P0 Blocker** | (a) [`.env.local:L26-27`](file:///c:/Users/Alex%20Marco/Documents/Cogent/.env.local#L26-L27) sets `AFTER_SIGN_UP_URL="/"`. (b) [`proxy.ts:L37-43`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/proxy.ts#L37-L43) sends every signed-in `/` request to `/overview`. (c) [`<SignUp>`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/sign-up/%5B%5B...sign-up%5D%5D/page.tsx#L86-L89) has no `forceRedirectUrl`. (d) **No onboarding-completed flag exists** anywhere (DB, Clerk metadata, or proxy). The "org name" prompt is Clerk's built-in org task, not Cogent's wizard. (e) [`/api/onboarding`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/api/onboarding/route.ts#L317-L329) catches every DB error and **always returns `success: true`**. Supabase errors come back as values, not exceptions, so failed writes are never noticed. | 1. Add `organizations.onboarding_completed_at timestamptz`. 2. Mirror it to Clerk `org.publicMetadata.onboarded` and expose it in the session token. 3. Proxy: if signed in, has org, and `!onboarded` on a non-onboarding path → redirect to `/onboarding`. 4. Set `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/onboarding`. 5. Onboarding API: check `{ error }` on **every** write inside one RPC/transaction. Return 4xx/5xx on failure. Set the flag only after every write succeeds. 6. Wizard: send the user to `/overview` only after the server confirms. Disable the "Leave" bypass ([L84-88](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/modules/onboarding/ui/OnboardingWizard.tsx#L84-L88)) until onboarding is complete. |
| **T2** | Overview, Horizon Scanning, Library, Audit Ledger | Overview and Horizon are empty. "Poll Live Feeds" shows `Unexpected token 'I'… not valid JSON`. Library and Audit show `HTTP 500`. | 🟠 **P1 High** | 1. **Non-JSON 500** on `POST /api/radar/sync` (see suspects above). The client calls `res.json()` without checking `Content-Type`. 2. **Probable empty results under RLS.** Pages show zero rows *with no error*. RLS policies are `TO authenticated` ([rls_policies.sql](file:///c:/Users/Alex%20Marco/Documents/Cogent/supabase/migrations/20261002000002_rls_policies.sql#L35-L60)). If the Clerk session token lacks a `role: authenticated` claim, or Supabase third-party auth isn't linked to the **production** Clerk instance, PostgREST runs the query as `anon` and quietly returns `[]`. 3. Library/Audit 500 = the Supabase query failed (likely JWT rejected) and the UI hides the server message. 4. The prod `radar_circulars` corpus may not be seeded (`seedRadarCirculars.ts`); this could not be verified because the Supabase MCP timed out. | 1. Shared `apiFetch()` that checks `content-type` before parsing and surfaces `{code,message}` (pattern §4.1). 2. Shared `withApi()` route wrapper so routes **always** return JSON (§4.2). 3. Check the JWT in the browser: `await Clerk.session.getToken()` → decode → confirm `role:"authenticated"` and `o.id`. Enable Supabase ↔ Clerk third-party auth for the **prod** Clerk domain. 4. Run the seed scripts against prod and add a startup check (`count(radar_circulars) > 0`). 5. Real empty states: **"No data yet → [action]"**, separate from **error** states with a retry. |
| **T3** | Policy Gap Matrix | Shows 4 clauses, 3 policies, 3 benchmarks, ₦15,000,000 and 62.5% for a tenant that uploaded nothing. "Run 5-W Gap Evaluation" fails with `Evaluation endpoint returned error`. | 🟠 **P1 High** | 1. **Hardcoded seeds:** [`PRESET_BENCHMARKS`, `PRESET_EVALUATION_ITEMS`, `PRESET_TENANT_POLICIES`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/modules/gap-matrix/ui/GapMatrixDashboard.tsx#L64-L266) are the **initial `useState` values** ([L286-293](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/modules/gap-matrix/ui/GapMatrixDashboard.tsx#L286-L293)). They are replaced only when the API returns a non-empty list, so a new tenant always sees the demo. 2. **The evaluation sends fake IDs:** `policyId: 'policy-canonical-demo'` and `benchmarkDocumentVersionId: 'bench-cbn-aml-2022'` are not UUIDs, so the DB lookup fails. 3. The client fell back to the generic message, so the body was not JSON (same non-JSON 500 class). The client also reads `errJson.error` as a string, but `AppError.toJSON()` returns an object (`{error:{code,message}}`), which would display as `[object Object]`. 4. [`GET /policies`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/api/gap-matrix/policies/route.ts#L40-L46) turns DB errors into `success:true, data:[]`. 5. Default prop `organizationId='00000000-…0001'` ([L278](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/modules/gap-matrix/ui/GapMatrixDashboard.tsx#L278)). | 1. Delete all `PRESET_*` constants from production code (move them to a Storybook/demo fixture). Start state as `[]` plus a loading flag. 2. Disable "Run Evaluation" until a **real** policy and benchmark (UUIDs from the API) are selected. Validate both with `z.string().uuid()` on the server (§4.3). 3. Check that the policy belongs to the tenant (`organization_id`) before calling the AI. 4. Run the AI work as a background job (Inngest): return `202 {evaluationId}` and poll, so it can't hit the serverless timeout. 5. Stop the client from sending `organizationId`; the server must take it from the session. |
| **T4** | Settings → My details / Profile / Team / Billing | Shows another person's name, email, company, RC/license, address, and 4 "Active" team members the user never added. Settings opens on **Billing**. | 🔴 **P0 Critical (legal/trust)** | **Not a DB leak; hardcoded client state.** [`settings/page.tsx:L143-217`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/settings/page.tsx#L143-L217) seeds `useState('Folake')`, `'f.adeyemi@apexfintech.ng'`, `'Apex FinTech Nigeria Limited'`, `'CBN/PSSP/LIC/2026/014'`, and a 4-person team. **No GET loads real profile/team data.** **All Save handlers are fake** ([L225-265](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/settings/page.tsx#L225-L265)): `setTimeout` shows "Saved" and nothing is stored. Password change is fake too. Card state is seeded with `'Mayad Ahmed' / '8269 9620 9292 2538'` ([L175-178](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/settings/page.tsx#L175-L178)). Default tab is `'billings'` ([L47](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/settings/page.tsx#L47)). | 1. Remove every seeded value. Default tab: `'details'`, synced to `?tab=`. 2. Add `GET/PATCH /api/settings/profile` and `/api/settings/organization` (Zod-validated, tenant-scoped). Personal fields come from Clerk `useUser()`; org fields from the `organizations` row. 3. Team = `organization_memberships ⨝ users` for the current org. Invites via `clerkClient.organizations.createOrganizationInvitation` with role checks (`org:admin`). 4. Password: use Clerk `<UserProfile>` / `user.updatePassword()` and drop the custom form. 5. **Never store card data in app state.** Show Paystack's masked `authorization.last4` from the webhook record only. 6. Add the tenant-boundary guard and an RLS test suite (§4.4) so a real leak can't appear later. |

---

## 3. Additional Findings (not reported, but required for production)

### 🔴 P0: Data integrity, legal, and security
| ID | Location | Finding | Fix |
|---|---|---|---|
| **A-1** | [`instrumentation.ts`](file:///c:/Users/Alex%20Marco/Documents/Cogent/instrumentation.ts) (repo root) | The project uses `src/`, so Next.js 16 **only loads `src/instrumentation.ts`** (confirmed in `node_modules/next/dist/docs`). **Sentry server capture and `onRequestError` never run**, which is why every 500 above went unseen. | Move it to `src/instrumentation.ts`. Deploy, then throw a test error to confirm it reaches Sentry. |
| **A-2** | [`CcoGovernanceBlock.tsx:L49,L119`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/modules/marketing-shield/ui/CcoGovernanceBlock.tsx#L119), [`arconDossierService.ts:L35,L181`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/modules/audit/arconDossierService.ts#L35), [`dossierExportService.ts:L32`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/modules/gap-matrix/services/dossierExportService.ts#L32), [`radar/brief/route.ts:L14`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/api/radar/brief/route.ts#L14), [`marketing/dossier/route.ts:L92`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/api/marketing/dossier/route.ts#L92) | **Attestations and regulator dossiers default to a made-up signatory** ("Olumide Adebayo, Esq.", "Folake Adeyemi, Esq."). A CCO sign-off can be sealed into the "immutable" ledger under someone else's name. | Signatory = the authenticated user (`tenantCtx.userId`) plus the role from the membership table. The server ignores a client-supplied `reviewerName`. Fail if no real CCO is designated. |
| **A-3** | [`tenantSyncService.ts:L172-209`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/shared/auth/tenantSyncService.ts#L172-L209) | Every new org gets a **fake `COMMERCIAL_BANK` license `CBN/BSD/APP/{year}/001`** and a fake `NIBSS_NIP` "LIVE_PRODUCTION" rail. This is the source of the Overview's "Authorized Tenant: PSSP / Commercial Bank". | Bootstrap **only** the trial subscription. Licenses and rails come from onboarding input. |
| **A-4** | [`onboarding/route.ts:L49-52, L227-268`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/api/onboarding/route.ts#L227-L268) | Onboarding invents `cbn_approval_ref 'CBN/GOV/2026/01'` and inserts marketing scans with `approval_status:'APPROVED_BY_CCO'` that **nobody approved**. `users.select('id').limit(1)` ([L231](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/api/onboarding/route.ts#L231)) attaches them to an arbitrary user. | Remove the synthetic approvals and references. If sample content is needed, flag it with `is_sample=true`, show a "Sample" badge, and keep it out of all scores and exports. |
| **A-5** | [`executiveOverviewService.ts:L46-50, L179-188`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/modules/executive/services/executiveOverviewService.ts#L179-L188) | **No data scores as 100% "EXEMPLARY".** Fines-avoided figures are split by fixed ratios (×0.4, ×0.15, ×0.2) rather than computed. "Board Attestation" exports this. | With no data, return `healthGrade:'NOT_ASSESSED'` and `score:null`. Show "Not yet assessed". Block Board Attestation until each pillar has ≥1 real evaluation. Derive fines from `statutory_penalties`. |
| **A-6** | [`audit/route.ts:L48-54, L123-126`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/api/audit/route.ts#L123-L126) | Audit query has **no `organization_id` filter**; it relies only on RLS. Any admin-client path would leak every tenant's logs. Metrics are hardcoded: `'100% UNBROKEN'`, `'42 Board Packs'`, every row `status:'VERIFIED'`. | Add `.eq('organization_id', ctx.organizationId)` (defense in depth). Compute chain integrity by actually re-hashing the chain. Remove the literals. |
| **A-7** | [`MarketingShieldDashboard.tsx:L881`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/modules/marketing-shield/ui/MarketingShieldDashboard.tsx#L881), [`ClerkAvatar.tsx:L105,L169`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/shared/ui/ClerkAvatar.tsx#L105) | Fallback identity "Folake Adeyemi" / "Apex FinTech" whenever the Clerk user isn't loaded yet. | Fallback = skeleton or initials from the real user. Never a persona. |
| **A-8** | [`tenantContext.ts:L182`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/shared/auth/tenantContext.ts#L182) | In non-prod, a missing token falls back silently to `createAdminClient()` (**RLS bypass**). Safe in prod today, but one env misconfig away from a cross-tenant leak. | Remove the admin fallback from the request path entirely. Admin client allowed only in workers and scripts (lint rule: forbid importing `createAdminClient` under `src/app/api/**`). |

### 🟠 P1: Reliability and correctness
| ID | Location | Finding | Fix |
|---|---|---|---|
| **B-1** | `/api/health` (live) | **R2 storage FAILED.** `.env.local` has no `R2_*` variables at all. Policy upload, PDF ingestion, and dossier archiving will fail. | Configure `R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME` in Vercel. Check bucket CORS. Re-probe `/api/health`. |
| **B-2** | [`proxy.ts:L88-96`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/proxy.ts#L88-L96) + [`rateLimiter.ts:L150`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/shared/security/rateLimiter.ts#L150) | A rate-limiter outage takes down **every** authenticated API call (uncaught throw → plain-text 500). | Wrap the rate-limit call in `try/catch`. On Redis failure, allow the request and log at `error` level (or deny only AI-heavy routes). |
| **B-3** | [`proxy.ts:L76-85`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/proxy.ts#L76-L85) | A signed-in user with no active org is sent to `/sign-in`. Clerk sends them back, causing a **redirect loop**. | Redirect to `/onboarding` (or Clerk `<OrganizationList>` / `taskUrls`). |
| **B-4** | [`tenantContext.ts:L139-172`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/shared/auth/tenantContext.ts#L139-L172) | **Every API request** calls `currentUser()`, the Clerk Org API, and 3–4 Supabase upserts. Adds latency, risks hitting Clerk rate limits, and causes write contention. | JIT-sync once via the Clerk `organization.created` / `user.created` webhooks (or cache per session). On requests, only look up `clerk_org_id → org uuid` (cached). |
| **B-5** | Error contract | Three shapes are in use: `{error:string}`, `{success:false,error:string}`, `{success:false,error:{code,message}}`. Clients break on whichever they don't expect. | One envelope: `{ ok:false, error:{ code, message, requestId } }`, enforced by `withApi()` (§4.2). |
| **B-6** | Swallowed DB errors (onboarding, policies GET, signoff scan update, settings billing) | Supabase returns `{error}` and does not throw, so `try/catch` alone misses failures. Data loss goes unnoticed. | Helper `must(await q)` that throws an `AppError` when `error` is set. Lint for unchecked `await db.from(` calls. |
| **B-7** | [`marketing/signoff/route.ts:L81-95`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/api/marketing/signoff/route.ts#L81-L95) | Writes the audit log even if the scan update failed. The ledger then records an approval that never happened. | Run scan update + ledger insert in one Postgres RPC (transaction). Require a `scanId` that belongs to the tenant. |
| **B-8** | [`library/route.ts:L50-52`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/api/library/route.ts#L50-L52) | Loads the **entire** `regulatory_clauses` table to count rows. PostgREST caps responses at 1,000 rows, so counts are wrong and it gets slower as the table grows. | Use `regulatory_clauses(count)` as an embedded aggregate or a SQL view. |
| **B-9** | `/api/radar/sync` | Live scraping of 5 regulator sites runs inside a user's request. Will hit the serverless timeout. | Move to an Inngest cron (daily 06:00 WAT). The button sends an event and returns `202`. |
| **B-10** | [`settings/page.tsx:L78-104`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/settings/page.tsx#L78-L104) | Billing tab silently shows default values when the subscription fetch fails. | Show an error state. Never show a tier that wasn't returned by the server. |

### 🟡 P2: Hygiene before GA
- Sign-in/up fallback forms pre-fill `compliance.officer@apexfintech.ng` / `EnterprisePassword2026!` ([sign-up L28-30](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/sign-up/%5B%5B...sign-up%5D%5D/page.tsx#L28-L30)). Remove them.
- Onboarding wizard pre-selects regulators, license, rails, and products ([L41-65](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/modules/onboarding/ui/OnboardingWizard.tsx#L41-L65)). Users will submit wrong scope without noticing. Start with nothing selected.
- `alert()` used for errors (marketing attestation, onboarding). Replace with toasts or inline banners.
- Redirects are defined twice (`next.config.ts` and `proxy.ts`). Keep one.
- `rateLimiter` / `emailService` construct clients with `mock-token` / `re_mock_api_key_placeholder` when env vars are missing. Fail at boot in prod instead.
- Footer links in onboarding are `href="#"`.
- The E2E suite (`playwright`) doesn't cover the **new-tenant journey**, which is the path that broke.

---

## 4. Reference Fix Patterns

### 4.1 Client: safe fetch + empty/error states
```ts
// src/shared/http/apiFetch.ts
export class ApiError extends Error { constructor(public code: string, msg: string, public status: number) { super(msg); } }
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : { error: { code: 'NON_JSON', message: `Server error (${res.status})` } };
  if (!res.ok || body.ok === false) {
    const e = body.error ?? {};
    throw new ApiError(e.code ?? 'UNKNOWN', typeof e === 'string' ? e : e.message ?? 'Request failed', res.status);
  }
  return body.data as T;
}
```
Each data view renders exactly one of four states: `loading → error (retry) → empty (CTA) → data`. Add `src/app/(app)/error.tsx` as the route-level error boundary.

### 4.2 Server: uniform route wrapper (always JSON)
```ts
// src/shared/http/withApi.ts
export const withApi = <C>(fn: (req: NextRequest, ctx: TenantContext, c: C) => Promise<unknown>) =>
  async (req: NextRequest, c: C) => {
    const requestId = crypto.randomUUID();
    try {
      const ctx = await getTenantContext();
      return NextResponse.json({ ok: true, data: await fn(req, ctx, c) });
    } catch (err) {
      const e = err instanceof AppError ? err : new AppError({ message: 'Internal error', cause: err });
      logger.error({ requestId, code: e.code, err }, 'API failure');
      Sentry.captureException(err, { tags: { requestId } });
      return NextResponse.json({ ok: false, error: { code: e.code, message: e.message, requestId } }, { status: e.statusCode });
    }
  };
export const must = <T>({ data, error }: { data: T; error: { message: string } | null }) => {
  if (error) throw new AppError({ message: error.message, code: 'INTERNAL_SERVER_ERROR' }); return data;
};
```

### 4.3 Evaluation route (T3)
```ts
const Body = z.object({ policyId: z.string().uuid(), benchmarkDocumentVersionId: z.string().uuid() });
export const POST = withApi(async (req, ctx) => {
  const { policyId, benchmarkDocumentVersionId } = Body.parse(await req.json());
  EntitlementEngine.assertCanEvaluatePolicy(ctx.subscription);
  const policy = must(await ctx.dbClient.from('policy_documents').select('id,title,department')
    .eq('id', policyId).eq('organization_id', ctx.organizationId).maybeSingle());
  if (!policy) throw new NotFoundError('Policy', policyId);
  const { id } = must(await ctx.dbClient.from('gap_evaluations')
    .insert({ organization_id: ctx.organizationId, policy_id: policyId, status: 'QUEUED' }).select('id').single());
  await inngest.send({ name: 'gap/evaluate.requested', data: { evaluationId: id, organizationId: ctx.organizationId, benchmarkDocumentVersionId } });
  return { evaluationId: id, status: 'QUEUED' }; // client polls GET /api/gap-matrix/evaluations/:id
});
```

### 4.4 Tenant boundary (T4 hardening)
1. **Identity:** the server derives `organizationId` **only** from the Clerk session (`o.id` → `organizations.id`). Any client-sent `organizationId` is ignored or rejected.
2. **Query layer:** every tenant query adds `.eq('organization_id', ctx.organizationId)` **and** relies on RLS (two layers).
3. **RLS:** every tenant table has `ENABLE` + `FORCE ROW LEVEL SECURITY`, with `WITH CHECK (organization_id = current_org_id())` on INSERT/UPDATE. The current policies only have `USING`.
4. **Admin client:** banned from `src/app/**` by an ESLint `no-restricted-imports` rule.
5. **CI test:** create orgs A and B with JWTs → assert A cannot SELECT/UPDATE/INSERT into B's rows on every tenant table (`tests/security`).

---

## 5. Next Immediate Steps (ordered)

| Day | Action | Owner |
|---|---|---|
| **0 (today)** | Pull Vercel runtime logs for the `500`s and confirm the plain-text 500 origin. Move `instrumentation.ts` → `src/`. Wrap the proxy rate-limit call in try/catch (B-2). Configure R2 env vars (B-1). | DevOps |
| **0** | Verify the Clerk session token contains `role:"authenticated"` and `o.id`. Confirm Supabase third-party auth is linked to the **production** Clerk instance. Confirm the prod corpus is seeded (`radar_circulars`, `regulatory_*`). | Backend |
| **1** | **T4 + A-2 + A-7:** remove all persona seeds (settings, signatories, avatar fallbacks, dossier defaults). Signatory = session user. | Frontend + Backend |
| **1–2** | **T1:** add the `onboarding_completed_at` flag, proxy gate, Clerk force-redirect, and a transactional onboarding RPC that checks errors. | Full-stack |
| **2** | **A-3 / A-4 / A-5 / A-6:** remove fake licenses, fake approvals, the 100% default score, and hardcoded audit metrics. Add a `NOT_ASSESSED` state. | Backend |
| **2–3** | Add `withApi` + `must` + `apiFetch`. Migrate all 38 API routes and their callers (T2, B-5, B-6). | Full-stack |
| **3** | **T3:** remove `PRESET_*`, add UUID-validated, Inngest-backed evaluation. Move radar sync to cron (B-9). | Full-stack |
| **4** | Real Settings APIs (profile/org/team/invites via Clerk). Fix the default tab. Remove card state. | Full-stack |
| **5** | Playwright **new-tenant E2E**: sign-up → onboarding → every page shows empty/real data → upload policy → evaluate → attest → audit row appears. Plus the cross-tenant RLS test suite. **This is the release gate.** | QA |

> [!CAUTION]
> Until A-2, A-4, and A-5 ship, **disable "Board Attestation", "Bank Examiner Defense Pack", and dossier exports in production.** They currently output made-up approvals and signatories.
