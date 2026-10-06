import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditDefenseExporter } from '@/modules/marketing-shield/auditDefenseExporter';

describe('AuditDefenseExporter (Phase 1 / Task 1.5)', () => {
  const dummyOrgId = '00000000-0000-0000-0000-000000000001';
  const dummyScanId = '00000000-0000-0000-0000-000000000055';

  let mockSupabase: any;
  let exporter: AuditDefenseExporter;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'marketing_scans') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: dummyScanId,
                organization_id: dummyOrgId,
                campaign_name: 'Q3 High-Yield Savings Promo',
                channel: 'SOCIAL_INSTAGRAM',
                product_category: 'SAVINGS_DEPOSIT',
                raw_copy: 'Save and get 100% risk-free returns today!',
                compliant_rewrite_full:
                  'Save with competitive yields. Capital at risk. Licensed by the Central Bank of Nigeria. Insured by NDIC.',
                verdict: 'ISSUE_DETECTED',
                overall_risk_score: 72,
                deterministic_penalty_naira: 2500000,
                approval_status: 'APPROVED_BY_CCO',
                approved_at: '2026-10-06T10:00:00Z',
                created_at: '2026-10-06T09:30:00Z',
              },
              error: null,
            }),
          };
        }
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { name: 'Kuda Microfinance Bank' },
              error: null,
            }),
          };
        }
        if (table === 'marketing_findings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn().mockImplementation((fn: any) =>
              fn({
                data: [
                  {
                    id: 'finding-1',
                    rule_code: 'PROHIBITED_RISK_FREE',
                    flagged_text: '100% risk-free',
                    severity: 'CRITICAL',
                    finding_type: 'DETERMINISTIC_MATCH',
                    explanation: 'Elimination of risk prohibited under CBN consumer protection',
                    recommended_fix: 'Disclose risk parameters and statutory NDIC coverage',
                    statutory_citation: 'CBN Consumer Protection Framework s.4.2',
                    statutory_penalty_naira: 2000000,
                  },
                ],
                error: null,
              })
            ),
          };
        }
        if (table === 'audit_logs') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                sha256_output_hash: 'c'.repeat(64),
                metadata: {
                  reviewerName: 'Dr. Folashade Adeleke',
                  reviewerTitle: 'Chief Compliance Officer',
                  attestationNotes: 'Reconciled against BOFIA 2020 and ARCON Code 2022.',
                },
                created_at: '2026-10-06T10:00:00Z',
              },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    exporter = new AuditDefenseExporter(mockSupabase);
  });

  it('loads scan, findings, and attestation data into AuditDefensePackData', async () => {
    const data = await exporter.loadDefensePackData(dummyScanId, dummyOrgId, 'ARCON');

    expect(data.scanId).toBe(dummyScanId);
    expect(data.campaignName).toBe('Q3 High-Yield Savings Promo');
    expect(data.organizationName).toBe('Kuda Microfinance Bank');
    expect(data.findings.length).toBe(1);
    expect(data.findings[0].ruleCode).toBe('PROHIBITED_RISK_FREE');
    expect(data.ccoName).toBe('Dr. Folashade Adeleke');
    expect(data.originalDraftHash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.compliantDraftHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates ARCON defense pack HTML with Advertising Standards Panel header', async () => {
    const data = await exporter.loadDefensePackData(dummyScanId, dummyOrgId, 'ARCON');
    const html = exporter.generateHtml(data);

    expect(html).toContain('ADVERTISING REGULATORY COUNCIL OF NIGERIA (ARCON)');
    expect(html).toContain('ADVERTISING STANDARDS PANEL (ASP)');
    expect(html).toContain('Kuda Microfinance Bank');
    expect(html).toContain('COGENT CRYPTOGRAPHIC CHAIN OF CUSTODY');
    expect(html).toContain(data.originalDraftHash);
    expect(html).toContain(data.compliantDraftHash);
    expect(html).toContain('Save and get 100% risk-free returns today!');
    expect(html).toContain('Save with competitive yields');
    expect(html).toContain('Dr. Folashade Adeleke');
  });

  it('generates CBN defense pack HTML with Consumer Protection Department header', async () => {
    const data = await exporter.loadDefensePackData(dummyScanId, dummyOrgId, 'CBN');
    const html = exporter.generateHtml(data);

    expect(html).toContain('CENTRAL BANK OF NIGERIA (CBN)');
    expect(html).toContain('CONSUMER PROTECTION DEPARTMENT (CPD)');
    expect(html).toContain('CENTRAL BUSINESS DISTRICT');
    expect(html).toContain('CBN Consumer Protection Framework');
  });
});
