# ADR-003: Multi-Tenancy via Shared Database, Clerk JWT Claims, and PostgreSQL Row-Level Security (RLS)

## Status
Accepted & Hardened (v1.1) — 2 October 2026

## Context
Cogent stores sensitive institutional banking policies, marketing materials, and internal compliance gap analyses. We require absolute data isolation between competing financial institutions. In v1.0, the mapping between Clerk's organization identity and Cogent's database UUIDs was incomplete, and child tables lacked explicit RLS coverage.

## Decision
1. We enforce multi-tenancy via **Shared Database, Shared Schema** with **PostgreSQL Row-Level Security (RLS)** enabled on 100% of tenant tables and child tables.
2. The `organizations` table explicitly includes `clerk_organization_id VARCHAR(128) UNIQUE`.
3. Tenancy context is resolved directly from Clerk's JWT claims using a cached SQL helper:
   ```sql
   CREATE OR REPLACE FUNCTION current_org_id() RETURNS UUID AS $$
     SELECT id FROM organizations WHERE clerk_organization_id = (auth.jwt() ->> 'org_id') LIMIT 1;
   $$ LANGUAGE sql STABLE SECURITY DEFINER;
   ```
4. All child tables (`marketing_findings`, `policy_clauses`, `gap_matrix_items`, `ai_analysis_runs`) include a denormalized `organization_id UUID NOT NULL REFERENCES organizations(id)` to enable direct, high-performance RLS policy evaluation without expensive relational joins.
5. The Supabase `service_role` key is strictly quarantined to CI migration scripts and seed runners. Standard API endpoints execute under authenticated tenant context.

## Consequences
- **Positive:** Mathematically proves tenant isolation at the database kernel; leverages Clerk's native organization JWT tokens without custom session state; denormalized `organization_id` enables fast index lookups; child tables are immune to tenant leakage.
- **Negative:** Schema migrations must include `organization_id` and RLS policies on all child tables.
