# Cogent — Production Launch Roadmap & Operations Master Index

> **Target Horizon:** Production-Ready Beta & Commercial SaaS Launch  
> **Architecture Pattern:** Zero-Ops, High-Security, Ultra-Low-Cost ($0–$3/month startup base)  
> **Infrastructure Baseline:** Google Cloud Run + Cloudflare Edge + Supabase Postgres (`pgvector`) + Cloudflare R2 + Clerk Multi-Tenant Auth + Paystack  

---

## 1. Master Architecture & Data Flow

```
                                      [ Custom Domain: Hostinger ]
                                                   │
                                     (Nameserver Delegation)
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               CLOUDFLARE EDGE (Free Tier)                              │
│  • Edge SSL/TLS Termination (Strict Full HTTPS)                                        │
│  • Global CDN Static Asset Caching                                                     │
│  • Edge DDoS Protection & WAF Rules                                                    │
│  • DNS Routing to Google Cloud Run Custom Domain Mapping                               │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ HTTPS (Encrypted)
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        GOOGLE CLOUD RUN (Frankfurt: europe-west3)                      │
│  • Multi-stage Docker Container (Next.js 16.3.8 Standalone Node.js 22 Engine)          │
│  • Auto-scaling: 0 to N instances (Scale-to-zero = $0 idle cost)                       │
│  • Next 16 `proxy.ts` Edge Gateway: Tenant Context Resolution & Role Protection        │
│  • Upstash Redis Token Bucket: API Abuse & Rate Limiting                               │
│  • Inngest Durable Execution Endpoints (/api/inngest)                                  │
└──────────────┬───────────────────────────┬───────────────────────────────┬─────────────┘
               │                           │                               │
               │ Authenticated Bearer JWT  │ S3 API Protocol               │ Event Webhooks
               ▼                           ▼                               ▼
┌───────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────┐
│  SUPABASE POSTGRESQL          │ │  CLOUDFLARE R2 BUCKET        │ │  PAYSTACK & INNGEST  │
│  (Frankfurt: eu-central-1)    │ │  (Zero-Egress Object Store)  │ │                      │
│  • 10 Modular SQL Migrations  │ │  • Regulatory Circular PDFs  │ │  • Automated Billing │
│  • `pgvector` (768d HNSW)     │ │  • Corporate Policy Files    │ │  • Webhook Signature │
│  • Native Postgres RLS        │ │  • ARCON Audit Dossiers      │ │    HMAC-SHA512 Check │
│  • Nightly Dumps to R2 ($0)   │ │  • Nightly DB Backup Dumps   │ │  • Durable Retries   │
└───────────────────────────────┘ └──────────────────────────────┘ └──────────────────────┘
```

---

## 2. Infrastructure & Tooling Matrix (Startup Cost Breakdown)

| Subsystem | Service / Tool Selected | Tier / Plan | Monthly Cost | Strategic Rationale |
|---|---|---|---|---|
| **App Hosting** | Google Cloud Run | Free Tier (2M req/mo, 360k GB-sec) | **$0.00 – $3.00** | Supports full Docker image, scale-to-zero, EU region near DB, zero idle overhead. |
| **Edge & CDN** | Cloudflare DNS & CDN | Free Tier | **$0.00** | Free SSL/TLS, edge DDoS mitigation, unlimited bandwidth. |
| **Primary Database** | Supabase PostgreSQL (`pgvector`) | Free Tier (500 MB DB) | **$0.00** | Stores >100,000 regulatory clauses/embeddings. Upgradable to Pro ($25) in 1-click once cash flowing. |
| **Blob Storage** | Cloudflare R2 | Free Tier (10 GB storage, $0 egress) | **$0.00** | Zero egress fees. Holds regulatory PDFs, uploaded policies, generated audit ZIPs, and DB dumps. |
| **Authentication** | Clerk | Free Tier (10,000 MAU) | **$0.00** | SOC 2 Type II compliant, native B2B Organizations, passwordless + MFA + session management. |
| **Rate Limiting** | Upstash Redis | Free Tier (10,000 commands/day) | **$0.00** | Serverless Redis token bucket for DDoS and endpoint abuse defense. |
| **Background Jobs** | Inngest Cloud | Free Tier (50,000 steps/mo) | **$0.00** | Serverless durable execution for Gemini embeddings, OCR chunking, and regulatory drift sync. |
| **Transactional Email**| Resend | Free Tier (3,000 emails/mo) | **$0.00** | Deliverability with DKIM/SPF/DMARC for urgent compliance alerts & invite onboarding. |
| **Billing & Payments**| Paystack | Standard Pay-as-you-go | **0% fixed** (1.5% + ₦100 per txn) | Native Nigerian / Pan-African billing engine, recurring subscriptions, card tokenization. |
| **Observability** | Sentry (`@sentry/nextjs`) | Developer Free Tier (5k errors/mo) | **$0.00** | Real-time crash alerting, Next.js instrumentation, release tracking. |
| **Uptime & Logs** | Better Stack (Better Uptime + Logs)| Free Tier (5 monitors, 1 GB logs) | **$0.00** | Status page, HTTP synthetic monitoring, automated heartbeat alerting. |
| **CI / CD Pipeline** | GitHub Actions | Free Tier (2,000 mins/mo) | **$0.00** | Automated linting, typechecking, Vitest suite, Docker build & Cloud Run deployment. |
| **Total Base Cost** | — | — | **~$0.00 – $3.00 / month** | *Zero burn rate during pre-revenue beta phase.* |

