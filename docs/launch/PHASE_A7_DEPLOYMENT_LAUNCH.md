# Phase A7: Deployment, Cutover & Launch

> **Objective:** Execute the DNS transition from Hostinger to Cloudflare, configure Cloud Run custom domain mapping with edge SSL/TLS Full (Strict), audit all production environment variables, enforce security headers, and execute the final zero-downtime launch.  
> **Target Tooling:** Hostinger Domain Registrar + Cloudflare Edge CDN/DNS + Google Cloud Run.

---

## 1. Executive Summary & Deliverables

1. **DNS Cutover (Hostinger -> Cloudflare):** Delegate nameservers from Hostinger to Cloudflare to activate edge DDoS mitigation, free TLS certificates, and edge caching.
2. **Cloud Run Custom Domain Mapping:** Route traffic from Cloudflare Edge to the Google Cloud Run service in `europe-west3`.
3. **Enterprise Security Headers:** Configure HSTS, Content Security Policy (CSP), `X-Frame-Options`, and `X-Content-Type-Options` directly in `next.config.ts`.
4. **Production Secrets Audit:** Verify that all production API keys, database credentials, and signing secrets are securely injected into Cloud Run with zero leaks.
5. **Launch Day Runbook & Rollback Protocol:** Provide exact step-by-step verification commands, smoke tests, and an instant rollback strategy in case of unexpected errors.

---

## 2. Technical Task Specifications (For the Coding Agent)

### Task A7.1: Enterprise Security Headers in `next.config.ts`
- **Target File:** `next.config.ts`
- **Implementation:**
  ```typescript
  import type { NextConfig } from "next";

  const securityHeaders = [
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'on',
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
  ];

  const nextConfig: NextConfig = {
    output: 'standalone',
    serverExternalPackages: ['pino', 'pino-pretty'],
    async headers() {
      return [
        {
          source: '/:path*',
          headers: securityHeaders,
        },
      ];
    },
  };

  export default nextConfig;
  ```

### Task A7.2: Comprehensive Production Environment Manifest
- **Target Verification:** Validate all required variables before launching:
  ```env
  # Application Core
  NODE_ENV="production"
  LOG_LEVEL="info"
  NEXT_PUBLIC_APP_URL="https://yourdomain.com"

  # Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
  CLERK_SECRET_KEY="sk_live_..."

  # Supabase Database & Vector Engine
  NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
  SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

  # Google Gemini AI Engine
  GEMINI_API_KEY="AIzaSy..."
  AI_FAST_MODEL="gemini-3.8-flash"
  AI_REASONING_MODEL="gemini-3.5-pro"
  AI_EMBEDDING_MODEL="gemini-embedding-2"

  # Cloudflare R2 Blob Storage
  R2_ACCOUNT_ID="your_cloudflare_account_id"
  R2_ACCESS_KEY_ID="your_r2_access_key"
  R2_SECRET_ACCESS_KEY="your_r2_secret_key"
  R2_BUCKET_NAME="cogent-prod-storage"

  # Inngest Serverless Workers
  INNGEST_EVENT_KEY="your_inngest_event_key"
  INNGEST_SIGNING_KEY="your_inngest_signing_key"

  # Resend Transactional Emails
  RESEND_API_KEY="re_..."

  # Upstash Redis Rate Limiting
  UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
  UPSTASH_REDIS_REST_TOKEN="your_token"

  # Paystack Billing Engine
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_live_..."
  PAYSTACK_SECRET_KEY="sk_live_..."

  # Observability
  SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
  BETTER_STACK_SOURCE_TOKEN="your_token"
  ```

---

## 3. Human-Operator Setup Guide (Your Step-by-Step Actions)

### Step 1: Delegate Hostinger Domain to Cloudflare Nameservers
1. Log into your [Hostinger Control Panel](https://hpanel.hostinger.com/).
2. Select your domain (e.g. `yourdomain.com`).
3. Click on **DNS / Nameservers**.
4. In [Cloudflare Dashboard](https://dash.cloudflare.com/):
   - Click **Add Site** -> Enter your Hostinger domain.
   - Choose the **Free Plan**.
   - Cloudflare will scan existing DNS records and present you with two assigned nameservers (e.g. `ashley.ns.cloudflare.com` and `peyton.ns.cloudflare.com`).
5. Back in Hostinger:
   - Select **Change Nameservers** -> **Use custom nameservers**.
   - Replace Hostinger nameservers with the two Cloudflare nameservers provided.
   - Save changes. (DNS propagation takes 10 to 60 minutes).

### Step 2: Configure Cloudflare SSL/TLS & Edge Security
1. In Cloudflare Dashboard for your domain:
   - Navigate to **SSL/TLS** -> Select **Full (strict)**.
   - Under **Edge Certificates**, toggle **Always Use HTTPS** to `ON`.
   - Toggle **Automatic HTTPS Rewrites** to `ON`.
   - Set **Minimum TLS Version** to `TLS 1.2`.

### Step 3: Google Cloud Run Custom Domain Mapping
1. In Google Cloud Console:
   - Navigate to **Cloud Run** -> Click on your service `cogent-web`.
   - Click **Manage Custom Domains** -> **Add Mapping**.
   - Select domain: `yourdomain.com` (and `www.yourdomain.com`).
   - Cloud Run will provide DNS resource records (either CNAME `ghs.googlehosted.com` or specific Anycast IP addresses).
2. In Cloudflare DNS:
   - Add a `CNAME` record:
     - Name: `@` (or `app`)
     - Target: `ghs.googlehosted.com`
     - Proxy status: **Proxied (Orange Cloud)**.
   - Add a `CNAME` record for `www` pointing to `@` (or direct to Google).

---

## 4. Launch Day Verification Runbook & Rollback Protocol

### Step-by-Step Smoke Test (T-0 Minutes)
1. **Health Check:**
   ```bash
   curl -I https://yourdomain.com/api/health
   # Expected: HTTP/2 200 OK
   ```
2. **Security Headers Validation:**
   ```bash
   curl -I https://yourdomain.com
   # Verify: strict-transport-security, x-frame-options: DENY, x-content-type-options: nosniff
   ```
3. **Live User Journey Test:**
   - Sign up a fresh real user on `https://yourdomain.com/sign-up`.
   - Create a test Organization in Clerk.
   - Verify user and organization automatically sync into Supabase table `organizations` and `users`.
   - Run a test Marketing Shield compliance scan against a real fintech marketing ad text.
   - Verify result is computed via Google Gemini and persisted under the active tenant.
   - Check Sentry dashboard to ensure 0 critical uncaught errors occurred.

### Instant Rollback Protocol
If an unrecoverable failure occurs post-deployment:
1. In Google Cloud Console -> **Cloud Run** -> **cogent-web** -> **Revisions**.
2. Select the previous stable revision.
3. Click **Route Traffic**:
   - Set previous revision to `100%`.
   - Click **Save**.
4. Traffic instantly shifts back in <2 seconds with zero build delays.
