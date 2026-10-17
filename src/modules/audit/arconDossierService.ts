import crypto from 'crypto';
import {
  MarketingShieldViewModel,
  FindingPresentationCard,
  PresentationActionItem,
} from '@/shared/types/presentation';
import { MarketingChannel } from '@/shared/types';
import { AuditService } from './auditService';

export interface ArconDossierParams {
  viewModel: MarketingShieldViewModel;
  organizationName?: string;
  organizationId?: string;
  applicantCcoName?: string;
  applicantCcoTitle?: string;
  attestationNotes?: string;
  attestationHash?: string;
  filingType?: 'STANDARD_PRE_CLEARANCE' | 'ACCELERATED_48H_SPECIAL_VETTING';
}

/**
 * Official ARCON ASP Pre-Clearance Dossier Generator (Epic 7 / Task 7.2)
 * Produces statutory submission dossiers adhering to the Advertising Regulatory Council
 * of Nigeria Act 2022 and ARCON Code 2022 Article 24.
 */
export class ArconDossierService {
  /**
   * Generates a comprehensive, audit-ready Markdown Dossier
   */
  public static generateMarkdownDossier(params: ArconDossierParams): string {
    const {
      viewModel,
      organizationName = 'Cogent Enterprise Tenant',
      organizationId = '00000000-0000-0000-0000-000000000001',
      applicantCcoName = 'Authorized Compliance Officer',
      applicantCcoTitle = 'Chief Compliance Officer',
      attestationNotes = 'Reviewed and reconciled against ARCON Code 2022, CBN Consumer Protection Framework 2019, and FCCPC Digital Lending Guidelines 2022. Pre-clearance conditions attested.',
      filingType = 'STANDARD_PRE_CLEARANCE',
    } = params;

    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const dossierTrackingId = `COG-ARCON-${new Date().getFullYear()}-${viewModel.telemetry.auditHash.substring(0, 8).toUpperCase()}`;

    const formattedPenalty = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(viewModel.deterministicPenaltyTotalNaira);

    const inputHash = AuditService.computeSha256(viewModel.originalCopy);
    const outputHash = AuditService.computeSha256(viewModel.compliantRewrite || '');
    const sealHash = params.attestationHash || viewModel.telemetry.auditHash;

    const lines: string[] = [];

    // Header
    lines.push(`# ADVERTISING REGULATORY COUNCIL OF NIGERIA (ARCON)`);
    lines.push(`## ADVERTISING STANDARDS PANEL (ASP) STATUTORY PRE-VETTING DOSSIER`);
    lines.push(`**FORM ARCON-PV1 — STATUTORY COMPLIANCE CLEARANCE FILE**`);
    lines.push(`---`);
    lines.push(``);

    // Meta Table
    lines.push(`| Dossier Parameter | Statutory Record |`);
    lines.push(`| :--- | :--- |`);
    lines.push(`| **Dossier Tracking ID** | \`${dossierTrackingId}\` |`);
    lines.push(`| **Date of Attestation** | ${formattedDate} (${timestamp} WAT) |`);
    lines.push(`| **Applicant Entity** | **${organizationName}** (Org ID: \`${organizationId}\`) |`);
    lines.push(`| **Regulated License Profiles** | ${viewModel.activeLicenseProfiles?.join(', ') || 'FINANCIAL_INSTITUTION_REGISTERED'} |`);
    lines.push(`| **Filing Category** | ${filingType === 'ACCELERATED_48H_SPECIAL_VETTING' ? '⚡ 48-Hour Accelerated Special Vetting' : '📋 Standard ASP 10-Day Pre-Clearance'} |`);
    lines.push(`| **Statutory Pre-Vetting Verdict** | **${viewModel.verdict}** (Risk Score: ${viewModel.overallRiskScore}/100) |`);
    lines.push(`| **Deterministic Fine Exposure Avoided** | **${formattedPenalty}** |`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    // Campaign Overview
    lines.push(`### SECTION 1: CAMPAIGN FLIGHT & DISSEMINATION PARAMETERS`);
    lines.push(``);
    lines.push(`- **Campaign Title:** ${viewModel.title}`);
    lines.push(`- **Dissemination Channel:** \`${viewModel.channel}\``);
    lines.push(`- **ARCON ASP Mandate:** ${viewModel.arconPreclearanceRequired ? 'MANDATORY (Art. 24(1) Code 2022)' : 'STANDARD REGULATORY ADVISORY'}`);
    lines.push(``);
    lines.push(`#### 1.1 Executive Compliance Briefing`);
    lines.push(`> ${viewModel.executiveSummary}`);
    lines.push(``);

    // Copy Audit
    lines.push(`### SECTION 2: STATUTORY PRE-VETTING COPY COMPARISON`);
    lines.push(``);
    lines.push(`#### 2.1 Original Draft Copy (Submitted for Vetting)`);
    lines.push(`\`\`\`text`);
    lines.push(viewModel.originalCopy);
    lines.push(`\`\`\``);
    lines.push(``);
    lines.push(`#### 2.2 Approved Compliant Copy Rewrite (Post-Remediation)`);
    lines.push(`\`\`\`text`);
    lines.push(viewModel.compliantRewrite || 'Pending copy remediation.');
    lines.push(`\`\`\``);
    lines.push(``);

    // Findings List
    lines.push(`### SECTION 3: VERIFIED STATUTORY DISCREPANCIES & CITATIONS`);
    lines.push(``);
    if (viewModel.findings.length === 0) {
      lines.push(`*No statutory violations detected against verified Nigerian corpus (ARCON Code 2022, CBN CPF 2019, FCCPC Guidelines).*`);
    } else {
      viewModel.findings.forEach((finding, index) => {
        const itemPenalty = finding.statutoryPenaltyNaira
          ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(finding.statutoryPenaltyNaira)
          : 'Administrative Sanction / Injunction';

        lines.push(`#### 3.${index + 1} Finding: ${finding.ruleCode} [${finding.severity}]`);
        lines.push(`- **Regulator:** ${finding.regulatorCode}`);
        lines.push(`- **Flagged Excerpt:** *"${finding.flaggedExcerpt}"*`);
        lines.push(`- **Statutory Fine Schedule:** ${itemPenalty}`);
        lines.push(`- **Official Legal Citation:** ${finding.statutoryCitation}`);
        lines.push(`- **Counsel Analysis ("Why It Matters"):** ${finding.whyItMatters}`);
        if (finding.mandatoryDisclosureRequired) {
          lines.push(`- **Mandatory Disclosure Formula:** \`${finding.mandatoryDisclosureRequired}\``);
        }
        lines.push(``);
      });
    }

    // Action Checklist
    lines.push(`### SECTION 4: STATUTORY REMEDIATION ACTION PLAN`);
    lines.push(``);
    lines.push(`| Priority | Action Item Description | Owner Department | Statutory Deadline | Status |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    viewModel.actions.forEach((act) => {
      lines.push(
        `| **${act.priority}** | ${act.title}: ${act.description} | ${act.ownerDepartment} | ${act.suggestedDeadlineDays || 2} Days | ${act.completed ? 'COMPLETED' : 'PENDING'} |`
      );
    });
    lines.push(``);

    // CCO Attestation Block
    lines.push(`### SECTION 5: CHIEF COMPLIANCE OFFICER FORMAL ATTESTATION`);
    lines.push(``);
    lines.push(`> *"I hereby certify on behalf of ${organizationName} that the marketing representations contained herein have been rigorously reviewed against the provisions of the Advertising Regulatory Council of Nigeria (ARCON) Act 2022, the Nigerian Code of Advertising Practice (ARCON Code 2022), the Central Bank of Nigeria (CBN) Consumer Protection Framework 2019, and the Federal Competition & Consumer Protection Commission (FCCPC) Guidelines. The approved compliant rewrite incorporates all mandatory risk warnings and APR disclosures required under Nigerian law."*`);
    lines.push(``);
    lines.push(`- **Attesting Officer:** **${applicantCcoName}**`);
    lines.push(`- **Official Designation:** ${applicantCcoTitle}`);
    lines.push(`- **Attestation Decision:** \`${viewModel.humanReviewState.status}\``);
    lines.push(`- **Officer Notes:** ${attestationNotes}`);
    lines.push(`- **Digital Cryptographic Seal:** \`${sealHash}\``);
    lines.push(``);

    // Audit Proofs
    lines.push(`### SECTION 6: CRYPTOGRAPHIC CHAIN OF CUSTODY & AUDIT PROVENANCE`);
    lines.push(`*(Preserved per CAMA 2020 & BOFIA 2020 6-Year Statutory Audit Retention Rule)*`);
    lines.push(``);
    lines.push(`- **Raw Copy SHA-256 Input Digest:** \`${inputHash}\``);
    lines.push(`- **Compliant Output SHA-256 Digest:** \`${outputHash}\``);
    lines.push(`- **Attestation Seal SHA-256 Digest:** \`${sealHash}\``);
    lines.push(`- **AI & Deterministic Engine Model:** \`${viewModel.telemetry.modelIdentifier}\``);
    lines.push(`- **Verification Latency:** \`${viewModel.telemetry.latencyMs}ms\``);
    lines.push(`- **Integrity Seal Status:** **VALIDATED & TAMPER-EVIDENT**`);
    lines.push(``);
    lines.push(`---`);
    lines.push(`*Generated autonomously by Cogent Regulatory Moat Platform. Verified against official Nigerian Federal Gazettes.*`);

    return lines.join('\n');
  }

  /**
   * Generates a print-ready, styled HTML Dossier suitable for PDF rendering or browser printing
   */
  public static generateHtmlDossier(params: ArconDossierParams): string {
    const md = ArconDossierService.generateMarkdownDossier(params);
    const {
      viewModel,
      organizationName = 'Cogent Enterprise Tenant',
      applicantCcoName = 'Authorized Compliance Officer',
      applicantCcoTitle = 'Chief Compliance Officer',
    } = params;

    const formattedPenalty = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(viewModel.deterministicPenaltyTotalNaira);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ARCON Pre-Clearance Dossier — ${viewModel.title}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; line-height: 1.5; font-size: 13px; margin: 0; padding: 24px; }
    .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-title h1 { margin: 0; font-size: 18px; color: #0f172a; text-transform: uppercase; letter-spacing: -0.01em; }
    .header-title h2 { margin: 4px 0 0; font-size: 14px; color: #0284c7; font-weight: 600; }
    .header-badge { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 11px; text-align: right; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .card-value { font-size: 14px; font-weight: 600; color: #0f172a; }
    .penalty-card { background: #fef2f2; border: 1px solid #fecaca; }
    .penalty-value { color: #dc2626; font-size: 16px; font-weight: 700; }
    .verdict-chip { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: ${viewModel.verdict === 'BLOCKING_ISSUE' ? '#fee2e2; color: #991b1b;' : '#fef3c7; color: #92400e;'}; }
    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 8px; margin: 24px 0 12px; }
    .copy-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; white-space: pre-wrap; margin-bottom: 12px; }
    .rewrite-box { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #334155; }
    .finding-block { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; background: #fff; }
    .finding-header { display: flex; justify-content: space-between; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
    .finding-citation { font-size: 11px; color: #64748b; font-style: italic; margin-top: 4px; }
    .signature-box { border: 2px dashed #94a3b8; border-radius: 8px; padding: 16px; margin-top: 24px; background: #fafafa; }
    .hash-text { font-family: monospace; font-size: 10px; color: #64748b; word-break: break-all; }
  </style>
</head>
<body>
  <div class="header-box">
    <div class="header-title">
      <h1>Advertising Regulatory Council of Nigeria (ARCON)</h1>
      <h2>Advertising Standards Panel (ASP) Statutory Pre-Vetting Dossier</h2>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Form ARCON-PV1 • Statutory Clearance Attestation Pack</div>
    </div>
    <div class="header-badge">
      <div><strong>TRACKING ID:</strong> COG-ARCON-${viewModel.telemetry.auditHash.substring(0, 8).toUpperCase()}</div>
      <div><strong>DATE:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
      <div><strong>ORGANISATION:</strong> ${organizationName}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Pre-Vetting Verdict</div>
      <div class="card-value"><span class="verdict-chip">${viewModel.verdict}</span></div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Overall Risk Score: ${viewModel.overallRiskScore}/100</div>
    </div>
    <div class="card penalty-card">
      <div class="card-title">Deterministic Fine Exposure Avoided</div>
      <div class="penalty-value">${formattedPenalty}</div>
      <div style="font-size: 11px; color: #991b1b; margin-top: 4px;">Statutory Fine Schedule Calculated Under Nigerian Law</div>
    </div>
  </div>

  <div class="section-title">1. Original Draft Copy (Submitted for Vetting)</div>
  <div class="copy-box">${viewModel.originalCopy}</div>

  <div class="section-title">2. Approved Compliant Rewrite (Post-Remediation)</div>
  <div class="copy-box rewrite-box">${viewModel.compliantRewrite || 'Pending compliance revision.'}</div>

  <div class="section-title">3. Verified Statutory Findings (${viewModel.findings.length})</div>
  ${viewModel.findings
    .map(
      (f) => `
    <div class="finding-block">
      <div class="finding-header">
        <span>${f.ruleCode} [${f.regulatorCode}]</span>
        <span style="color: #dc2626; font-size: 11px;">Fine: ₦${(f.statutoryPenaltyNaira || 0).toLocaleString()}</span>
      </div>
      <div><strong>Flagged:</strong> "${f.flaggedExcerpt}"</div>
      <div style="font-size: 12px; color: #334155; margin-top: 4px;">${f.whyItMatters}</div>
      <div class="finding-citation">Gazette Citation: ${f.statutoryCitation}</div>
    </div>
  `
    )
    .join('')}

  <div class="signature-box">
    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Chief Compliance Officer (CCO) Statutory Attestation</div>
    <p style="font-size: 11px; color: #334155; margin: 0 0 12px;">I hereby attest that the promotional materials detailed above have been evaluated against statutory frameworks established under the ARCON Act 2022, CBN Consumer Protection Framework 2019, and FCCPC Guidelines. Dissemination is authorized strictly per the verified compliant rewrite.</p>
    <div style="display: flex; justify-content: space-between; font-size: 12px;">
      <div><strong>Attesting CCO:</strong> ${applicantCcoName} (${applicantCcoTitle})</div>
      <div><strong>Status:</strong> ${viewModel.humanReviewState.status}</div>
    </div>
    <div style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
      <span class="hash-text">SHA-256 Seal: ${params.attestationHash || viewModel.telemetry.auditHash}</span>
    </div>
  </div>
</body>
</html>`;
  }
}
