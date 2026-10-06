# ADR-002: Modular Monolith with Next.js App Router

## Status
Accepted (Locked) — 2 October 2026

## Context
We evaluated whether to construct Cogent as distributed microservices, a separate single-page app (SPA) + standalone API service, or a Modular Monolith in Next.js App Router.

## Decision
We adopt a **Modular Monolith** architecture hosted within Next.js App Router. The codebase is organized into strict business domain modules (`src/modules/*`) that communicate via explicit service interfaces. Direct cross-module database manipulation is prohibited.

## Consequences
- **Positive:** Maximum development speed; single deployment target on Vercel; zero inter-service network latency or distributed transaction complexities; clean boundary isolation allows future extraction of individual microservices if institutional scale requires it.
- **Negative:** Heavy CPU-bound background processing cannot run indefinitely in serverless API routes. This is resolved by delegating long-running workflows to Inngest.
