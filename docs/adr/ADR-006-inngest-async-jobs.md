# ADR-006: Serverless Background Jobs via Inngest

## Status
Accepted (Locked) — 2 October 2026

## Context
Cogent executes asynchronous tasks such as document chunking, multi-page PDF parsing, batch vector embedding, daily regulatory radar sweeps, and CCO attestation reminders. Traditional queues (BullMQ + Redis) require dedicated server instances and separate maintenance.

## Decision
We adopt **Inngest** for serverless, durable background workflow execution. Inngest steps run directly as Next.js route handlers (`/api/inngest`) with automatic checkpointing, retries, and local development emulator support.

## Consequences
- **Positive:** Zero dedicated servers or Redis instances to provision; durable step functions allow retrying individual failed AI steps without re-running entire workflows; generous free tier (25,000 runs/mo) eliminates MVP infrastructure cost.
- **Negative:** Third-party dependency on Inngest Cloud for event orchestration in production; workflows must be structured around idempotent step boundaries.
