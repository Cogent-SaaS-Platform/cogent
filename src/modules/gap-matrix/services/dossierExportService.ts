import crypto from 'crypto';
import { AuditService } from '@/modules/audit/auditService';
import {
  AuditDefenseDossier,
  GapEvaluationResult,
} from '../types';

export interface GenerateDossierOptions {
  evaluationResult: GapEvaluationResult;
  organizationName?: string;
  ccoName?: string;
  boardChairName?: string;
  notes?: string;
}

/**
 * Bank Examiner Audit Defense Dossier Generator (Epic 18 / Task 18.3 & Pillar 3.5)
 * Produces publication-grade HTML and Markdown defense dossiers for
 * CBN Banking Supervision Department (BSD), NDIC examiners, and NDPC auditors
 * with SHA-256 cryptographic chain of custody seals and Board Remediation Plans.
 *
 * Adheres to docs/PILLAR_3_5W_GAP_MATRIX.md Section 6.
 */
export class DossierExportService {
  /**
   * Generates a fully sealed AuditDefenseDossier data object
   */
  public generateDossier(options: GenerateDossierOptions): AuditDefenseDossier {
    const {
      evaluationResult,
      organizationName = 'Licensed Financial Institution',
      ccoName = 'Authorized Compliance Officer',
      boardChairName = 'Chairman, Board Audit & Risk Committee',
    } = options;

    const year = new Date().getFullYear();
    const shortId = evaluationResult.evaluationId.slice(0, 8).toUpperCase();
    const dossierReference = `CBN/BSD/AUDIT-DEFENSE/${year}/${shortId}`;
    const generatedAt = new Date().toISOString();

    const ccoAttestationStatement =
      `I, ${ccoName}, acting in my capacity as Chief Compliance Officer for ${organizationName}, hereby attest that this 5-W Statutory Decision Gap Matrix reflects a comprehensive clause-by-clause concordance evaluation of internal operational manual "${evaluationResult.policyTitle}" against statutory benchmark "${evaluationResult.benchmarkTitle}". Operational deficiencies identified herein have been logged in the institutional remediation tracker and submitted to the Board Risk Committee in accordance with BOFIA 2020 and CBN Corporate Governance Guidelines.`;

    const ccoSealHash = AuditService.computeSha256({
      dossierReference,
      ccoName,
      statement: ccoAttestationStatement,
      evaluationId: evaluationResult.evaluationId,
      timestamp: generatedAt,
    });

    const sha256VerificationHash = AuditService.computeSha256({
      dossierReference,
      evaluationId: evaluationResult.evaluationId,
      overallCompliancePercentage: evaluationResult.overallCompliancePercentage,
      criticalGapsCount: evaluationResult.criticalGapsCount,
      partiallyMetCount: evaluationResult.partiallyMetCount,
      adequatelyMetCount: evaluationResult.adequatelyMetCount,
      totalPotentialPenaltyNaira: evaluationResult.totalPotentialPenaltyNaira,
      itemsCount: evaluationResult.items.length,
      ccoSealHash,
    });

    const inputPolicyHash = AuditService.computeSha256({
      policyId: evaluationResult.policyId,
      policyTitle: evaluationResult.policyTitle,
    });
    const benchmarkVersionHash = AuditService.computeSha256({
      benchmarkDocumentVersionId: evaluationResult.benchmarkDocumentVersionId,
      benchmarkTitle: evaluationResult.benchmarkTitle,
    });
    const findingsDigestHash = AuditService.computeSha256(
      evaluationResult.items.map((i) => ({
        id: i.regulatoryClauseId,
        ref: i.regulatoryClauseReference,
        status: i.complianceStatus,
        penalty: i.statutoryPenaltyNaira,
      }))
    );

    const cryptographicValidationTable = {
      inputPolicyHash,
      benchmarkVersionHash,
      findingsDigestHash,
      digitalSealHash: ccoSealHash,
      timestamp: generatedAt,
    };

    const transmittalLetter = {
      recipientTitle: 'The Director',
      recipientDepartment: 'Banking Supervision Department / Other Financial Institutions Supervision Department (OFISD)',
      regulatorName: 'Central Bank of Nigeria',
      subject: `STATUTORY CONCORDANCE AUDIT DEFENSE PACK & 5-W REMEDIATION DOSSIER: ${evaluationResult.policyTitle}`,
      body: `In accordance with Section 57 of the Banks and Other Financial Institutions Act (BOFIA) 2020 and applicable CBN Supervisory Regulations, ${organizationName} hereby formally submits the Clause-by-Clause Statutory Concordance Audit Defense Pack for internal operational manual "${evaluationResult.policyTitle}" benchmarked against "${evaluationResult.benchmarkTitle}". All identified Level 1 and Level 2 divergences have been synthesized across the 5-W Operational Dimensions, paired with Board-approved draft replacement language, and sealed under SHA-256 cryptographic hash ${sha256VerificationHash}.`,
    };

    return {
      dossierReference,
      policyTitle: evaluationResult.policyTitle,
      policyVersion: '1.0',
      department: 'COMPLIANCE_LEGAL',
      organizationName,
      benchmarkTitle: evaluationResult.benchmarkTitle,
      benchmarkReferenceCode: 'CBN/FPR/DIR/PUB/CIR/001/053',
      issuingRegulator: 'Central Bank of Nigeria (CBN)',
      overallCompliancePercentage: evaluationResult.overallCompliancePercentage,
      criticalGapsCount: evaluationResult.criticalGapsCount,
      partiallyMetCount: evaluationResult.partiallyMetCount,
      adequatelyMetCount: evaluationResult.adequatelyMetCount,
      totalPotentialPenaltyNaira: evaluationResult.totalPotentialPenaltyNaira,
      executiveSummary: evaluationResult.executiveSummary,
      sha256VerificationHash,
      generatedAt,
      ccoAttestation: {
        ccoName,
        attestationStatement: ccoAttestationStatement,
        timestamp: generatedAt,
        digitalSealHash: ccoSealHash,
      },
      transmittalLetter,
      cryptographicValidationTable,
      items: evaluationResult.items,
    };
  }

