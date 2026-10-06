import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getBenchmarks } from '@/app/api/gap-matrix/benchmarks/route';
import { GET as getPolicies, POST as postPolicies } from '@/app/api/gap-matrix/policies/route';
import { POST as postEvaluate } from '@/app/api/gap-matrix/evaluate/route';
import { POST as postDossier } from '@/app/api/gap-matrix/dossier/route';

describe('Pillar 3 API Routes Live Contracts (/api/gap-matrix/...)', () => {
  it('GET /api/gap-matrix/benchmarks returns statutory benchmarks', async () => {
    const req = new NextRequest('http://localhost:3000/api/gap-matrix/benchmarks');
    const response = await getBenchmarks(req);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(3);

    const first = json.data[0];
    expect(first.documentVersionId).toBeDefined();
    expect(first.regulatorCode).toBeDefined();
    expect(first.shortName).toBeDefined();
  });

  it('GET /api/gap-matrix/policies returns tenant policies array', async () => {
    const req = new NextRequest('http://localhost:3000/api/gap-matrix/policies');
    const response = await getPolicies(req);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('POST /api/gap-matrix/evaluate rejects missing parameters with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/gap-matrix/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await postEvaluate(req);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toContain('Missing required parameters');
  });

  it('POST /api/gap-matrix/dossier rejects missing evaluation result with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/gap-matrix/dossier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await postDossier(req);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toContain('Missing required parameter');
  });

  it('POST /api/gap-matrix/dossier generates valid dossier with markdown and html', async () => {
    const mockEval = {
      evaluationId: '11111111-2222-3333-4444-555555555555',
      policyId: '22222222-3333-4444-5555-666666666666',
      policyTitle: 'Apex AML Manual',
      organizationId: '00000000-0000-0000-0000-000000000001',
      benchmarkDocumentVersionId: 'bench-cbn-aml-2022',
      benchmarkTitle: 'CBN AML/CFT Regulations 2022',
      overallCompliancePercentage: 80,
      criticalGapsCount: 0,
      partiallyMetCount: 1,
      adequatelyMetCount: 2,
      totalPotentialPenaltyNaira: 2500000,
      executiveSummary: 'Statutory compliance evaluation verified.',
      analysisRunId: null,
      auditId: 'audit-api-1',
      createdAt: new Date().toISOString(),
      items: [
        {
          regulatoryClauseId: 'rc_1',
          regulatoryClauseReference: 'Regulation 14(2)',
          matchedPolicySection: 'Section 4.1',
          matchedPolicyText: 'File within 7 business days.',
          complianceStatus: 'PARTIALLY_MET',
          suggestedStatus: 'PARTIALLY_MET',
          statutoryPenaltyNaira: 2500000,
          statutoryLegalCitation: 'Section 25(2) MLA 2022',
          whatHappened: 'Policy allows 7 days; statute mandates 72 hours.',
          whatToKnow: 'NFIU enforces strict sanctions on filing delays.',
          whatHasChanged: 'MLA 2022 reduced reporting window to 72 hours.',
          whatToDo: 'Amend Section 4.1 to mandate 72-hour reporting.',
          draftReplacementLanguage: 'Section 4.1.2: All STRs must be transmitted within 72 hours.',
          derivedInsight: 'Avoids ₦2.5M fine.',
          responsibleRole: 'Chief Compliance Officer',
          statutoryRemediationTimelineDays: 14,
        },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/gap-matrix/dossier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluationResult: mockEval,
        organizationName: 'Apex Paystack FinTech Ltd',
        ccoName: 'Folake Adeyemi, Esq.',
      }),
    });

    const response = await postDossier(req);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.dossier).toBeDefined();
    expect(json.data.markdown).toBeDefined();
    expect(json.data.html).toBeDefined();

    expect(json.data.markdown).toContain('OFFICIAL REGULATORY AUDIT DEFENSE DOSSIER');
    expect(json.data.html).toContain('<!DOCTYPE html>');
    expect(json.data.html).toContain('STATUTORY CONCORDANCE AUDIT DEFENSE DOSSIER');
    expect(json.data.html).toContain(json.data.dossier.sha256VerificationHash);
  });
});
