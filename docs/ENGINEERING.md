# COGENT — Engineering Standards & Conventions (ENGINEERING.md)

> **Version:** 1.1.0 (Hardened Foundation)  
> **Status:** RATIFIED & LOCKED  
> **Target Audience:** All Engineers & AI Pair Programmers  
> **Key Updates in v1.1:**
> - Complete repository structure and module layout.
> - Database migration conventions via Supabase CLI.
> - Multi-environment configuration & secrets handling.
> - Automated GitHub Actions CI/CD pipeline.
> - Git branch & commit conventions.
> - AI call conventions (timeouts, exponential backoff, circuit breaking).
> - Formal Definition of Done (DoD) checklist.

---

## 1. Technology Baseline

- **Language:** TypeScript 5.5+ (Strict Mode enabled, `noImplicitAny: true`).
- **Framework:** Next.js 15+ (App Router, React 19, Server Components).
- **Styling:** Vanilla CSS / Tailwind CSS with strict utility tokens.
- **Database:** PostgreSQL 16 (Supabase) + `pgvector` + `uuid-ossp` + `pg_trgm`.
- **Authentication:** Clerk (`@clerk/nextjs`) integrated with Supabase JWT claims.
- **AI Orchestration:** Vercel AI SDK (`ai` + `@ai-sdk/google`) + Configurable Gemini Aliases.
- **Validation:** Zod 3.23+.
- **Async Processing:** Inngest SDK (`inngest`).
- **Logging:** Pino structured logger with PII redaction.
- **Testing:** Vitest (Unit/Integration/RLS) + Playwright (E2E).

---

## 2. Repository Layout & Module Boundaries

```
cogent/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, Typecheck, Vitest, RLS Security Tests
│       └── deploy.yml             # Vercel Production Release
├── docs/                          # The System Constitution & Specifications
├── supabase/
│   ├── migrations/                # Versioned SQL migrations (Supabase CLI)
│   └── seed.ts                    # Statutory corpus & prohibited terms seeder
├── src/
│   ├── app/                       # Next.js App Router (UI Routes & API Handlers)
│   │   ├── (auth)/                # Clerk Auth Pages (sign-in, sign-up, org-selection)
│   │   ├── (dashboard)/           # Protected workspace layouts
│   │   │   ├── marketing-shield/  # Pillar 1 UI
│   │   │   ├── radar/             # Pillar 2 UI
│   │   │   ├── gap-matrix/        # Pillar 3 UI
│   │   │   ├── settings/          # Org profile, license types, team RBAC
│   │   │   └── audit-log/         # Immutable audit ledger viewer
│   │   └── api/                   # Thin API entry points
│   │       ├── inngest/           # Inngest background event endpoint
│   │       └── webhooks/          # Clerk, Resend, Supabase webhooks
│   ├── modules/                   # BUSINESS DOMAINS (Modular Monolith)
│   │   ├── identity/              # Orgs, memberships, license profiles, rails
│   │   ├── regulatory/            # Regulatory corpus, circulars, clauses, embeddings
│   │   ├── marketing-shield/      # Pillar 1: Rule matchers, scans, rewrites
│   │   ├── radar/                 # Pillar 2: Circular ingestion, impact assessment
│   │   ├── gap-matrix/            # Pillar 3: Policy parsing, clause matching, 5-W
│   │   ├── audit/                 # Tamper-evident ledger, attestation compiler
│   │   └── notifications/         # Realtime events, Resend email triggers
│   ├── shared/                    # CROSS-CUTTING INFRASTRUCTURE ONLY
│   │   ├── ai-engine/             # Gemini client, prompt templates, Zod parsers
│   │   ├── db/                    # Supabase client, migrations, typed SQL helpers
│   │   ├── storage/               # Supabase Storage client (signed upload/download)
│   │   ├── logger/                # Pino structured logger with PII scrubbing
│   │   ├── errors/                # AppError domain hierarchy
│   │   └── types/                 # Shared brand types & common interfaces
│   └── emails/                    # React Email templates
├── tests/
│   ├── unit/                      # Vitest deterministic rule & validator tests
│   ├── rls/                       # Vitest multi-tenant SQL security tests
│   └── e2e/                       # Playwright browser journeys
└── inngest/                       # Inngest workflow definitions
```

