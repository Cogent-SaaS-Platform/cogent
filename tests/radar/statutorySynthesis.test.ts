import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { DeterministicMetadataExtractor } from '@/modules/radar/services/deterministicMetadataExtractor';
import { RoleSynthesisService, RadarRoleImpactOutputSchema } from '@/modules/radar/services/roleSynthesisService';

let mockTenantDbClient: any = null;

const createChainableQuery = (data: any = null) => {
  const queryObj: any = {
    select: () => queryObj,
    eq: () => queryObj,
    in: () => queryObj,
    order: () => queryObj,
    limit: () => queryObj,
    delete: () => queryObj,
    insert: async () => ({ error: null, data }),
    upsert: () => queryObj,
    maybeSingle: async () => ({ data, error: null }),
    single: async () => ({ data, error: null }),
  };
  return queryObj;
};

const dummyDbClient = {
  from: () => createChainableQuery(null),
} as any;

vi.mock('@/shared/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/auth')>();
  return {
    ...actual,
    getTenantContext: vi.fn().mockImplementation(async () => ({
      organizationId: 'org-test-tenant-1',
      userId: 'usr-compliance-officer-1',
      dbClient: mockTenantDbClient,
    })),
  };
});

vi.mock('@/lib/tenant/tenantContext', () => ({
  getTenantContext: vi.fn().mockImplementation(async () => ({
    organizationId: 'org-test-tenant-1',
    userId: 'usr-compliance-officer-1',
    dbClient: mockTenantDbClient,
  })),
}));

// Import route handler after vi.mock
import { GET as getBriefsRoute } from '@/app/api/radar/circulars/[id]/briefs/route';

