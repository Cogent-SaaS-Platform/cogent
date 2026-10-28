# Stem Cogent: Master Architecture, Self-Serve Onboarding & SEO Specification

> **Document Version:** 1.3.0 (Operational Roadmap & External Setup Guide)  
> **Target Production Domain:** `https://stem-cogent.com`  
> **Status:** RATIFIED & ACTIVE  
> **Ground-Truth Source:** Verified from live production UI screenshots in `ui_reference/` (October 2026)

---

## 1. Executive Summary & Strategic Architecture

Cogent is an enterprise sovereign RegTech platform engineered for Nigerian financial institutions (Commercial Banks, MFBs, FinTechs, Payment Switches, and Asset Managers) under regulatory oversight by the **CBN, NDPC, ARCON, SEC, NFIU, and FCCPC**.

### Core Invariants

1. **Single Unified Domain (`stem-cogent.com`)**:
   Both the public marketing website and the authenticated software platform live on `https://stem-cogent.com`.
2. **Pure Self-Serve Onboarding (No Manual Admin Gate)**:
   Any fintech founder, compliance officer, or legal consultant can visit `stem-cogent.com`, click **"Start 7-Day Pilot"**, sign up, and immediately begin using the real product.
3. **Frictionless Qualification (Permitting `@gmail.com`)**:
   No enterprise procurement walls or corporate email restrictions. Users can sign up with their personal Google accounts (`@gmail.com`) or corporate emails.
4. **No Dummy Sandbox**:
   Design partners require the *real, functional platform* to test their actual compliance documents and campaigns, not a simulated sandbox. Users land straight in their own live workspace on a **7-Day Institutional Evaluation Trial**.
5. **Clean Architectural Isolation**:
   The public marketing website is kept strictly decoupled from the internal product platform code. Working on marketing pages will never pollute or tamper with core cockpits.

---

## 2. External Infrastructure Setup Guide (Step-by-Step)