---

## 3. Database Migrations Workflow

1. **Tooling:** All database changes are managed strictly using the **Supabase CLI**.
2. **File Naming Convention:** Migrations are timestamped: `supabase/migrations/<YYYYMMDDHHMMSS>_<descriptive_name>.sql`.
3. **Immutability:** Once a migration has been committed to `main` and executed on staging/production, it is **IMMUTABLE**. Schema changes must be applied via a new forward migration.
4. **RLS Migration Check:** Any new table migration **MUST** include:
   ```sql
   ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
   -- Plus the tenant_isolation_policy
   ```

---

## 4. Multi-Environment & Secrets Handling

### 4.1 Environment Tiers
- **Local (`development`):** Local Next.js dev server (`npm run dev`) + Supabase local Docker container or cloud development project.
- **Staging (`preview`):** Ephemeral Vercel preview branch deployments + Supabase Staging project.
- **Production (`production`):** Vercel Production + Supabase Production (Frankfurt `eu-central-1`).

### 4.2 Required Environment Variables (`.env.example`)
```bash
# Next.js & App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Supabase Database & Storage
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..." # QUARANTINED TO CI/SEED

# AI Engine (Google Gemini / Vertex)
GEMINI_API_KEY="AIzaSy..."
AI_FAST_MODEL="gemini-3.8-flash"
AI_REASONING_MODEL="gemini-3.5-pro"
AI_EMBEDDING_MODEL="gemini-embedding-2"

# Background Jobs & Email
INNGEST_EVENT_KEY="test"
INNGEST_SIGNING_KEY="test"
RESEND_API_KEY="re_..."
```

---

## 5. Automated CI/CD Pipeline (GitHub Actions)

On every Pull Request to `main`, GitHub Actions executes:

```
[ PR Created / Updated ]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 1: Quality Gate (< 60s)                          │
│ • ESLint & Prettier verification                       │
│ • TypeScript Typecheck (`tsc --noEmit`)                │
└──────────────────────────┬─────────────────────────────┘
                           │ PASS
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 2: Automated Test Suite (< 90s)                  │
│ • Vitest Unit Tests (Rules, Schemas, Utils)            │
│ • Vitest RLS Security Tests (Zero-Leak Verification)   │
└──────────────────────────┬─────────────────────────────┘
                           │ PASS
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 3: Vercel Preview & Playwright E2E               │
│ • Vercel builds isolated preview URL                   │
│ • Playwright executes smoke tests against preview      │
└──────────────────────────┬─────────────────────────────┘
                           │ MERGE TO MAIN
                           ▼
┌────────────────────────────────────────────────────────┐
│ Stage 4: Production Release                            │
│ • Zero-downtime deployment to Vercel Production        │
│ • Inngest functions synchronized                       │
└────────────────────────────────────────────────────────┘
```

---

## 6. AI Call Conventions & Resilience

1. **Strict Timeouts:** 
   - `FAST_MODEL` calls: 5-second hard timeout.
   - `REASONING_MODEL` calls: 15-second hard timeout.
2. **Exponential Backoff:** Transient network errors (HTTP 429, 503) retry up to 3 times with exponential jitter (1s, 2s, 4s).
3. **Traceability Guarantee:** Every AI invocation must write to `ai_analysis_runs` before returning results to the client.
4. **Circuit Breaking:** If Gemini error rates exceed 15% over a 2-minute rolling window, the circuit breaker opens and informs the user immediately rather than hanging on retries.

---

## 7. Definition of Done (DoD) Checklist

A task is only marked **DONE** when all criteria are satisfied:
- [ ] Code is written in strict TypeScript with zero `any` or loose types.
- [ ] All API boundaries and AI outputs are validated using Zod schemas.
- [ ] RLS policies are active on any modified or created database tables.
- [ ] Deterministic rules have 100% unit test coverage in Vitest.
- [ ] Automated RLS tests confirm zero cross-tenant data leakage.
- [ ] Pino logger records structured metadata without leaking PII or raw copy.
- [ ] `npm run build` succeeds cleanly without errors or warnings.
- [ ] Task acceptance criteria in `BACKLOG.md` are verified and demonstrated.