describe('Step 2: Domain-Grounded Statutory Synthesis & Elimination of Mad-Lib Templates', () => {
  const legacyMadLibPhrases = [
    'on official notice',
    'enacted circular directive',
    'the directive mandates comprehensive operational compliance regarding',
    'failure to conform to the statutory mandates set out in this circular exposes',
    'the central bank of nigeria has enacted circular',
    'has enacted circular',
  ];

  it('A: Dynamic statutory parsing & briefs on Sanctions Directive (Asset Freeze, 24hr STR, ₦50m, Criminal Liability)', () => {
    const rawDirectivesText = `
      PURSUANT TO SECTION 13 OF THE INVESTMENTS AND SECURITIES ACT (ISA) 2007 AND BOFIA 2020 §57.
      All registered capital market operators and deposit money banks must immediately freeze without delay
      all funds, financial assets, and economic resources belonging to designated entities.
      Institutions shall file a mandatory Suspicious Transaction Report (STR) with the Nigerian Financial
      Intelligence Unit (NFIU) within 24 hours of identifying any transaction or attempted transaction.
      Failure to comply attracts statutory sanctions of not less than N50,000,000 and carries personal
      criminal liability for corporate directors and principal officers under BOFIA and ISA enactments.
    `;

    const parsed = DeterministicMetadataExtractor.parseStatutoryDirectives(rawDirectivesText);

    expect(parsed.hasAssetFreeze).toBe(true);
    expect(parsed.hasCriminalLiability).toBe(true);
    expect(parsed.fine).toBe('50,000,000');
    expect(parsed.timeframe).toBe('24 hours');
    expect(parsed.citations.length).toBeGreaterThanOrEqual(1);

    const roleSynth = new RoleSynthesisService({ dbClient: dummyDbClient });
    const fallbackOutput = roleSynth.generateDeterministicFallback({
      circular: {
        id: 'circ-sanctions-001',
        circularNumber: 'SEC/DIR/SANCTIONS/2024/01',
        regulatorCode: 'SEC',
        subject: 'Targeted Financial Sanctions Compliance and Asset Freezing Mandates',
        summary: 'Immediate asset freeze and NFIU STR filings within 24 hours for designated entities.',
        statutoryDeadline: '2024-04-15',
        rawText: rawDirectivesText,
      },
      tenant: {
        organizationId: 'org-test-tenant-1',
        organizationName: 'Continental Trust Finance',
        matchedLicenses: ['COMMERCIAL_BANK', 'SEC_REGISTERED_DIGITAL_SUB_BROKER'],
        matchedRails: ['NIBSS_NIP', 'CARD_ACQUIRING_MASTERCARD_VISA', 'DIRECT_DEBIT_ACH'],
        applicabilityReason: 'Direct license match for deposit money banks and capital market operators.',
      },
    });

    // 1. Verify schema validity
    const schemaValidation = RadarRoleImpactOutputSchema.safeParse(fallbackOutput);
    expect(schemaValidation.success).toBe(true);

    // 2. Verify all 6 roles are populated and role-differentiated
    expect(fallbackOutput.generalCounselBrief).toBeDefined();
    expect(fallbackOutput.executiveBriefCco).toBeDefined();
    expect(fallbackOutput.actionBriefCoo).toBeDefined();
    expect(fallbackOutput.technicalBriefCto).toBeDefined();
    expect(fallbackOutput.financialBriefCfo).toBeDefined();
    expect(fallbackOutput.governanceBriefCeoCro).toBeDefined();

    // 3. Verify ZERO Mad-Lib template phrases in any brief
    const allBriefsText = [
      fallbackOutput.generalCounselBrief,
      fallbackOutput.executiveBriefCco,
      fallbackOutput.actionBriefCoo,
      fallbackOutput.technicalBriefCto,
      fallbackOutput.financialBriefCfo,
      fallbackOutput.governanceBriefCeoCro,
    ].join(' ').toLowerCase();

    for (const phrase of legacyMadLibPhrases) {
      expect(allBriefsText).not.toContain(phrase);
    }

    // 4. Verify domain-specific grounded statutory content
    expect(allBriefsText).toContain('50,000,000');
    expect(allBriefsText).toContain('freeze');
    expect(allBriefsText).toContain('nfiu');
    expect(fallbackOutput.generalCounselBrief).toContain('Statutory Authority & Precedent Baseline');
    expect(fallbackOutput.technicalBriefCto).toContain('routing gateways');
    expect(fallbackOutput.financialBriefCfo).toContain('escrow');

    // 5. Verify action checklist items
    expect(fallbackOutput.actionChecklist.length).toBeGreaterThanOrEqual(3);
    expect(fallbackOutput.actionChecklist.some(a => a.targetDepartment === 'COMPLIANCE_LEGAL')).toBe(true);
    expect(fallbackOutput.actionChecklist.some(a => a.targetDepartment === 'ENGINEERING_TECH')).toBe(true);
  });

  it('B: Dynamic statutory parsing & briefs on Contactless Payments Directive (₦5,000 single, ₦30,000 daily, 2FA limits)', () => {
    const rawDirectivesText = `
      CENTRAL BANK OF NIGERIA CIRCULAR PSM/DIR/CON/01/2023.
      OPERATIONAL GUIDELINES FOR CONTACTLESS PAYMENTS IN NIGERIA.
      The Central Bank of Nigeria hereby establishes statutory limits for contactless payments:
      Transaction ceiling shall be a maximum of N5,000 per single transaction and cumulative
      daily transaction limit shall not exceed N30,000.
      Transactions exceeding these limits shall require Customer Verification Method (PIN or 2FA).
      Acquiring institutions failing to enforce these parameters shall be liable for full transaction
      chargebacks and administrative fines of not less than N10,000,000.
    `;

    const parsed = DeterministicMetadataExtractor.parseStatutoryDirectives(rawDirectivesText);

    expect(parsed.singleLimit).toBe('5,000');
    expect(parsed.dailyLimit).toBe('30,000');
    expect(parsed.fine).toBe('10,000,000');
    expect(parsed.hasTwoFactorPrompt).toBe(true);

    const roleSynth = new RoleSynthesisService({ dbClient: dummyDbClient });
    const fallbackOutput = roleSynth.generateDeterministicFallback({
      circular: {
        id: 'circ-contactless-002',
        circularNumber: 'PSM/DIR/CON/01/2023',
        regulatorCode: 'CBN',
        subject: 'Operational Guidelines for Contactless Payments in Nigeria',
        summary: 'Statutory transaction ceilings of ₦5,000 per single and ₦30,000 cumulative daily on contactless terminals.',
        statutoryDeadline: '2023-10-31',
        rawText: rawDirectivesText,
      },
      tenant: {
        organizationId: 'org-test-tenant-2',
        organizationName: 'Apex Microfinance Bank',
        matchedLicenses: ['MICROFINANCE_BANK_NATIONAL', 'PAYMENT_SOLUTION_SERVICES_PSSP'],
        matchedRails: ['AGENT_BANKING_CASH_IN_OUT', 'CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'],
        applicabilityReason: 'Direct applicability to POS acquiring and card issuing operations.',
      },
    });

    const schemaValidation = RadarRoleImpactOutputSchema.safeParse(fallbackOutput);
    expect(schemaValidation.success).toBe(true);

    // Verify domain-grounded limits in CTO and CCO briefs
    expect(fallbackOutput.technicalBriefCto).toContain('5,000');
    expect(fallbackOutput.technicalBriefCto).toContain('30,000');
    expect(fallbackOutput.technicalBriefCto).toContain('2FA');
    expect(fallbackOutput.executiveBriefCco).toContain('5,000');
    expect(fallbackOutput.executiveBriefCco).toContain('30,000');
    expect(fallbackOutput.actionBriefCoo).toContain('POS terminal');

    // Verify 0% Mad-Lib text
    const allText = [
      fallbackOutput.generalCounselBrief,
      fallbackOutput.executiveBriefCco,
      fallbackOutput.actionBriefCoo,
      fallbackOutput.technicalBriefCto,
      fallbackOutput.financialBriefCfo,
      fallbackOutput.governanceBriefCeoCro,
    ].join(' ').toLowerCase();

    for (const phrase of legacyMadLibPhrases) {
      expect(allText).not.toContain(phrase);
    }
  });

  it('C: DeterministicMetadataExtractor.generateExecutiveSynthesis eliminates Mad-Lib template output', () => {
    const synthesis = DeterministicMetadataExtractor.generateExecutiveSynthesis({
      regulatorCode: 'CBN',
      circularNumber: 'BSD/DIR/GEN/LAB/01/2024',
      subject: 'Mandatory Compliance with AML/CFT/CPF Supervisory Requirements',
      publicationDate: '2024-03-20',
      statutoryDeadline: '2024-06-30',
      targetedLicenseTypes: ['COMMERCIAL_BANK', 'MERCHANT_BANK'],
      affectedPaymentRails: ['DIRECT_DEBIT_ACH', 'NIBSS_NIP'],
      appliesUniversally: false,
    });

    expect(synthesis.executiveSummary).toBeDefined();
    expect(synthesis.executiveSummary.length).toBeGreaterThan(150);

    // Ensure none of the old Mad-Lib patterns exist
    expect(synthesis.executiveSummary).not.toMatch(/On 2024-03-20, the Central Bank of Nigeria enacted circular directive/);
    expect(synthesis.executiveSummary).not.toMatch(/The directive mandates comprehensive operational compliance regarding/);
    expect(synthesis.executiveSummary).not.toMatch(/Failure to conform to the statutory mandates set out in this circular exposes/);

    expect(synthesis.keyPoints.length).toBeGreaterThanOrEqual(4);
    expect(synthesis.departments.length).toBeGreaterThanOrEqual(3);
  });

  it('D: GET /api/radar/circulars/[id]/briefs returns structured briefs and purges legacy Mad-Lib data', async () => {
    // Mock Supabase DB Client with legacy Mad-Lib text in radar_tenant_impacts
    const mockExistingImpact = {
      id: 'impact-legacy-001',
      organization_id: 'org-test-tenant-1',
      circular_id: 'circ-legacy-001',
      executive_brief_cco: 'On official notice 2024-01-15, the Central Bank of Nigeria enacted circular directive BSD/DIR/GEN/01. The directive mandates comprehensive operational compliance regarding AML rules.',
      role_briefs: {
        executiveBriefCco: 'On official notice 2024-01-15, the Central Bank of Nigeria enacted circular directive BSD/DIR/GEN/01.',
      },
    };

    const mockCircular = {
      id: 'circ-legacy-001',
      circular_number: 'BSD/DIR/GEN/01/2024',
      subject: 'Enhanced Customer Due Diligence on Politically Exposed Persons (PEPs)',
      summary: 'Mandatory tier-3 biometric validation and annual source of wealth verification for PEP accounts.',
      issuance_date: '2024-01-15',
      statutory_deadline: '2024-07-31',
      priority: 'HIGH',
      targeted_license_types: ['COMMERCIAL_BANK'],
      affected_payment_rails: ['NIBSS_NIP'],
      applies_universally: false,
      raw_text: 'Deposit money banks must obtain senior management sign-off and verify source of wealth within 30 days. Fines of N25,000,000 apply under BOFIA 2020.',
      regulatory_document_versions: null,
    };

    const updatedImpactRecords: any[] = [];
    mockTenantDbClient = {
      from: (table: string) => {
        if (table === 'radar_circulars') {
          return createChainableQuery(mockCircular);
        }
        if (table === 'radar_tenant_impacts') {
          const q = createChainableQuery(mockExistingImpact);
          q.upsert = (record: any) => {
            updatedImpactRecords.push(record);
            return {
              select: () => ({
                single: async () => ({ data: { id: 'impact-refreshed-001', ...record }, error: null }),
              }),
            };
          };
          return q;
        }
        if (table === 'radar_action_items') {
          const q = createChainableQuery([]);
          return q;
        }
        if (table === 'tenants') {
          return createChainableQuery({
            organization_id: 'org-test-tenant-1',
            organization_name: 'Continental Trust Finance',
            license_types: ['COMMERCIAL_BANK'],
            payment_rails: ['NIBSS_NIP'],
          });
        }
        return createChainableQuery(null);
      },
    };

    const req = new NextRequest('http://localhost:3000/api/radar/circulars/circ-legacy-001/briefs');
    const response = await getBriefsRoute(req, {
      params: Promise.resolve({ id: 'circ-legacy-001' }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.roleBriefs).toBeDefined();

    // Verify legacy Mad-Lib text was purged and replaced
    expect(json.roleBriefs.executiveBriefCco).not.toContain('On official notice');
    expect(json.roleBriefs.executiveBriefCco).not.toContain('enacted circular directive');
    expect(json.roleBriefs.generalCounselBrief).toBeDefined();
    expect(json.roleBriefs.technicalBriefCto).toBeDefined();
    expect(json.roleBriefs.financialBriefCfo).toBeDefined();
  });

  it('E: Open-World Entity & Operational Event Parsing (Moniepoint workforce restructuring, US subsidiary closure, Labour Act § 20, credential de-provisioning)', () => {
    const rawArticleText = `
      NAIRAMETRICS FINANCIAL REGULATORY WIRE
      Dispatch: Moniepoint downscales US operations and realigns international workforce
      Date: 2026-10-31
      Official Link: https://nairametrics.com/article/moniepoint-us-reorganization

      Market & Policy Reporting:
      Nigerian digital banking unicorn Moniepoint announced that it has decided to downsize its workforce by approximately 50 employees and close operations of its nascent US subsidiary to streamline global operations and preserve capital reserves.
      The company confirmed that affected staff will receive statutory severance packages and career transition support.
    `;

    const parsed = DeterministicMetadataExtractor.parseStatutoryDirectives(rawArticleText);

    expect(parsed.hasRestructuringOrLayoff).toBe(true);
    expect(parsed.detectedEntities).toContain('Moniepoint');
    expect(parsed.operativeSentences.length).toBeGreaterThan(0);
    expect(parsed.operativeSentences[0]).toContain('Moniepoint announced');

    // Generate executive synthesis
    const synthesis = DeterministicMetadataExtractor.generateExecutiveSynthesis({
      regulatorCode: 'CBN',
      circularNumber: 'NM/FIN/20261031/001',
      subject: 'Moniepoint downscales US operations and realigns international workforce',
      rawText: rawArticleText,
      targetedLicenseTypes: ['PAYMENT_SERVICE_BANK'],
      affectedPaymentRails: ['NIBSS_NIP'],
      appliesUniversally: false,
    });

    expect(synthesis.executiveSummary).toContain('Moniepoint');
    expect(synthesis.executiveSummary).toContain('statutory redundancy obligations (Labour Act § 20)');
    expect(synthesis.keyPoints.some((k) => k.includes('Corporate Restructuring & Redundancy'))).toBe(true);

    // Generate multi-role briefs
    const service = new RoleSynthesisService({ dbClient: dummyDbClient });
    const briefs = service.generateDeterministicFallback({
      circular: {
        id: 'circ-open-world-001',
        circularNumber: 'NM/FIN/20261031/001',
        regulatorCode: 'CBN',
        subject: 'Moniepoint downscales US operations and realigns international workforce',
        summary: 'Moniepoint downscales US operations and realigns international workforce',
        statutoryDeadline: null,
        rawText: rawArticleText,
      },
      tenant: {
        organizationId: 'org-test-fintech',
        organizationName: 'Moniepoint MFB',
        matchedLicenses: ['PAYMENT_SERVICE_BANK'],
        matchedRails: ['NIBSS_NIP'],
        applicabilityReason: 'Direct open-world entity and workforce restructuring directive',
      },
    });

    // General Counsel: Labour Act § 20 redundancy procedures & severance
    expect(briefs.generalCounselBrief).toContain('Section 20 of the Nigerian Labour Act');
    expect(briefs.generalCounselBrief).toContain('Moniepoint');

    // CTO: Automated credential de-provisioning, revoking SSH keys and OAuth tokens within 1 hour
    const ctoBrief = briefs.technicalBriefCto || briefs.technicalBriefProductEng;
    expect(ctoBrief).toContain('de-provisioning across all corporate directories');
    expect(ctoBrief).toContain('Revoke SSH keys, OAuth tokens');

    // CFO: Severance liability modeling and Pension Reform Act compliance
    expect(briefs.financialBriefCfo).toContain('severance compensation liabilities');
    expect(briefs.financialBriefCfo).toContain('Pension Reform Act');
  });
});
