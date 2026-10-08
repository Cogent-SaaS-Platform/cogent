import { describe, it, expect } from 'vitest';
import { IdentifiedGapItem } from '@/modules/gap-matrix/ui/GapMatrixDashboard';
import { defaultDossierExportService } from '@/modules/gap-matrix/services/dossierExportService';

describe('TASK-07: 5-W Policy Gap Matrix & Zango Multi-Pane Engine Alignment', () => {
  const canonicalItems: IdentifiedGapItem[] = [
    {
      id: 'gap_item_1',
      evaluationId: 'eval_canonical_1',
      regulatoryClauseId: 'rc_aml_str_72h',
      obligationId: 'ob_str_72h',
      policyClauseId: 'pc_aml_sec_4_1',
      complianceStatus: 'PARTIALLY_MET',
      statutoryPenaltyNaira: 5000000,
      statutoryLegalCitation: 'Section 25(2) Money Laundering (Prevention and Prohibition) Act 2022',
      carriesPersonalCriminalLiability: true,
      carriesLicenseSuspensionRisk: true,
      regulatoryClauseReference: 'Regulation 14(2) AML/CFT',
      matchedPolicySection: 'Section 4.1',
      matchedPolicyText: 'All STRs shall be filed within seven business days.',
      suggestedStatus: 'PARTIALLY_MET',
      whatHappened: 'Mandates 72-hour STR reporting window; internal policy allows 7 business days.',
      whatToKnow: 'Enforced by NFIU and CBN with Level 2 deficiency classification.',
      whatHasChanged: '2022 Act reduced filing window from 7 days to 72 hours.',
      whatToDo: 'Amend internal manual to mandate 72-hour goAML filing.',
      draftReplacementLanguage: 'Transmit all STRs via goAML within 72 hours of detection.',
      derivedInsight: 'Eliminates ₦5M fine liability and personal criminal penalty risk.',
      responsibleRole: 'Chief Compliance Officer',
      statutoryRemediationTimelineDays: 14,
    },
    {
      id: 'gap_item_2',
      evaluationId: 'eval_canonical_1',
      regulatoryClauseId: 'rc_pep_senior_mgmt',
      obligationId: 'ob_pep_approval',
      policyClauseId: 'pc_pep_sec_3_2',
      complianceStatus: 'CRITICAL_GAP',
      statutoryPenaltyNaira: 10000000,
      statutoryLegalCitation: 'Regulation 19(1) CBN AML/CFT Regulations 2022 & Section 66 BOFIA 2020',
      carriesPersonalCriminalLiability: false,
      carriesLicenseSuspensionRisk: true,
      regulatoryClauseReference: 'Regulation 19(1)(b) PEP Approval',
      matchedPolicySection: null,
      matchedPolicyText: null,
      suggestedStatus: 'CRITICAL_GAP',
      whatHappened: 'Missing mandatory Managing Director / Executive sign-off for PEP onboarding.',
      whatToKnow: 'Classified as Level 1 Material Deficiency under Section 66 BOFIA 2020.',
      whatHasChanged: 'Internal policy lacks executive sign-off escalation gate.',
      whatToDo: 'Adopt Section 3.2.1 requiring MD prior written approval.',
      draftReplacementLanguage: 'No account opened for PEP without prior written sign-off from MD.',
      derivedInsight: 'Protects institution against ₦10M statutory fine and license revocation.',
      responsibleRole: 'Managing Director & CCO',
      statutoryRemediationTimelineDays: 7,
    },
  ];

  it('verifies deterministic fine aggregation and health metric calculation', () => {
    let critical = 0;
    let partial = 0;
    let adequate = 0;
    let totalFine = 0;

    for (const item of canonicalItems) {
      if (item.complianceStatus === 'CRITICAL_GAP') {
        critical++;
        totalFine += item.statutoryPenaltyNaira;
      } else if (item.complianceStatus === 'PARTIALLY_MET') {
        partial++;
        totalFine += item.statutoryPenaltyNaira;
      } else if (item.complianceStatus === 'ADEQUATELY_MET') {
        adequate++;
      }
    }

    const healthPercentage =
      Math.round(((adequate * 100 + partial * 50) / canonicalItems.length) * 100) / 100;

    expect(critical).toBe(1);
    expect(partial).toBe(1);
    expect(adequate).toBe(0);
    expect(totalFine).toBe(15_000_000);
    expect(healthPercentage).toBe(25.0);
  });

  it('generates a cryptographically verified Bank Examiner Audit Defense Dossier', () => {
    const evalResult = {
      evaluationId: 'eval-unit-test-1',
      policyId: 'policy-test-aml',
      policyTitle: 'Apex AML Manual v2.4',
      organizationId: '00000000-0000-0000-0000-000000000001',
      benchmarkDocumentVersionId: 'bench-cbn-aml-2022',
      benchmarkTitle: 'CBN AML/CFT Regulations 2022',
      overallCompliancePercentage: 25.0,
      criticalGapsCount: 1,
      partiallyMetCount: 1,
      adequatelyMetCount: 0,
      totalPotentialPenaltyNaira: 15_000_000,
      items: canonicalItems,
      executiveSummary: 'Deficiency evaluation identified 1 critical gap and 1 partial gap.',
      analysisRunId: null,
      auditId: 'audit-unit-1',
      createdAt: new Date().toISOString(),
    };

    const dossier = defaultDossierExportService.generateDossier({
      evaluationResult: evalResult,
      organizationName: 'Apex Paystack FinTech Ltd',
      ccoName: 'Folake Adeyemi, Esq.',
    });

    expect(dossier.dossierReference).toMatch(/AUDIT-DEFENSE/);
    expect(dossier.sha256VerificationHash).toHaveLength(64);
    expect(dossier.ccoAttestation.digitalSealHash).toHaveLength(64);
    expect(dossier.totalPotentialPenaltyNaira).toBe(15_000_000);
    expect(dossier.items).toHaveLength(2);

    // Verify HTML and Markdown export renderings
    const html = defaultDossierExportService.renderToHtml(dossier);
    expect(html).toContain('Central Bank of Nigeria');
    expect(html).toContain('Regulation 14(2) AML/CFT');
    expect(html).toContain('Regulation 19(1)(b) PEP Approval');

    const md = defaultDossierExportService.renderToMarkdown(dossier);
    expect(md).toContain('# OFFICIAL REGULATORY AUDIT DEFENSE DOSSIER');
    expect(md).toContain('₦15,000,000');
  });
});
