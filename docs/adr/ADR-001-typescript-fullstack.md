# ADR-001: TypeScript Full-Stack Adoption

## Status
Accepted (Locked) — 2 October 2026

## Context
Cogent is a mission-critical compliance operating platform for regulated financial institutions. We require type safety across complex regulatory data structures (obligations, license types, findings, citations, audits). We evaluated a single-language TypeScript architecture versus a dual-language (Python backend + TypeScript frontend) setup.

## Decision
We adopt **TypeScript** as the single programming language across the entire application stack (frontend Next.js App Router, backend API route handlers, Inngest background workers, and shared validation schemas).

## Consequences
- **Positive:** Eliminates type mismatches across network boundaries; enables end-to-end type safety from database models to UI components; shares Zod validation schemas between API endpoints and LLM prompts; maximizes dev velocity for a nimble team.
- **Negative:** For deep numerical or ML operations, Python has more native libraries. However, because we utilize managed LLM and embedding APIs (Google Gemini `text-embedding-004`), local Python ML libraries are unnecessary.
