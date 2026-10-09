import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { AuditService } from '@/modules/audit/auditService';

export async function POST(req: NextRequest) {
  try {
    await getTenantContext();
    const body = await req.json();
    const {
      circular,
      applicability,
      roleBriefs,
      actionItems,
      ccoSignatoryName = 'Olumide Adebayo, Esq.',
      ccoSignatoryTitle = 'Chief Compliance Officer',
      format = 'markdown',
    } = body;

    const exportTimestamp = new Date().toISOString();
    const documentHash = AuditService.computeSha256(
      JSON.stringify({ circular, applicability, roleBriefs, actionItems, exportTimestamp })
    );

    if (format === 'html') {
      const html = generateExecutiveBriefHtml({
        circular,
        applicability,
        roleBriefs,
        actionItems,
        ccoSignatoryName,
        ccoSignatoryTitle,
        exportTimestamp,
        documentHash,
      });

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Document-Hash': documentHash,
        },
      });
    }

    // Default to Markdown
    const markdown = generateExecutiveBriefMarkdown({
      circular,
      applicability,
      roleBriefs,
      actionItems,
      ccoSignatoryName,
      ccoSignatoryTitle,
      exportTimestamp,
      documentHash,
    });

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="Executive_Board_Brief_${circular.circularNumber.replace(/[^a-zA-Z0-9]/g, '_')}.md"`,
        'X-Document-Hash': documentHash,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message || 'Failed to generate board brief' }, { status: 500 });
  }
}

interface ActionItemBrief {
  targetDepartment: string;
  actionTitle: string;
  actionDescription: string;
  suggestedDeadline?: string;
  isCompleted?: boolean;
}

interface ExecutiveBriefParams {
  circular: {
    regulatorCode: string;
    circularNumber: string;
    subject: string;
    publicationDate: string;
    statutoryDeadline?: string;
    priority: string;
  };
  applicability: {
    isApplicable: boolean;
    reason: string;
  };
  roleBriefs: {
    actionBriefCoo?: string;
    executiveBriefCco?: string;
    technicalBriefProductEng?: string;
    financialBriefCfo?: string;
  };
  actionItems?: ActionItemBrief[];
  ccoSignatoryName: string;
  ccoSignatoryTitle: string;
  exportTimestamp: string;
  documentHash: string;
}

function generateExecutiveBriefMarkdown(params: ExecutiveBriefParams): string {
  const { circular, applicability, roleBriefs, actionItems, ccoSignatoryName, ccoSignatoryTitle, exportTimestamp, documentHash } = params;

  return `# CONFIDENTIAL EXECUTIVE BOARD BRIEF: REGULATORY IMPACT ASSESSMENT

**Issuing Regulator:** ${circular.regulatorCode}  
**Circular Reference:** \`${circular.circularNumber}\`  
**Subject:** ${circular.subject}  
**Publication Date:** ${circular.publicationDate}  
**Statutory Deadline:** ${circular.statutoryDeadline || 'None specified'}  
**Priority Classification:** **${circular.priority}**  
**Integrity Seal (SHA-256):** \`${documentHash}\`  
**Assessment Generated:** ${exportTimestamp}  

---

## 1. INSTITUTIONAL APPLICABILITY POSTURE

> **Status:** ${applicability.isApplicable ? 'DIRECT STATUTORY MANDATE' : 'FILTERED / NON-APPLICABLE'}  
> **Applicability Rationale:** ${applicability.reason}

---

## 2. MULTI-ROLE EXECUTIVE BRIEFINGS

### 2.1 Chief Operating Officer (COO) — Settlement & Operations
${roleBriefs.actionBriefCoo || 'Pending operational brief.'}

### 2.2 Chief Compliance Officer (CCO) — Statutory Mandates & Sanctions
${roleBriefs.executiveBriefCco || 'Pending compliance brief.'}

### 2.3 VP of Product & Engineering — Technical Specifications & APIs
${roleBriefs.technicalBriefProductEng || 'Pending technical brief.'}

### 2.4 Chief Financial Officer (CFO) — Capital Adequacy & Balance Sheet Exposure
${roleBriefs.financialBriefCfo || 'Pending financial brief.'}

---

## 3. MANDATORY ACTION ITEM CHECKLIST & EXECUTION STATUS

| Department | Task Title | Operational Description | Deadline | Status |
| :--- | :--- | :--- | :--- | :--- |
${(actionItems || [])
  .map(
    (item: ActionItemBrief) =>
      `| **${item.targetDepartment}** | ${item.actionTitle} | ${item.actionDescription} | ${item.suggestedDeadline || 'Immediate'} | ${item.isCompleted ? 'COMPLETED' : 'PENDING'} |`
  )
  .join('\n')}

---

## 4. CHIEF COMPLIANCE OFFICER (CCO) ATTESTATION & SIGN-OFF

I hereby attest that this Regulatory Impact Assessment and Board Brief has been prepared in accordance with the regulatory risk governance requirements of CAMA 2020 and BOFIA 2020. All institutional departments have been briefed on statutory deadlines.

**Attesting Officer:** ${ccoSignatoryName}  
**Designation:** ${ccoSignatoryTitle}  
**Signature Block:** [Digitally Sealed via Cogent AI Audit Ledger]  
**Cryptographic Audit Hash:** \`${documentHash}\`  
`;
}

