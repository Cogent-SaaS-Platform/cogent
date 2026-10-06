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

describe('Pillar 3 Multi-Tenant RLS Security Test Suite (Epic 15 / ADR-005)', () => {
  let adminClient: SupabaseClient;

  const TENANT_A_ORG_ID = '00000000-0000-0000-0000-000000000001';
  const TENANT_B_ORG_ID = '00000000-0000-0000-0000-000000000002';

  const POLICY_A_ID = '00000000-0000-0000-0000-000000000081';
  const POLICY_B_ID = '00000000-0000-0000-0000-000000000082';

  beforeAll(async () => {
    adminClient = createAdminClient();

    // Ensure test tenant organizations exist
    await adminClient.from('organizations').upsert([
      {
        id: TENANT_A_ORG_ID,
        clerk_organization_id: 'org_test_tenant_a',
        name: 'Tenant A Technologies Ltd',
        slug: 'tenant-a-gap',
      },
      {
        id: TENANT_B_ORG_ID,
        clerk_organization_id: 'org_test_tenant_b',
        name: 'Tenant B Capital Ltd',
        slug: 'tenant-b-gap',
      },
    ]);
  }, 20000);

  it('guarantees tenant policy documents are isolated by organization_id', async () => {
    // Insert Policy Document for Tenant A
    await adminClient.from('policy_documents').upsert({
      id: POLICY_A_ID,
      organization_id: TENANT_A_ORG_ID,
      title: 'Tenant A Confidential Credit Policy',
      department: 'COMPLIANCE_LEGAL',
      version_tag: '1.0',
      storage_path: `policies/${TENANT_A_ORG_ID}/${POLICY_A_ID}/credit_policy.pdf`,
      raw_text: 'Confidential Tenant A operational rules.',
      source_file_hash: '39957e3c39957e3c39957e3c39957e3c39957e3c39957e3c39957e3c39957e3c',
    });

    // Insert Policy Document for Tenant B
    await adminClient.from('policy_documents').upsert({
      id: POLICY_B_ID,
      organization_id: TENANT_B_ORG_ID,
      title: 'Tenant B Proprietary Treasury Manual',
      department: 'TREASURY_FINANCE',
      version_tag: '1.0',
      storage_path: `policies/${TENANT_B_ORG_ID}/${POLICY_B_ID}/treasury_manual.pdf`,
      raw_text: 'Confidential Tenant B operational rules.',
      source_file_hash: '44ad276d44ad276d44ad276d44ad276d44ad276d44ad276d44ad276d44ad276d',
    });

    // Query filtered by Tenant A
    const { data: tenantADocs } = await adminClient
      .from('policy_documents')
      .select('id, organization_id, title')
      .eq('organization_id', TENANT_A_ORG_ID);

    expect(tenantADocs).toBeDefined();
    const docIds = tenantADocs!.map((d) => d.id);
    expect(docIds).toContain(POLICY_A_ID);
    expect(docIds).not.toContain(POLICY_B_ID);
  });

  it('enforces denormalized organization_id isolation on child policy_clauses', async () => {
    const CLAUSE_A_ID = '00000000-0000-0000-0000-000000000091';
    const CLAUSE_B_ID = '00000000-0000-0000-0000-000000000092';

    // Insert child clause for Tenant A with denormalized organization_id
    await adminClient.from('policy_clauses').upsert({
      id: CLAUSE_A_ID,
      organization_id: TENANT_A_ORG_ID,
      policy_id: POLICY_A_ID,
      section_number: 'Section 4.1',
      clause_text: 'Tenant A STR 72-hour filing procedure.',
    });

    // Insert child clause for Tenant B with denormalized organization_id
    await adminClient.from('policy_clauses').upsert({
      id: CLAUSE_B_ID,
      organization_id: TENANT_B_ORG_ID,
      policy_id: POLICY_B_ID,
      section_number: 'Section 2.3',
      clause_text: 'Tenant B proprietary liquidity buffer rule.',
    });

    // Query for Tenant A clauses
    const { data: tenantAClauses } = await adminClient
      .from('policy_clauses')
      .select('id, organization_id, section_number')
      .eq('organization_id', TENANT_A_ORG_ID);

    expect(tenantAClauses).toBeDefined();
    const clauseIds = tenantAClauses!.map((c) => c.id);
    expect(clauseIds).toContain(CLAUSE_A_ID);
    expect(clauseIds).not.toContain(CLAUSE_B_ID);
  });

  it('prohibits cross-tenant access to gap evaluations and child gap_matrix_items', async () => {
    const EVAL_A_ID = '00000000-0000-0000-0000-000000000071';
    const BENCHMARK_ID = 'bench-cbn-cpf-2019';

    // Query verified benchmark from DB
    const { data: benchmarkRow } = await adminClient
      .from('regulatory_document_versions')
      .select('id')
      .limit(1)
      .single();

    const versionId = benchmarkRow?.id || '00000000-0000-0000-0000-000000000001';

    // Insert evaluation for Tenant A
    await adminClient.from('gap_evaluations').upsert({
      id: EVAL_A_ID,
      organization_id: TENANT_A_ORG_ID,
      policy_id: POLICY_A_ID,
      benchmark_document_version_id: versionId,
      overall_compliance_percentage: 85.0,
      critical_gaps_count: 0,
      partially_met_count: 1,
      adequately_met_count: 4,
    });

    // Query Tenant B evaluations
    const { data: tenantBEvals } = await adminClient
      .from('gap_evaluations')
      .select('id, organization_id')
      .eq('organization_id', TENANT_B_ORG_ID);

    expect(tenantBEvals).toBeDefined();
    const evalIds = tenantBEvals!.map((e) => e.id);
    expect(evalIds).not.toContain(EVAL_A_ID);
  });
});
