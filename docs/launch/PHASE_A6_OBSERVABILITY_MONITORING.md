# Phase A6: Observability, Monitoring & Logging

> **Objective:** Implement real-time error tracking with Sentry, structured log centralization with Better Stack, server health probes (`/api/health`), and an automated Supabase keep-alive runner to prevent 7-day auto-pausing.  
> **Target Tooling:** Sentry (`@sentry/nextjs`) + Better Stack (Logs & Better Uptime) + Next.js Instrumentation.

---

## 1. Executive Summary & Deliverables

1. **Error Tracking & Crash Alerting:** Integrate Sentry into Next.js 16 to capture uncaught frontend exceptions, server action failures, and API route 500 errors.
2. **Centralized Log Streaming:** Route structured JSON logs from `pino` into Better Stack via HTTPS transport, preserving request trace IDs across asynchronous Inngest flows.
3. **Synthetic Uptime Monitoring:** Deploy `/api/health` checking connectivity to PostgreSQL, Cloudflare R2, and Google Gemini API, monitored 24/7 by Better Uptime.
4. **Supabase Auto-Pause Prevention:** Configure a scheduled heartbeat ping (via GitHub Actions Cron or Inngest Cron) to execute a lightweight database query every 24 hours, ensuring the Supabase free project never pauses.

---

## 2. Technical Task Specifications (For the Coding Agent)

### Task A6.1: Sentry Next.js 16 Instrumentation
- **Dependencies:** Install `@sentry/nextjs`.
- **Target Files:**
  - `sentry.client.config.ts`: Frontend client crash reporting with session replay for reproduction.
  - `sentry.server.config.ts`: Server-side API handler tracing.
  - `instrumentation.ts`: Next.js 16 native instrumentation hook registering Sentry on container cold boot:
    ```typescript
    export async function register() {
      if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
      }
    }
    ```
- **Configuration:** Enable tracing sample rate at `0.1` (10% of transactions) to remain well within free tier limits.

### Task A6.2: Structured Log Shipping with Better Stack
- **Target File:** `src/shared/logger/index.ts`
- **Enhancement:**
  When `BETTER_STACK_SOURCE_TOKEN` is present in the environment, attach a secure HTTPS log transport stream to our existing `pino` logger:
  ```typescript
  import pino from 'pino';

  const isProduction = process.env.NODE_ENV === 'production';
  const token = process.env.BETTER_STACK_SOURCE_TOKEN;

  export const logger = pino({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    transport: token
      ? {
          target: '@logtail/pino',
          options: { sourceToken: token },
        }
      : !isProduction
      ? { target: 'pino-pretty' }
      : undefined,
  });
  ```

### Task A6.3: Comprehensive Health Check Endpoint
- **Target File:** `src/app/api/health/route.ts`
- **Verification Routine:**
  ```typescript
  import { NextResponse } from 'next/server';
  import { createAdminClient } from '@/shared/db';

  export async function GET() {
    const startTime = Date.now();
    const checks: Record<string, 'OK' | 'FAILED'> = {};

    // 1. Check Supabase Postgres
    try {
      const db = createAdminClient();
      const { error } = await db.from('organizations').select('id').limit(1);
      checks.database = error ? 'FAILED' : 'OK';
    } catch {
      checks.database = 'FAILED';
    }

    // 2. Check AI Engine Environment
    checks.gemini = process.env.GEMINI_API_KEY ? 'OK' : 'FAILED';

    const isHealthy = Object.values(checks).every((status) => status === 'OK');
    const latencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: isHealthy ? 'HEALTHY' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        latencyMs,
        checks,
      },
      { status: isHealthy ? 200 : 503 }
    );
  }
  ```

### Task A6.4: Supabase 7-Day Auto-Pause Prevention (Heartbeat)
- **Target File:** `.github/workflows/db-heartbeat.yml`
- **Schedule:** Run daily at `04:00 UTC` using GitHub Actions Scheduled Cron:
  ```yaml
  name: Supabase Database Heartbeat

  on:
    schedule:
      - cron: '0 4 * * *' # Executes daily at 4:00 AM UTC
    workflow_dispatch:

  jobs:
    ping-database:
      runs-on: ubuntu-latest
      steps:
        - name: Keep-Alive Database Query
          env:
            SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
            SUPABASE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          run: |
            curl -f -X GET "${SUPABASE_URL}/rest/v1/organizations?select=id&limit=1" \
              -H "apikey: ${SUPABASE_KEY}" \
              -H "Authorization: Bearer ${SUPABASE_KEY}"
  ```

---

## 3. Human-Operator Setup Guide (Your Step-by-Step Actions)

### Step 1: Sentry Project Setup
1. Log into [Sentry](https://sentry.io/).
2. Create a new Project:
   - Platform: **Next.js**
   - Project name: `cogent-production`
3. Copy the **DSN** (`https://xxx@xxx.ingest.sentry.io/xxx`).
4. Add to Vercel environment variables as `SENTRY_DSN`.

### Step 2: Better Stack (Logs & Uptime) Setup
1. Log into [Better Stack](https://betterstack.com/).
2. Under **Logs**:
   - Click **Sources** -> **Connect source** -> Select **Node.js (Pino)** or **Vercel Integration**.
   - Name: `cogent-production-logs`.
   - Copy the **Source Token** (`BETTER_STACK_SOURCE_TOKEN`).
3. Under **Better Uptime**:
   - Click **Monitors** -> **Create Monitor**.
   - URL: `https://yourdomain.com/api/health`
   - Check interval: **Every 3 minutes**.
   - Alert channels: Your Email & SMS / WhatsApp (free tier includes email/push notifications).
   - Set up your Public Status Page (e.g. `status.yourdomain.com`).

---

## 4. Acceptance Criteria & Phase A6 Verification Checklist

- [ ] Deliberately thrown test exception in client code surfaces in Sentry dashboard within 60 seconds.
- [ ] Application logs generated during scans stream into Better Stack searchable dashboard.
- [ ] Visiting `/api/health` returns `200 OK` with latency metrics and sub-service checks.
- [ ] Better Uptime monitor receives consecutive 200 responses from `/api/health`.
- [ ] Daily Supabase heartbeat workflow executes successfully in GitHub Actions.