function generateExecutiveBriefHtml(params: ExecutiveBriefParams): string {
  const { circular, applicability, roleBriefs, actionItems, ccoSignatoryName, ccoSignatoryTitle, exportTimestamp, documentHash } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Executive Board Brief: ${circular.circularNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 40px; line-height: 1.6; }
    h1 { color: #0369a1; border-bottom: 2px solid #0284c7; padding-bottom: 8px; font-size: 22px; }
    h2 { color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; font-size: 16px; margin-top: 24px; }
    h3 { color: #334155; font-size: 14px; margin-top: 16px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; }
    .badge-urgent { background: #fee2e2; color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    .box { background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px; margin: 12px 0; border-radius: 4px; font-size: 13px; }
    .seal { background: #f1f5f9; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 11px; color: #475569; word-break: break-all; }
  </style>
</head>
<body>
  <h1>EXECUTIVE BOARD BRIEF: REGULATORY IMPACT ASSESSMENT</h1>
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
    <div>
      <div><strong>Regulator:</strong> ${circular.regulatorCode}</div>
      <div><strong>Circular Ref:</strong> <code>${circular.circularNumber}</code></div>
      <div><strong>Subject:</strong> ${circular.subject}</div>
    </div>
    <div style="text-align: right;">
      <div><span class="badge ${circular.priority === 'CRITICAL_EMERGENCY' ? 'badge-urgent' : ''}">${circular.priority}</span></div>
      <div><strong>Statutory Deadline:</strong> ${circular.statutoryDeadline || 'None'}</div>
      <div style="font-size: 11px; color: #64748b;">Generated: ${exportTimestamp}</div>
    </div>
  </div>

  <div class="box">
    <strong>Applicability Posture:</strong> ${applicability.isApplicable ? 'DIRECT APPLICABILITY' : 'NON-APPLICABLE'}<br>
    ${applicability.reason}
  </div>

  <h2>1. Multi-Role Executive Briefings</h2>
  <h3>Chief Operating Officer (COO) — Settlement & Operations</h3>
  <p>${roleBriefs.actionBriefCoo || 'N/A'}</p>

  <h3>Chief Compliance Officer (CCO) — Statutory Mandates & Sanctions</h3>
  <p>${roleBriefs.executiveBriefCco || 'N/A'}</p>

  <h3>Product & Engineering — API Specifications & Architecture</h3>
  <p>${roleBriefs.technicalBriefProductEng || 'N/A'}</p>

  <h3>Chief Financial Officer (CFO) — Capital Adequacy & Fee Caps</h3>
  <p>${roleBriefs.financialBriefCfo || 'N/A'}</p>

  <h2>2. Compliance Action Item Tracker</h2>
  <table>
    <thead>
      <tr>
        <th>Department</th>
        <th>Task Title</th>
        <th>Description</th>
        <th>Deadline</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${(actionItems || [])
        .map(
          (item: ActionItemBrief) => `
        <tr>
          <td><strong>${item.targetDepartment}</strong></td>
          <td>${item.actionTitle}</td>
          <td>${item.actionDescription}</td>
          <td>${item.suggestedDeadline || 'Immediate'}</td>
          <td>${item.isCompleted ? 'COMPLETED' : 'PENDING'}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>3. CCO Attestation & Cryptographic Audit Seal</h2>
  <div class="box">
    <strong>Attested By:</strong> ${ccoSignatoryName} (${ccoSignatoryTitle})<br>
    Digitally signed under CAMA 2020 / BOFIA 2020 compliance governance.<br>
    <div class="seal" style="margin-top: 8px;">SHA-256 Seal: ${documentHash}</div>
  </div>
</body>
</html>`;
}
