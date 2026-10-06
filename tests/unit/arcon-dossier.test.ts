import { describe, it, expect } from 'vitest';
import { ArconDossierService } from '@/modules/audit/arconDossierService';
import { MarketingShieldViewModel } from '@/shared/types/presentation';

describe('ArconDossierService (Epic 7 / Task 7.2 - Official ARCON Pre-Clearance Dossier)', () => {
  const mockViewModel: MarketingShieldViewModel = {
    title: 'QuickKash SMS Flash Campaign Pre-Vetting Report',
    verdict: 'BLOCKING_ISSUE',
    overallRiskScore: 94,
    deterministicPenaltyTotalNaira: 11500000,
    executiveSummary:
      'The submitted copy for "QuickKash SMS Flash Campaign" contains critical statutory violations under Nigerian advertising regulations. Direct prohibited promises generate an aggregate deterministic fine exposure of ₦11,500,000.',
    findings: [
      {
        id: 'fnd_1',
        ruleCode: 'ARCON-2022-CODE-ART24',
        regulatorCode: 'ARCON',
        severity: 'CRITICAL',
        findingType: 'DETERMINISTIC_MATCH',
        flaggedExcerpt: '100% guaranteed approval',
        whyItMatters:
          'Advertising a guaranteed credit or loan approval is strictly prohibited under ARCON Code 2022 Article 24.',
        statutoryCitation:
          'ARCON Code 2022 Article 24(1)(b) - Deceptive Credit Advertisements: "No advertisement for financial services shall represent or imply that credit approval is guaranteed."',
        statutoryPenaltyNaira: 5000000,
        recommendedAction: 'Adopt compliant rewrite specifying credit underwriting criteria.',
        mandatoryDisclosureRequired: 'Subject to underwriting verification and credit criteria.',
      },
    ],
    actions: [
      {
        id: 'act_1',
        title: 'Adopt Verified Compliant Rewrite',
        description: 'Replace promotional copy with pre-cleared text.',
        priority: 'CRITICAL',
        ownerDepartment: 'Marketing',
        suggestedDeadlineDays: 1,
        completed: false,
      },
    ],
    humanReviewState: {
      status: 'APPROVED_BY_CCO',
      canApprove: true,
    },
    telemetry: {
      latencyMs: 342,
      modelIdentifier: 'gemini-2.5-flash',
      verifiedAt: '2026-10-04T02:00:00.000Z',
      auditHash: '7f9c2d1b8e4a5f6e3c2b1a0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f',
    },
    channel: 'SMS_BLAST',
    originalCopy:
      'Urgent Cash Alert! Get ₦250,000 instant loan in 5 mins directly to your account! Zero interest, 100% guaranteed approval.',
    compliantRewrite:
      'Need urgent funds? Apply for up to ₦250,000 with QuickKash. Subject to underwriting approval. APR 30%. Licensed by FCCPC.',
    arconPreclearanceRequired: true,
    activeLicenseProfiles: ['FCCPC_DIGITAL_LENDER'],
  };

  it('generates compliant Markdown dossier with all required statutory sections', () => {
    const md = ArconDossierService.generateMarkdownDossier({
      viewModel: mockViewModel,
      applicantCcoName: 'Olumide Adebayo, Esq.',
      applicantCcoTitle: 'Chief Compliance Officer',
      organizationName: 'QuickKash Technologies Ltd',
    });

    expect(md).toBeDefined();
    // Verify statutory title & reference
    expect(md).toContain('ADVERTISING REGULATORY COUNCIL OF NIGERIA (ARCON)');
    expect(md).toContain('ADVERTISING STANDARDS PANEL (ASP) STATUTORY PRE-VETTING DOSSIER');
    expect(md).toContain('FORM ARCON-PV1');

    // Verify organization & license details
    expect(md).toContain('QuickKash Technologies Ltd');
    expect(md).toContain('FCCPC_DIGITAL_LENDER');

    // Verify verdict & deterministic penalties
    expect(md).toContain('BLOCKING_ISSUE');
    expect(md).toContain('₦11,500,000');

    // Verify copy comparison
    expect(md).toContain(mockViewModel.originalCopy);
    expect(md).toContain(mockViewModel.compliantRewrite);

    // Verify statutory citations
    expect(md).toContain('ARCON-2022-CODE-ART24');
    expect(md).toContain('ARCON Code 2022 Article 24(1)(b)');

    // Verify CCO attestation block
    expect(md).toContain('CHIEF COMPLIANCE OFFICER FORMAL ATTESTATION');
    expect(md).toContain('Olumide Adebayo, Esq.');
    expect(md).toContain('APPROVED_BY_CCO');

    // Verify cryptographic proof digests
    expect(md).toContain('CRYPTOGRAPHIC CHAIN OF CUSTODY');
    expect(md).toContain('Raw Copy SHA-256 Input Digest:');
    expect(md).toContain('Compliant Output SHA-256 Digest:');
    expect(md).toContain('Attestation Seal SHA-256 Digest:');
  });

  it('generates print-ready HTML dossier with institutional styling', () => {
    const html = ArconDossierService.generateHtmlDossier({
      viewModel: mockViewModel,
      applicantCcoName: 'Olumide Adebayo, Esq.',
      organizationName: 'QuickKash Technologies Ltd',
    });

    expect(html).toBeDefined();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>ARCON Pre-Clearance Dossier');
    expect(html).toContain('Advertising Regulatory Council of Nigeria (ARCON)');
    expect(html).toContain('QuickKash Technologies Ltd');
    expect(html).toContain('BLOCKING_ISSUE');
    expect(html).toContain('₦11,500,000');
    expect(html).toContain('Olumide Adebayo, Esq.');
  });
});
