/**
 * Phase 1 / Task 1.1 — Static migration contract test.
 * Verifies (without a live database) that migration 20261006000001:
 *  - creates tenant_claims_ledger and marketing_live_assets
 *  - enables RLS and binds both USING and WITH CHECK to current_org_id()
 *  - keeps SQL CHECK constraints in lockstep with the shared TS constants
 *  - is additive (never drops/alters existing objects)
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PRODUCT_CATEGORY_CODES, DRIFT_STATUSES } from '@/shared/types';

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../supabase/migrations');
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, '20261006000001_claims_ledger_and_drift.sql');
const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
// Strip line comments so assertions only examine executable SQL
const executable = sql
  .split('\n')
  .map((l) => l.replace(/--.*$/, ''))
  .join('\n');

const TENANT_TABLES = ['tenant_claims_ledger', 'marketing_live_assets'] as const;

function extractCheckList(constraintName: string): string[] {
  const re = new RegExp(`CONSTRAINT\\s+${constraintName}\\s+CHECK\\s*\\(([\\s\\S]*?)\\)\\s*\\)`, 'i');
  const match = executable.match(re);
  if (!match) throw new Error(`Constraint ${constraintName} not found`);
  return Array.from(match[1].matchAll(/'([A-Z_]+)'/g)).map((m) => m[1]);
}

describe('Migration 20261006000001 — Claims Ledger & Drift Watcher', () => {
  it('sorts after all pre-existing migrations', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    const baselineIdx = files.indexOf('20261002000004_policy_clauses_retrieval.sql');
    const migrationIdx = files.indexOf('20261006000001_claims_ledger_and_drift.sql');
    expect(migrationIdx).toBeGreaterThan(baselineIdx);
  });

  it.each(TENANT_TABLES)('creates %s with a NOT NULL organization_id FK', (table) => {
    const block = executable.match(new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\);`, 'i'));
    expect(block, `CREATE TABLE ${table}`).not.toBeNull();
    expect(block![1]).toMatch(/organization_id UUID NOT NULL REFERENCES organizations\(id\) ON DELETE CASCADE/);
  });

  it.each(TENANT_TABLES)('enables RLS on %s', (table) => {
    expect(executable).toMatch(new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`));
  });

  it.each(TENANT_TABLES)('binds USING and WITH CHECK to current_org_id() on %s', (table) => {
    const policy = executable.match(new RegExp(`CREATE POLICY \\w+ ON ${table}([\\s\\S]*?);`, 'i'));
    expect(policy, `policy on ${table}`).not.toBeNull();
    expect(policy![1]).toMatch(/FOR ALL TO authenticated/);
    expect(policy![1]).toMatch(/USING \(organization_id = current_org_id\(\)\)/);
    expect(policy![1]).toMatch(/WITH CHECK \(organization_id = current_org_id\(\)\)/);
  });

  it('keeps product_category CHECK in lockstep with PRODUCT_CATEGORY_CODES', () => {
    const sqlValues = extractCheckList('tenant_claims_ledger_product_category_chk');
    expect([...sqlValues].sort()).toEqual([...PRODUCT_CATEGORY_CODES].sort());
  });

  it('keeps drift_status CHECK in lockstep with DRIFT_STATUSES', () => {
    const sqlValues = extractCheckList('marketing_live_assets_drift_status_chk');
    expect([...sqlValues].sort()).toEqual([...DRIFT_STATUSES].sort());
  });

  it('enforces SHA-256 hex format on original_approved_hash', () => {
    expect(executable).toMatch(/original_approved_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
  });

  it('links approved_by_user_id to users (DATA_MODEL.md v1.x) rather than a free-text id', () => {
    expect(executable).toMatch(/approved_by_user_id UUID REFERENCES users\(id\)/);
  });

  it('is strictly additive — no DROP, ALTER COLUMN or policy rewrites on existing tables', () => {
    expect(executable).not.toMatch(/\bDROP\b/i);
    expect(executable).not.toMatch(/ALTER TABLE (?!tenant_claims_ledger|marketing_live_assets)\w+/i);
    expect(executable).not.toMatch(/ALTER POLICY/i);
  });
});
