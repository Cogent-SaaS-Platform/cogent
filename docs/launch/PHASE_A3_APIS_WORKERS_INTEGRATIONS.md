# Phase A3: Core Business Logic & API Layer Hardening

> **Objective:** Secure API endpoints against abuse with Upstash rate limiting, replace mock Inngest dispatchers with the official durable execution SDK, activate real Resend email delivery, integrate Cloudflare R2 file storage, and eradicate all hardcoded tenant mocks.  
> **Target Tooling:** Upstash Redis + Inngest SDK + Resend + Cloudflare R2 (`@aws-sdk/client-s3`).

---

## 1. Executive Summary & Deliverables

1. **Rate Limiting Gateway:** Implement sliding-window token bucket rate limiting on all public and API route handlers using Upstash Redis.
2. **Official Inngest SDK:** Remove hand-rolled HTTP fetch dispatcher (`src/modules/radar/inngest/client.ts`). Install the official `inngest` package and secure the `/api/inngest` webhook with signing key verification.
3. **Real Transactional Email via Resend:** Replace mock logger alerts in `radarNotificationService.ts` with real HTML emails using the official `resend` client.
4. **Cloudflare R2 Object Storage Service:** Build an S3-compatible service wrapper for uploading and presigning access to regulatory circulars, policy documents, and ARCON dossiers.
5. **Eradicate Demo Hardcoding:** Purge all occurrences of hardcoded `'Apex Paystack FinTech Ltd'` from executive summaries, replacing them with dynamic tenant lookups.

---

## 2. Technical Task Specifications (For the Coding Agent)

### Task A3.1: Upstash Redis Rate Limiting Middleware
- **Dependencies:** Install `@upstash/ratelimit` and `@upstash/redis`.
- **Target File:** `src/shared/security/rateLimiter.ts`
- **Implementation:**
  ```typescript
  import { Ratelimit } from '@upstash/ratelimit';
  import { Redis } from '@upstash/redis';

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  // Standard API: 60 requests per minute per tenant/IP
  export const standardApiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  });

  // AI-Heavy Scanning Endpoints: 10 requests per minute per tenant
  export const aiHeavyScanLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:ai',
  });
  ```
- **Integration in `src/proxy.ts` / Route Handlers:**
  Extract client IP or authenticated `orgId`. If `limit.success === false`, return `HTTP 429 Too Many Requests` with `Retry-After` header.

### Task A3.2: Official Inngest SDK Migration
- **Dependency:** Install `inngest`.
- **Target File:** `src/shared/inngest/client.ts`
  ```typescript
  import { Inngest } from 'inngest';

  export const inngest = new Inngest({
    id: 'cogent-engine',
    signingKey: process.env.INNGEST_SIGNING_KEY,
    eventKey: process.env.INNGEST_EVENT_KEY,
  });
  ```
- **Target File:** `src/app/api/inngest/route.ts`
  Replace custom JSON parsing with official Next.js App Router serve handler:
  ```typescript
  import { serve } from 'inngest/next';
  import { inngest } from '@/shared/inngest/client';
  import { circularIngestionJob } from '@/modules/radar/inngest/circularIngestionHandler';
  import { policyIngestionJob } from '@/modules/gap-matrix/inngest/policyIngestionHandler';

  export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
      circularIngestionJob,
      policyIngestionJob,
    ],
  });
  ```

### Task A3.3: Production Resend Email Delivery
- **Dependency:** Install `resend`.
- **Target File:** `src/shared/notifications/emailService.ts`
  ```typescript
  import { Resend } from 'resend';
  import { logger } from '@/shared/logger';

  const resend = new Resend(process.env.RESEND_API_KEY);

  export interface ComplianceAlertPayload {
    recipientEmail: string;
    organizationName: string;
    circularNumber: string;
    circularTitle: string;
    effectiveDate: string;
    urgencyLevel: 'CRITICAL' | 'HIGH' | 'NORMAL';
  }

  export async function sendUrgentComplianceAlert(payload: ComplianceAlertPayload): Promise<boolean> {
    try {
      const response = await resend.emails.send({
        from: 'Cogent Regulatory Alerts <alerts@yourdomain.com>',
        to: payload.recipientEmail,
        subject: `[ACTION REQUIRED] Regulatory Update: ${payload.circularNumber}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #dc2626;">Urgent Regulatory Directive Issued</h2>
            <p>Dear Compliance Officer at <strong>${payload.organizationName}</strong>,</p>
            <p>A new binding regulatory circular has been published:</p>
            <ul>
              <li><strong>Circular Ref:</strong> ${payload.circularNumber}</li>
              <li><strong>Title:</strong> ${payload.circularTitle}</li>
              <li><strong>Effective Date:</strong> ${payload.effectiveDate}</li>
            </ul>
            <p><a href="https://yourdomain.com/radar" style="display:inline-block;padding:10px 20px;background:#1e40af;color:#fff;text-decoration:none;border-radius:4px;">Open Regulatory Radar Cockpit</a></p>
          </div>
        `,
      });
      return !response.error;
    } catch (err) {
      logger.error({ err }, 'Failed to dispatch Resend email alert');
      return false;
    }
  }
  ```