Follow these exact steps across your external service dashboards to connect the domain and launch the platform:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               EXTERNAL INFRASTRUCTURE MAP                              │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────────────────┤
│ 1. HOSTINGER    │ 2. CLOUDFLARE   │ 3. VERCEL       │ 4. CLERK AUTH                     │
│ (Domain Reg)    │ (DNS & Edge WAF)│ (App Compute)   │ (Identity Gateway)                │
├─────────────────┼─────────────────┼─────────────────┼───────────────────────────────────┤
│ Point NS to     │ Proxy traffic to│ Host Next.js    │ Enable Public Self-Serve,         │
│ Cloudflare      │ Vercel (Strict) │ custom domain   │ Google OAuth (@gmail.com allowed) │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────────────────┘
```

### Step 1: Hostinger (Domain Registrar)
*Hostinger's only role is providing the registered domain name `stem-cogent.com`.*
1. Log in to your **Hostinger Dashboard** $\rightarrow$ Navigate to **Domains** $\rightarrow$ Select `stem-cogent.com`.
2. Find the **Nameservers** section.
3. Switch from Hostinger Default Nameservers to **Custom Nameservers**.
4. Enter the two Cloudflare nameservers provided by your Cloudflare account (e.g. `ns1.cloudflare.com` and `ns2.cloudflare.com`).
5. Save changes. *(Hostinger is now fully delegated to Cloudflare; you will never need to configure DNS records in Hostinger again).*

---

### Step 2: Cloudflare (DNS, Edge SSL & Security)
1. **DNS Management**:
   * Go to Cloudflare Dashboard $\rightarrow$ Select `stem-cogent.com` $\rightarrow$ **DNS** $\rightarrow$ **Records**.
   * Add a `CNAME` record:
     * **Type**: `CNAME`
     * **Name**: `@` (root)
     * **Target**: `cname.vercel-dns.com`
     * **Proxy Status**: **Proxied (Orange Cloud)** *(Enables DDoS protection and edge caching)*.
   * Add a second `CNAME` record for `www`:
     * **Type**: `CNAME`
     * **Name**: `www`
     * **Target**: `cname.vercel-dns.com`
     * **Proxy Status**: **Proxied (Orange Cloud)**.
2. **SSL/TLS Encryption Mode (CRITICAL)**:
   * Go to **SSL/TLS** $\rightarrow$ **Overview**.
   * Set encryption mode to **Full (Strict)**. *(Setting this to "Flexible" will cause infinite redirect loops with Vercel)*.
   * Under **Edge Certificates**, toggle ON **Always Use HTTPS** and **Automatic HTTPS Rewrites**.
3. **Bot & WAF Protection**:
   * Go to **Security** $\rightarrow$ **Bots**.
   * Toggle ON **Bot Fight Mode** to block automated scrapers.

---

### Step 3: Vercel (Next.js Application Hosting)
1. **Connect Custom Domain**:
   * Go to your Vercel Dashboard $\rightarrow$ Select the Cogent Project $\rightarrow$ **Settings** $\rightarrow$ **Domains**.
   * Add `stem-cogent.com` and select the recommended option to redirect `www.stem-cogent.com` to `stem-cogent.com`.
   * Vercel will verify the Cloudflare CNAME and display a green checkmark: `Valid Configuration`.
2. **Verify Environment Variables**:
   * Go to **Settings** $\rightarrow$ **Environment Variables**.
   * Ensure `NEXT_PUBLIC_APP_URL` is set to:
     ```env
     NEXT_PUBLIC_APP_URL="https://stem-cogent.com"
     ```
   * Confirm Clerk, Supabase, and Gemini API keys are populated.

---

### Step 4: Clerk (Identity & Frictionless Self-Serve)
1. **Enable Open Self-Serve Mode**:
   * In the Clerk Dashboard $\rightarrow$ Go to **User & Authentication** $\rightarrow$ **Restrictions**.
   * Set **Sign-up mode** to **Public** (Open). This allows visitors on `stem-cogent.com` to create an account immediately.
2. **Enable Google OAuth (@gmail.com allowed)**:
   * Go to **User & Authentication** $\rightarrow$ **Social Connections**.
   * Ensure **Google** is toggled **Active**. *(Allows frictionless 1-click registration for founders and compliance officers using `@gmail.com`)*.
3. **Configure Path Redirections**:
   * Go to **Paths** (or URL Configuration):
     * **Sign-in path**: `/sign-in`
     * **Sign-up path**: `/sign-up`
     * **After sign-in redirect**: `/overview`
     * **After sign-up redirect**: `/onboarding` (or `/overview`)

---

## 3. Separation of Concerns: Public Website vs. Product Platform

To keep the codebase modular, professional, and free of noise, the **Public Marketing Website** and the **Product Platform** are strictly decoupled.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CODEBASE ISOLATION MATRIX                                 │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ 1. PUBLIC MARKETING WEBSITE (Alex Led)   │ 2. PRODUCT PLATFORM COCKPITS (Untouched)    │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ Directory: src/modules/marketing-site/   │ Directories:                                │
│ Routes:                                  │ • src/modules/executive/    (/overview)     │
│ • src/app/page.tsx (Landing Homepage)    │ • src/modules/radar/        (/insight)      │
│ • src/app/pricing/page.tsx               │ • src/modules/marketing-shield/ (/marketing)│
│ • src/app/about/page.tsx                 │ • src/modules/gap-matrix/   (/gap)          │
│ • src/app/contact/page.tsx               │ • src/modules/regulatory/   (/library)      │
│ Components:                              │ • src/shared/               (Core UI & DB)  │
│ • Hero, FeatureShowcases, PricingCards   │ • Database schemas & Inngest pipelines      │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ Scope: Static presentation, SEO meta,    │ Scope: Statutory logic, deterministic rule  │
│ branding, value copy, "Start Trial" CTAs │ engines, RLS isolation, live audits         │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

### Golden Rules for Any Engineer Working on the Public Website

> [!IMPORTANT]
> **RULE 1: Follow Alex's Lead & Inputs Exclusively**  
> All design decisions, visual aesthetics, section arrangements, and copy on public marketing pages are directed by Alex. Do not add speculative marketing sections without his instruction.

> [!CAUTION]
> **RULE 2: Zero Tampering with Core Product Modules**  
> When creating or styling marketing pages, an engineer must **NEVER** edit files inside `src/modules/executive`, `src/modules/radar`, `src/modules/marketing-shield`, `src/modules/gap-matrix`, `src/modules/regulatory`, or `src/shared/auth`. The live product platform must remain completely untouched.

> [!NOTE]
> **RULE 3: Do Not Confuse `/marketing` with the Marketing Website**  
> * `/marketing` is an internal product cockpit (**Marketing Shield: Ad Pre-Vetting**).
> * The public marketing website lives on `/` (Homepage), `/pricing`, `/about`, `/contact`, and `/solutions/*`.

---

## 4. Implementation Status & Progress Tracker

### Completed Milestones
- [x] **Master Specification Documented**: Single-domain strategy on `stem-cogent.com`, self-serve pilot model, and external setup guide locked in [STEM_COGENT_MASTER_ARCHITECTURE_AND_SANDBOX_PLAN.md](file:///c:/Users/Alex%20Marco/Documents/Cogent/docs/STEM_COGENT_MASTER_ARCHITECTURE_AND_SANDBOX_PLAN.md).
- [x] **Task 1: SEO Foundation (Robots & Sitemap)**:
  - [`src/app/robots.ts`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/robots.ts): Google/Chrome crawlers explicitly allowed on public routes (`/`, `/pricing`, `/about`, `/contact`, `/features/*`) and blocked from private cockpits (`/overview`, `/insight`, `/marketing`, `/gap`, `/library`, `/settings`, `/api/*`).
  - [`src/app/sitemap.ts`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/app/sitemap.ts): Dynamic `sitemap.xml` generated for search engine indexing.
- [x] **Task 2: Edge Gateway Proxy Configured**:
  - [`src/proxy.ts`](file:///c:/Users/Alex%20Marco/Documents/Cogent/src/proxy.ts): Public marketing routes whitelisted; unauthenticated visitors viewing `/` can access the marketing landing page; authenticated sessions auto-forward to `/overview`; onboarding redirect loop protection in place.
- [x] **Compilation & Type Safety**: `npm run typecheck` passes with **0 errors**.

### Remaining Milestone: The Public Marketing Website
- [ ] **Task 3: Public Website Architecture Scaffolding**:
  - Create dedicated isolated component directory: `src/modules/marketing-site/` (e.g. `Navbar.tsx`, `Hero.tsx`, `FeaturesGrid.tsx`, `Footer.tsx`).
  - Prepare `src/app/page.tsx` as the landing root cleanly importing from `src/modules/marketing-site/`.
  - Connect CTA buttons directly to `/sign-up` ("Start 7-Day Pilot") and `/sign-in` ("Client Sign In").