---

## 3. Seven-Phase Implementation Blueprint

Every phase has its own dedicated documentation file with comprehensive technical specifications, file paths, code contracts, acceptance criteria, and exact human-operator setup steps:

1. [PHASE A1: Infrastructure & Project Foundation](./PHASE_A1_INFRASTRUCTURE.md)
   - Git repository initialization & GitHub branch protection rules
   - Docker multi-stage containerization (`node:22-alpine` standalone)
   - Cloud Run service blueprint & IAM least privilege
   - Supabase migration version collision fix (`20261006_*`) & R2 backup runner
2. [PHASE A2: Core Identity & Security (AuthN, AuthZ & RLS)](./PHASE_A2_IDENTITY_SECURITY.md)
   - Next.js 16 migration from deprecated `middleware.ts` to `proxy.ts`
   - Hardened Clerk JWT claims integration with Supabase RLS
   - Purging insecure `createAdminClient()` fallbacks across 14 services
   - Role-Based Access Control (`org:admin`, `org:compliance_officer`, `org:viewer`)
3. [PHASE A3: Core Business Logic & API Layer Hardening](./PHASE_A3_APIS_WORKERS_INTEGRATIONS.md)
   - Upstash Redis token-bucket rate limiting middleware
   - Official Inngest SDK integration with signed webhook verification
   - Resend transactional email dispatching for regulatory deadlines
   - Cloudflare R2 S3-compatible client for documents & dossiers
   - Purging hardcoded `'Apex Paystack FinTech Ltd'` demo tenant defaults
4. [PHASE A4: Subscription & Billing Engine (Paystack)](./PHASE_A4_BILLING_SUBSCRIPTIONS.md)
   - Paystack subscription plans schema & database sync
   - Cryptographically verified webhook endpoint (`x-paystack-signature` HMAC-SHA512)
   - Idempotent webhook event ledger (`billing_events`)
   - Tenant subscription gating and feature entitlement enforcement
5. [PHASE A5: CI/CD & Automated Testing Gates](./PHASE_A5_CICD_AUTOMATED_TESTING.md)
   - Resolving 168 ESLint errors and establishing zero-warning build gates
   - Vitest unit/integration suites + Playwright end-to-end verification
   - GitHub Actions CI pipeline (`lint` -> `typecheck` -> `test` -> `build`)
   - GitHub Actions CD pipeline (Build Docker container -> Push to Google Artifact Registry -> Deploy to Cloud Run)
6. [PHASE A6: Observability, Monitoring & Logging](./PHASE_A6_OBSERVABILITY_MONITORING.md)
   - Sentry error monitoring and Next.js 16 server instrumentation
   - Better Stack logging drain & synthetic uptime monitors
   - Health check probe endpoint (`/api/health`) verifying DB, R2, and AI engine status
   - Supabase 7-day auto-pause prevention mechanism (heartbeat runner)
7. [PHASE A7: Deployment, Cutover & Launch](./PHASE_A7_DEPLOYMENT_LAUNCH.md)
   - Hostinger DNS to Cloudflare Nameserver cutover
   - Cloudflare SSL/TLS Full (Strict) configuration
   - Google Cloud Run custom domain mapping
   - Production environment secrets auditing & zero-downtime release runbook
   - Day-1 Disaster Recovery and rollback procedures

---

## 4. Execution Dependency Graph

```
 Phase A1: Git + Docker + Cloud Run + Supabase Setup
   │
   ▼
 Phase A2: Next 16 `proxy.ts` + Hardened Clerk JWT + RLS Purge
   │
   ▼
 Phase A3: Upstash Rate Limit + Inngest SDK + Resend Email + R2 Storage
   │
   ▼
 Phase A4: Paystack Billing Engine + HMAC Webhooks + Subscription Gates
   │
   ▼
 Phase A5: Lint Cleanup (168 errors) + CI/CD GitHub Actions Pipeline
   │
   ▼
 Phase A6: Sentry APM + Better Stack Logs + Keep-Alive Heartbeat
   │
   ▼
 Phase A7: Hostinger/Cloudflare DNS Cutover + SSL + Production Launch
```