- **Update:** Refactor `src/modules/radar/services/radarNotificationService.ts` to call `sendUrgentComplianceAlert`.

### Task A3.4: Cloudflare R2 Document Management Service
- **Target File:** `src/shared/storage/r2StorageService.ts`
- **Capabilities:**
  - `uploadDocument(bucket, key, fileBuffer, mimeType)`: Store PDF or ZIP artifacts in Cloudflare R2.
  - `getPresignedDownloadUrl(bucket, key, expiresInSeconds)`: Generate secure signed URLs for downloading ARCON dossiers without routing heavy binary streams through Next.js server threads.

### Task A3.5: Purging Hardcoded Demo Tenant Strings
- **Search & Replace:**
  - Replace hardcoded `'Apex Paystack FinTech Ltd'` defaults in:
    - `src/app/api/executive/overview/route.ts`
    - `src/app/api/executive/export/route.ts`
    - `src/modules/executive/services/executiveOverviewService.ts`
    - `src/modules/gap-matrix/ui/GapMatrixDashboard.tsx`
    - `src/modules/executive/ui/ExecutiveDashboard.tsx`
  - In route handlers, dynamically resolve `organizationName` directly from `tenantCtx.organizationId` via Supabase table lookup:
    ```typescript
    const { data: org } = await tenantCtx.dbClient
      .from('organizations')
      .select('name')
      .eq('id', tenantCtx.organizationId)
      .single();
    const organizationName = org?.name || 'Authorized Tenant';
    ```

---

## 3. Human-Operator Setup Guide (Your Step-by-Step Actions)

### Step 1: Upstash Redis Free Account Setup
1. Go to [Upstash Console](https://console.upstash.com/).
2. Create a new Database:
   - Name: `cogent-ratelimit-prod`
   - Region: `eu-central-1` (Frankfurt)
   - Type: **Serverless**
3. Under **REST API**, copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 2: Inngest Cloud Free Account Setup
1. Log into [Inngest Dashboard](https://app.inngest.com/).
2. Create a new application: `cogent-production`.
3. Under **Manage Keys**:
   - Copy the **Event Key** (`INNGEST_EVENT_KEY`).
   - Copy the **Signing Key** (`INNGEST_SIGNING_KEY`).
4. Set App Sync URL to: `https://yourdomain.com/api/inngest`.

### Step 3: Resend Domain Verification
1. Log into [Resend Dashboard](https://resend.com/).
2. Navigate to **Domains** -> **Add Domain** (e.g. `mail.yourdomain.com` or `yourdomain.com`).
3. Resend will provide DNS records:
   - TXT (DKIM record)
   - TXT (SPF record: `v=spf1 include:amazonses.com ~all`)
   - MX (Inbound feedback record)
4. Add these DNS records into your **Cloudflare DNS dashboard** (configured in Phase A7).
5. Generate an API Key under **API Keys** with **Sending Access**.
   - Copy `RESEND_API_KEY`.

---

## 4. Acceptance Criteria & Phase A3 Verification Checklist

- [ ] Sending >60 rapid requests to `/api/marketing/scan` triggers HTTP 429 with rate-limit headers.
- [ ] Inngest endpoint at `/api/inngest` responds to cryptographic ping from Inngest Cloud.
- [ ] Triggering an urgent regulatory alert sends an actual email delivered to inbox via Resend.
- [ ] Generating an ARCON dossier uploads the ZIP archive to Cloudflare R2 and returns a valid presigned download link.
- [ ] Zero occurrences of `'Apex Paystack FinTech Ltd'` exist in production code or responses.