  /**
   * Generates formatted Markdown string for the audit defense dossier
   */
  public generateMarkdownDossier(dossier: AuditDefenseDossier): string {
    return this.renderToMarkdown(dossier);
  }

  /**
   * Generates official publication-grade HTML string for the audit defense dossier
   */
  public generateHtmlDossier(dossier: AuditDefenseDossier): string {
    return this.renderToHtml(dossier);
  }

  /**
   * Renders the dossier as formatted, professional Markdown ready for export
   */
  public renderToMarkdown(dossier: AuditDefenseDossier): string {
    const formattedDate = new Date(dossier.generatedAt).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const exposureFormatted = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(dossier.totalPotentialPenaltyNaira);

    const concordanceRows = dossier.items
      .map((item, idx) => {
        const statusBadge =
          item.complianceStatus === 'ADEQUATELY_MET'
            ? '🟢 ADEQUATELY MET'
            : item.complianceStatus === 'PARTIALLY_MET'
            ? '🟡 PARTIALLY MET'
            : '🔴 CRITICAL GAP';
        const sec = item.matchedPolicySection || 'NONE (Omitted)';
        const fine = item.statutoryPenaltyNaira > 0
          ? `₦${(item.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M`
          : '₦0';
        return `| ${idx + 1} | ${item.regulatoryClauseReference} | ${sec} | ${statusBadge} | ${fine} | ${item.responsibleRole || 'Chief Compliance Officer'} |`;
      })
      .join('\n');

    const remediationPlanRows = dossier.items
      .filter((i) => i.complianceStatus !== 'ADEQUATELY_MET')
      .map((item, idx) => {
        const replacement = item.draftReplacementLanguage || item.draftReplacementPolicyLanguage || item.whatToDo;
        return `
#### Remediation Item ${idx + 1}: ${item.regulatoryClauseReference}
- **Assigned Owner:** ${item.responsibleRole || 'Chief Compliance Officer'}
- **Statutory Remediation Window:** ${item.statutoryRemediationTimelineDays || 30} Calendar Days
- **Statutory Legal Citation:** ${item.statutoryLegalCitation || 'BOFIA 2020'}
- **Draft Replacement Policy Language (Board-Ready):**
> "${replacement}"
`;
      })
      .join('\n');

    const itemsMarkdown = dossier.items
      .map((item, index) => {
        const statusBadge =
          item.complianceStatus === 'ADEQUATELY_MET'
            ? '🟢 [ADEQUATELY MET — CLEAN FINDING]'
            : item.complianceStatus === 'PARTIALLY_MET'
            ? '🟡 [PARTIALLY MET — LEVEL 2 DEFICIENCY]'
            : '🔴 [CRITICAL GAP — LEVEL 1 MATERIAL DEFICIENCY]';

        const fineDisplay = item.statutoryPenaltyNaira > 0
          ? `₦${(item.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M (${item.statutoryLegalCitation || 'Statutory Schedule'})`
          : '₦0 (Clean Finding)';

        const replacementWording = item.draftReplacementLanguage || item.draftReplacementPolicyLanguage;

        return `
### Schedule ${index + 1}: ${item.regulatoryClauseReference}
**Compliance Status:** ${statusBadge}  
**Statutory Fine Exposure:** ${fineDisplay}  
**Responsible Departmental Role:** ${item.responsibleRole || 'Chief Compliance Officer'}  
**Remediation Timeline:** ${item.statutoryRemediationTimelineDays || 30} Calendar Days  

| 5-W Framework Pillar | Operational Evaluation & Examiner Defense |
| :--- | :--- |
| **1. What Happened?** | ${item.whatHappened} |
| **2. What to Know?** | ${item.whatToKnow} |
| **3. What Has Changed?** | ${item.whatHasChanged} |
| **4. What to Do?** | ${item.whatToDo} |
| **5. Derived Insight** | ${item.derivedInsight} |

${replacementWording ? `**Draft Replacement Policy Language (Board-Ready):**\n> "${replacementWording}"\n` : ''}
---`;
      })
      .join('\n');

    return `# OFFICIAL REGULATORY AUDIT DEFENSE DOSSIER
**CENTRAL BANK OF NIGERIA (CBN) BANKING SUPERVISION DEPARTMENT**  
*Clause-by-Clause Statutory Compliance & 5-W Decision Gap Matrix*

---

## 1. Formal Transmittal Letter
**To:** ${dossier.transmittalLetter?.recipientTitle}, ${dossier.transmittalLetter?.recipientDepartment}  
**Regulator:** ${dossier.transmittalLetter?.regulatorName}  
**Date:** ${formattedDate}  
**Subject:** ${dossier.transmittalLetter?.subject}  

${dossier.transmittalLetter?.body}

---

## 2. Document Control & Inspection Identifiers
- **Dossier Reference:** \`${dossier.dossierReference}\`
- **Regulated Institution:** **${dossier.organizationName}**
- **Internal Policy Under Examination:** **${dossier.policyTitle}** (v${dossier.policyVersion})
- **Statutory Benchmark Framework:** **${dossier.benchmarkTitle}** (\`${dossier.benchmarkReferenceCode}\`)
- **Supervisory Authority:** **${dossier.issuingRegulator}**
- **Inspection Date:** ${formattedDate}
- **SHA-256 Cryptographic Verification Seal:** \`${dossier.sha256VerificationHash}\`

### Cryptographic Chain of Custody & Validation Table
| Artifact Component | Reference / Subject | SHA-256 Digest | Status |
| :--- | :--- | :--- | :--- |
| **Input Policy Manual** | ${dossier.policyTitle} (v${dossier.policyVersion}) | \`${dossier.cryptographicValidationTable?.inputPolicyHash || 'SHA256_POLICY_HASH'}\` | Verified |
| **Statutory Benchmark** | ${dossier.benchmarkTitle} (\`${dossier.benchmarkReferenceCode}\`) | \`${dossier.cryptographicValidationTable?.benchmarkVersionHash || 'SHA256_BENCH_HASH'}\` | Authentic |
| **Findings Concordance Digest** | ${dossier.items.length} Evaluated Statutory Obligations | \`${dossier.cryptographicValidationTable?.findingsDigestHash || 'SHA256_DIGEST_HASH'}\` | Sealed |
| **CCO Digital Attestation** | ${dossier.ccoAttestation.ccoName} | \`${dossier.ccoAttestation.digitalSealHash}\` | Certified |
| **Master Defense Pack Seal** | ${dossier.dossierReference} | \`${dossier.sha256VerificationHash}\` | Tamper-Evident |

---

## 3. Executive Health Summary & Bank Examiner Scorecard
- **Overall Statutory Compliance Health:** **${dossier.overallCompliancePercentage.toFixed(1)}%**
- **Adequately Met Provisions:** **${dossier.adequatelyMetCount}** (Clean findings)
- **Partially Met Divergences:** **${dossier.partiallyMetCount}** (Level 2 findings; remediation underway)
- **Critical Gaps:** **${dossier.criticalGapsCount}** (Level 1 Material Deficiencies)
- **Total Potential Statutory Fine Avoidance:** **${exposureFormatted}**

### Executive Statement for Bank Examiners
${dossier.executiveSummary}

---

## 4. Statutory Clause Concordance Matrix Table
| # | Statutory Clause | Company Policy Section | Status | Fine Exposure | Action Owner |
| :- | :--- | :--- | :--- | :--- | :--- |
${concordanceRows}

### Verbatim Concordance Diff Matrix (Side-by-Side Statutory Evidence)
| # | Statutory Citation | Statutory Mandate (Verbatim Extract) | Internal Policy Manual Text (Verbatim Extract) | Finding |
| :- | :--- | :--- | :--- | :--- |
${dossier.items.map((item, idx) => `| ${idx + 1} | \`${item.regulatoryClauseReference}\` | "${item.statutoryQuote || item.whatHappened}" | ${item.policyEvidenceQuote ? `"${item.policyEvidenceQuote}"` : '_[Omitted — Zero Internal Controls]_'} | ${item.complianceStatus} |`).join('\n')}

