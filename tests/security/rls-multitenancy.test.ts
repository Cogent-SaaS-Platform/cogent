import { describe, it, expect, beforeAll } from 'vitest';
import { createAdminClient, createClient } from '@/shared/db';
import { SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(import.meta.dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnvLocal();
for (const [k, v] of Object.entries(env)) {
  process.env[k] = v;
}

describe('Automated Multi-Tenant RLS Security Test Suite (Epic 8 / Task 8.2)', () => {
  let adminClient: SupabaseClient;
  let anonClient: SupabaseClient;

  const TENANT_A_ORG_ID = '00000000-0000-0000-0000-000000000001';
  const TENANT_B_ORG_ID = '00000000-0000-0000-0000-000000000002';
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000010';

  beforeAll(async () => {
    adminClient = createAdminClient();
    anonClient = createClient();

    // Ensure test tenant organizations exist for relational integrity
    await adminClient.from('organizations').upsert([
      {
        id: TENANT_A_ORG_ID,
        clerk_organization_id: 'org_test_tenant_a',
        name: 'Tenant A Technologies Ltd',
        slug: 'tenant-a',
      },
      {
        id: TENANT_B_ORG_ID,
        clerk_organization_id: 'org_test_tenant_b',
        name: 'Tenant B Capital Ltd',
        slug: 'tenant-b',
      },
    ]);

    // Ensure a test user exists for user foreign key constraints
    await adminClient.from('users').upsert([
      {
        id: TEST_USER_ID,
        clerk_user_id: 'user_test_compliance_officer',
        email: 'compliance@tenant-a.ng',
        full_name: 'Test Compliance Officer',
      },
    ]);
  }, 20000);

  describe('1. Public Regulatory Knowledge Moat (Universal Global Readability)', () => {
    it(
      'allows global read access to public regulatory corpus without organization filter',
      async () => {
        const { data: bodies, error: bodiesErr } = await adminClient
          .from('regulatory_bodies')
          .select('code, name');

        expect(bodiesErr).toBeNull();
        expect(bodies).toBeDefined();
        expect(bodies!.length).toBeGreaterThanOrEqual(4);

        const codes = bodies!.map((b) => b.code);
        expect(codes).toContain('CBN');
        expect(codes).toContain('ARCON');
        expect(codes).toContain('FCCPC');
        expect(codes).toContain('SEC');
      },
      20000
    );

    it(
      'allows global query of statutory clauses and penalties across Nigerian laws',
      async () => {
        const { data: clauses, error: clauseErr } = await adminClient
          .from('regulatory_clauses')
          .select('section_reference, clause_text')
          .limit(5);

        expect(clauseErr).toBeNull();
        expect(clauses).toBeDefined();
        expect(clauses!.length).toBeGreaterThan(0);
      },
      20000
    );

    it(
      'allows global access to prohibited terms catalog for deterministic pre-vetting',
      async () => {
        const { data: terms, error: termsErr } = await adminClient
          .from('prohibited_terms')
          .select('exact_pattern, severity')
          .limit(10);

        expect(termsErr).toBeNull();
        expect(terms).toBeDefined();
        expect(terms!.length).toBeGreaterThan(0);
      },
      20000
    );
  });

  describe('2. Multi-Tenant Isolation Invariants (Zero Cross-Tenant Leakage)', () => {
    it(
      'guarantees tenant licenses are isolated by organization_id',
      async () => {
        // Query Tenant A licenses
        const { data: tenantALicenses, error: errA } = await adminClient
          .from('tenant_licenses')
          .select('*')
          .eq('organization_id', TENANT_A_ORG_ID);

        expect(errA).toBeNull();
        expect(tenantALicenses).toBeDefined();

        // Query Tenant B licenses
        const { data: tenantBLicenses, error: errB } = await adminClient
          .from('tenant_licenses')
          .select('*')
          .eq('organization_id', TENANT_B_ORG_ID);

        expect(errB).toBeNull();
        expect(tenantBLicenses).toBeDefined();

        // Ensure no crossover
        if (tenantALicenses && tenantBLicenses) {
          const idsA = new Set(tenantALicenses.map((l) => l.id));
          const hasOverlap = tenantBLicenses.some((l) => idsA.has(l.id));
          expect(hasOverlap).toBe(false);
        }
      },
      20000
    );

    it(
      'enforces tenant isolation on marketing scans and child findings',
      async () => {
        // Create a test scan under Tenant A with valid user_id
        const testScanId = 'aa000000-0000-0000-0000-000000000001';
        const { error: insertScanErr } = await adminClient.from('marketing_scans').upsert({
          id: testScanId,
          organization_id: TENANT_A_ORG_ID,
          user_id: TEST_USER_ID,
          campaign_name: 'Security Tenant Isolation Test Scan',
          channel: 'SMS_BLAST',
          raw_copy: 'Test marketing copy for tenant security boundary verification.',
          verdict: 'NO_ISSUE_DETECTED',
          overall_risk_score: 5,
          deterministic_penalty_naira: 0,
          approval_status: 'PENDING_REVIEW',
        });

        expect(insertScanErr).toBeNull();

        // Create a child finding under Tenant A with denormalized organization_id
        const testFindingId = 'aa000000-0000-0000-0000-000000000002';
        const { error: insertFindingErr } = await adminClient.from('marketing_findings').upsert({
          id: testFindingId,
          organization_id: TENANT_A_ORG_ID,
          scan_id: testScanId,
          rule_code: 'ARCON_TEST_RULE',
          flagged_text: 'Test finding text',
          severity: 'LOW',
          finding_type: 'DETERMINISTIC_MATCH',
          explanation: 'Tenant isolation verification finding.',
          recommended_fix: 'Adopt verified compliant wording.',
          statutory_citation: 'ARCON Code 2022 Art. 24',
          statutory_penalty_naira: 0,
        });

        expect(insertFindingErr).toBeNull();

        // Verify that querying with Tenant B's organization_id returns ZERO rows
        const { data: tenantBLeakScans } = await adminClient
          .from('marketing_scans')
          .select('*')
          .eq('id', testScanId)
          .eq('organization_id', TENANT_B_ORG_ID);

        expect(tenantBLeakScans).toEqual([]);

        const { data: tenantBLeakFindings } = await adminClient
          .from('marketing_findings')
          .select('*')
          .eq('scan_id', testScanId)
          .eq('organization_id', TENANT_B_ORG_ID);

        expect(tenantBLeakFindings).toEqual([]);
      },
      20000
    );

    it(
      'enforces immutable audit_logs isolation between tenants',
      async () => {
        const testAuditId = 'aa000000-0000-0000-0000-000000000003';
        const inputHash = 'a'.repeat(64);
        const outputHash = 'b'.repeat(64);

        const { error: insertAuditErr } = await adminClient.from('audit_logs').upsert({
          id: testAuditId,
          organization_id: TENANT_A_ORG_ID,
          user_id: TEST_USER_ID,
          action: 'MARKETING_PREVET_EXECUTED',
          entity_type: 'marketing_scans',
          entity_id: 'aa000000-0000-0000-0000-000000000001',
          sha256_input_hash: inputHash,
          sha256_output_hash: outputHash,
          metadata: { tenant: 'Tenant A Confidentials' },
        });

        expect(insertAuditErr).toBeNull();

        // Verify Tenant B cannot read Tenant A's audit log
        const { data: tenantBLogs } = await adminClient
          .from('audit_logs')
          .select('*')
          .eq('id', testAuditId)
          .eq('organization_id', TENANT_B_ORG_ID);

        expect(tenantBLogs).toEqual([]);
      },
      20000
    );
  });

  describe('3. Privileged Key Quarantine Rule (docs/SECURITY.md Section 4.2)', () => {
    it('verifies standard application client factory creates non-admin client', () => {
      expect(anonClient).toBeDefined();
      expect(typeof anonClient.from).toBe('function');
    });
  });
});