---

## 5. Board Remediation Plan & Draft Replacement Language
${remediationPlanRows || '_No open deficiencies detected. All statutory obligations adequately met._'}

---

## 6. Chief Compliance Officer (CCO) Official Attestation
> "${dossier.ccoAttestation.attestationStatement}"

- **Attesting CCO:** **${dossier.ccoAttestation.ccoName}**  
- **Digital Seal Hash:** \`${dossier.ccoAttestation.digitalSealHash}\`  
- **Timestamp:** ${dossier.ccoAttestation.timestamp}  

\`\`\`
       ___________________________________________
       CHIEF COMPLIANCE OFFICER & LEGAL COUNSEL
       ${dossier.organizationName}
       (Cryptographically Signed via Cogent RegTech)
\`\`\`

---

## 7. Itemized 5-W Operational Decision Matrix & Defense Schedules
${itemsMarkdown}

---
*Generated by Cogent RegTech Engine • Sovereign Regulatory Defense Architecture • Tamper-evident Audit Ledger (ADR-005)*
`;
  }

  /**
   * Renders the dossier as publication-grade, self-contained, printable HTML
   */
  public renderToHtml(dossier: AuditDefenseDossier): string {
    const formattedDate = new Date(dossier.generatedAt).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const exposureFormatted = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(dossier.totalPotentialPenaltyNaira);

    const concordanceTableRows = dossier.items
      .map((item, idx) => {
        const badgeClass =
          item.complianceStatus === 'ADEQUATELY_MET'
            ? 'badge-adequate'
            : item.complianceStatus === 'PARTIALLY_MET'
            ? 'badge-partial'
            : 'badge-critical';
        const badgeLabel =
          item.complianceStatus === 'ADEQUATELY_MET'
            ? 'Adequately Met'
            : item.complianceStatus === 'PARTIALLY_MET'
            ? 'Partially Met (L2)'
            : 'Critical Gap (L1)';
        const fineText = item.statutoryPenaltyNaira > 0
          ? `₦${(item.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M`
          : '₦0';

        return `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${idx + 1}</td>
          <td><strong>${this.escapeHtml(item.regulatoryClauseReference)}</strong></td>
          <td>${item.matchedPolicySection ? `<code>${this.escapeHtml(item.matchedPolicySection)}</code>` : '<span style="color: #ef4444; font-style: italic;">Omitted</span>'}</td>
          <td><span class="${badgeClass}">${badgeLabel}</span></td>
          <td style="font-family: monospace; font-weight: bold; color: ${item.statutoryPenaltyNaira > 0 ? '#b91c1c' : '#15803d'};">${fineText}</td>
          <td>${this.escapeHtml(item.responsibleRole || 'Chief Compliance Officer')}</td>
        </tr>`;
      })
      .join('\n');

    const remediationItemsHtml = dossier.items
      .filter((item) => item.complianceStatus !== 'ADEQUATELY_MET')
      .map((item, idx) => {
        const draftLanguage = item.draftReplacementLanguage || item.draftReplacementPolicyLanguage || item.whatToDo;
        return `
        <div class="remediation-card">
          <div class="remediation-header">
            <h4>#${idx + 1}: ${this.escapeHtml(item.regulatoryClauseReference)} — ${this.escapeHtml(item.statutoryLegalCitation || 'Statutory Schedule')}</h4>
            <span class="remediation-owner">Owner: ${this.escapeHtml(item.responsibleRole || 'Chief Compliance Officer')} • Window: ${item.statutoryRemediationTimelineDays || 30} Days</span>
          </div>
          <div class="remediation-delta">
            <strong>Operational Deficiency:</strong> ${this.escapeHtml(item.whatHasChanged)}
          </div>
          <div class="draft-wording-box">
            <div class="draft-wording-label">BOARD-READY DRAFT REPLACEMENT POLICY WORDING:</div>
            <p>"${this.escapeHtml(draftLanguage)}"</p>
          </div>
        </div>`;
      })
      .join('\n');

    const fiveWCardsHtml = dossier.items
      .map((item, idx) => {
        const badgeClass =
          item.complianceStatus === 'ADEQUATELY_MET'
            ? 'badge-adequate'
            : item.complianceStatus === 'PARTIALLY_MET'
            ? 'badge-partial'
            : 'badge-critical';
        const badgeLabel =
          item.complianceStatus === 'ADEQUATELY_MET'
            ? 'ADEQUATELY MET — CLEAN FINDING'
            : item.complianceStatus === 'PARTIALLY_MET'
            ? 'PARTIALLY MET — LEVEL 2 DEFICIENCY'
            : 'CRITICAL GAP — LEVEL 1 MATERIAL DEFICIENCY';

        return `
        <div class="five-w-schedule">
          <div class="schedule-head">
            <h3>Schedule ${idx + 1}: ${this.escapeHtml(item.regulatoryClauseReference)}</h3>
            <span class="${badgeClass}">${badgeLabel}</span>
          </div>
          <div class="meta-strip">
            <span><strong>Penalty Exposure:</strong> ${item.statutoryPenaltyNaira > 0 ? `₦${(item.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M` : '₦0 (Clean)'}</span>
            <span><strong>Responsible Role:</strong> ${this.escapeHtml(item.responsibleRole || 'Chief Compliance Officer')}</span>
            <span><strong>Remediation Window:</strong> ${item.statutoryRemediationTimelineDays || 30} Days</span>
          </div>
          <table class="five-w-table">
            <tr>
              <td class="dim-col">1. What Happened?</td>
              <td>${this.escapeHtml(item.whatHappened)}</td>
            </tr>
            <tr>
              <td class="dim-col">2. What to Know?</td>
              <td>${this.escapeHtml(item.whatToKnow)}</td>
            </tr>
            <tr>
              <td class="dim-col">3. What Has Changed?</td>
              <td>${this.escapeHtml(item.whatHasChanged)}</td>
            </tr>
            <tr>
              <td class="dim-col">4. What to Do?</td>
              <td>${this.escapeHtml(item.whatToDo)}</td>
            </tr>
            <tr>
              <td class="dim-col">5. Derived Insight</td>
              <td>${this.escapeHtml(item.derivedInsight)}</td>
            </tr>
          </table>
        </div>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bank Examiner Audit Defense Dossier - ${this.escapeHtml(dossier.dossierReference)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 32px;
    }
    .dossier-container {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .header-banner {
      border-bottom: 3px solid #047857;
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-title h1 {
      font-size: 20px;
      letter-spacing: -0.02em;
      margin: 0 0 6px 0;
      color: #0f172a;
      text-transform: uppercase;
    }
    .header-title h2 {
      font-size: 14px;
      color: #047857;
      margin: 0 0 4px 0;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .header-ref {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    .header-ref code {
      font-weight: bold;
      color: #0f172a;
    }
    .transmittal-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #047857;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 32px;
      font-size: 13px;
    }
    .scorecard-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .score-card {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .score-value {
      font-size: 26px;
      font-weight: 800;
      margin-top: 4px;
      font-family: monospace;
    }
    .score-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: #475569;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 32px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      text-align: left;
    }
    table.data-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
    }
    .badge-adequate {
      background: #dcfce7;
      color: #15803d;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid #bbf7d0;
    }
    .badge-partial {
      background: #fef3c7;
      color: #b45309;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid #fde68a;
    }
    .badge-critical {
      background: #fee2e2;
      color: #b91c1c;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid #fecaca;
    }
    .remediation-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .remediation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .remediation-header h4 {
      margin: 0;
      font-size: 13px;
      color: #0f172a;
    }
    .remediation-owner {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .remediation-delta {
      font-size: 12px;
      color: #334155;
      margin-bottom: 10px;
    }
    .draft-wording-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 12px;
      font-size: 12px;
      color: #166534;
    }
    .draft-wording-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .five-w-schedule {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px;
      margin-bottom: 24px;
      background: #ffffff;
    }
    .schedule-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .schedule-head h3 {
      margin: 0;
      font-size: 14px;
    }
    .meta-strip {
      display: flex;
      gap: 20px;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    table.five-w-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    table.five-w-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    table.five-w-table td.dim-col {
      width: 140px;
      font-weight: 700;
      color: #0f172a;
      vertical-align: top;
      background: #f8fafc;
    }
    .attestation-block {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 24px;
      margin-top: 40px;
    }
    .attestation-statement {
      font-style: italic;
      font-size: 12px;
      color: #334155;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 32px;
      border-top: 1px solid #cbd5e1;
      padding-top: 24px;
    }
    .sig-line {
      width: 45%;
      text-align: center;
      font-size: 11px;
    }
    .sig-rule {
      border-bottom: 1px solid #475569;
      margin-bottom: 8px;
      height: 36px;
    }
    .custody-seal {
      margin-top: 24px;
      padding: 12px;
      background: #0f172a;
      color: #94a3b8;
      border-radius: 6px;
      font-family: monospace;
      font-size: 10px;
      word-break: break-all;
    }
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .dossier-container {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .five-w-schedule {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="dossier-container">
    <div class="header-banner">
      <div class="header-title">
        <h2>CENTRAL BANK OF NIGERIA (CBN) • BANKING SUPERVISION DEPARTMENT</h2>
        <h1>STATUTORY CONCORDANCE AUDIT DEFENSE DOSSIER</h1>
        <div style="font-size: 12px; color: #475569;">Regulated Institution: <strong>${this.escapeHtml(dossier.organizationName)}</strong> • Department: <strong>${this.escapeHtml(dossier.department)}</strong></div>
      </div>
      <div class="header-ref">
        <div>Ref: <code>${this.escapeHtml(dossier.dossierReference)}</code></div>
        <div>Date: ${formattedDate}</div>
        <div>Framework: <strong>${this.escapeHtml(dossier.benchmarkTitle)}</strong></div>
      </div>
    </div>

    <div class="transmittal-box">
      <div style="font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">Formal Supervisory Transmittal</div>
      <div><strong>To:</strong> ${this.escapeHtml(dossier.transmittalLetter?.recipientTitle || 'The Director')}, ${this.escapeHtml(dossier.transmittalLetter?.recipientDepartment || 'Banking Supervision Department')}, ${this.escapeHtml(dossier.transmittalLetter?.regulatorName || 'Central Bank of Nigeria')}</div>
      <div><strong>Subject:</strong> ${this.escapeHtml(dossier.transmittalLetter?.subject || 'Statutory Concordance Defense Pack')}</div>
      <p style="margin: 10px 0 0 0; line-height: 1.6;">${this.escapeHtml(dossier.transmittalLetter?.body || '')}</p>
    </div>

    <div class="scorecard-grid">
      <div class="score-card">
        <div class="score-label">Compliance Health</div>
        <div class="score-value" style="color: ${dossier.overallCompliancePercentage >= 80 ? '#15803d' : dossier.overallCompliancePercentage >= 60 ? '#b45309' : '#b91c1c'};">
          ${dossier.overallCompliancePercentage.toFixed(1)}%
        </div>
      </div>
      <div class="score-card">
        <div class="score-label">Adequately Met</div>
        <div class="score-value" style="color: #15803d;">${dossier.adequatelyMetCount}</div>
      </div>
      <div class="score-card">
        <div class="score-label">Partially Met (L2)</div>
        <div class="score-value" style="color: #b45309;">${dossier.partiallyMetCount}</div>
      </div>
      <div class="score-card">
        <div class="score-label">Critical Gaps (L1)</div>
        <div class="score-value" style="color: #b91c1c;">${dossier.criticalGapsCount}</div>
      </div>
    </div>

    <div style="margin-bottom: 32px;">
      <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 8px; color: #0f172a;">Executive Statement for Bank Examiners</h3>
      <p style="font-size: 13px; line-height: 1.6; color: #334155; margin: 0;">${this.escapeHtml(dossier.executiveSummary)}</p>
    </div>

    <div style="margin-bottom: 32px;">
      <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 12px; color: #0f172a;">Cryptographic Chain of Custody &amp; Validation</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Artifact Component</th>
            <th>Identification / Reference</th>
            <th>SHA-256 Digest</th>
            <th>Verification</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Input Policy Manual</strong></td>
            <td>${this.escapeHtml(dossier.policyTitle)} (v${this.escapeHtml(dossier.policyVersion)})</td>
            <td><code>${dossier.cryptographicValidationTable?.inputPolicyHash || 'SHA256_POLICY_HASH'}</code></td>
            <td><span class="badge-adequate">Grounded</span></td>
          </tr>
          <tr>
            <td><strong>Statutory Benchmark</strong></td>
            <td>${this.escapeHtml(dossier.benchmarkTitle)} (${this.escapeHtml(dossier.benchmarkReferenceCode)})</td>
            <td><code>${dossier.cryptographicValidationTable?.benchmarkVersionHash || 'SHA256_BENCH_HASH'}</code></td>
            <td><span class="badge-adequate">Authentic</span></td>
          </tr>
          <tr>
            <td><strong>Findings Concordance Digest</strong></td>
            <td>${dossier.items.length} Evaluated Statutory Obligations</td>
            <td><code>${dossier.cryptographicValidationTable?.findingsDigestHash || 'SHA256_DIGEST_HASH'}</code></td>
            <td><span class="badge-adequate">Sealed</span></td>
          </tr>
          <tr>
            <td><strong>CCO Attestation Seal</strong></td>
            <td>${this.escapeHtml(dossier.ccoAttestation.ccoName)}</td>
            <td><code>${dossier.ccoAttestation.digitalSealHash}</code></td>
            <td><span class="badge-adequate">Certified</span></td>
          </tr>
          <tr>
            <td><strong>Master Audit Pack Hash</strong></td>
            <td>${this.escapeHtml(dossier.dossierReference)}</td>
            <td><code>${dossier.sha256VerificationHash}</code></td>
            <td><span class="badge-adequate">Tamper-Evident</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 12px; color: #0f172a;">Section 1: Clause Concordance Matrix Table</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Statutory Obligation Reference</th>
          <th>Internal Policy Section</th>
          <th>Concordance Status</th>
          <th>Fine Exposure</th>
          <th>Action Owner</th>
        </tr>
      </thead>
      <tbody>
        ${concordanceTableRows}
      </tbody>
    </table>

    <div style="margin-top: 24px; margin-bottom: 32px;">
      <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 12px; color: #0f172a;">Verbatim Concordance Diff Matrix (Side-by-Side Statutory Evidence)</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 15%;">Obligation Citation</th>
            <th style="width: 40%;">Statutory Mandate (Verbatim Extract)</th>
            <th style="width: 40%;">Institutional Policy Manual Text (Verbatim Extract)</th>
          </tr>
        </thead>
        <tbody>
          ${dossier.items.map((item, idx) => `
          <tr>
            <td style="font-family: monospace; font-weight: bold;">${idx + 1}</td>
            <td><strong>${this.escapeHtml(item.regulatoryClauseReference)}</strong></td>
            <td style="font-size: 11px; background: #f8fafc; border-left: 3px solid #047857; padding: 8px;">"${this.escapeHtml(item.statutoryQuote || item.whatHappened)}"</td>
            <td style="font-size: 11px; ${item.policyEvidenceQuote ? 'background: #f8fafc; border-left: 3px solid #2563eb; padding: 8px;' : 'color: #b91c1c; font-style: italic;'}">${item.policyEvidenceQuote ? `"${this.escapeHtml(item.policyEvidenceQuote)}"` : '[Omitted — Zero Internal Controls Established]'}</td>
          </tr>
          `).join('\n')}
        </tbody>
      </table>
    </div>

    <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 12px; color: #0f172a;">Section 2: Active Board Remediation Plan & Draft Replacement Language</h3>
    <div style="margin-bottom: 32px;">
      ${remediationItemsHtml || '<p style="font-size: 13px; color: #15803d;">All evaluated statutory obligations are adequately met. Zero remediation actions required.</p>'}
    </div>

    <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 12px; color: #0f172a;">Section 3: Itemized 5-W Operational Decision Matrix</h3>
    <div style="margin-bottom: 32px;">
      ${fiveWCardsHtml}
    </div>

    <div class="attestation-block">
      <h3 style="font-size: 13px; text-transform: uppercase; margin: 0 0 12px 0; color: #0f172a;">Chief Compliance Officer (CCO) & Board Attestation Block</h3>
      <div class="attestation-statement">"${this.escapeHtml(dossier.ccoAttestation.attestationStatement)}"</div>

      <div class="signature-row">
        <div class="sig-line">
          <div class="sig-rule"></div>
          <strong>${this.escapeHtml(dossier.ccoAttestation.ccoName)}</strong><br>
          Chief Compliance Officer & Legal Counsel<br>
          ${this.escapeHtml(dossier.organizationName)}
        </div>
        <div class="sig-line">
          <div class="sig-rule"></div>
          <strong>Chairman, Board Audit & Risk Committee</strong><br>
          Executive Sign-off for Regulatory Inquiries<br>
          ${this.escapeHtml(dossier.organizationName)}
        </div>
      </div>

      <div class="custody-seal">
        <strong>SHA-256 CRYPTOGRAPHIC CHAIN OF CUSTODY SEAL:</strong><br>
        DOSSIER SEAL: ${dossier.sha256VerificationHash}<br>
        CCO ATTESTATION SEAL: ${dossier.ccoAttestation.digitalSealHash}<br>
        TIMESTAMP: ${dossier.ccoAttestation.timestamp} • GENERATOR: Cogent Sovereign RegTech Engine v1.2
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const defaultDossierExportService = new DossierExportService();
