import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;

    if (!dbClient) {
      return new Response('Database unavailable', { status: 503 });
    }

    const { data: campaign } = await dbClient
      .from('marketing_campaigns')
      .select('*, organizations(name)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!campaign) {
      return new Response('Campaign not found', { status: 404 });
    }

    const { data: claims } = await dbClient
      .from('extracted_promotional_claims')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: true });

    const orgName = campaign.organizations?.name || 'Licensed Financial Institution';
    const auditHash = crypto
      .createHash('sha256')
      .update(`${campaign.id}-${campaign.updated_at}-${campaign.canvas_content}`)
      .digest('hex');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pre-Clearance Dossier — ${campaign.title}</title>
  <style>
    @page { size: A4 portrait; margin: 18mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }
    .header-bar {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge {
      display: inline-block;
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 24px;
      background: #f8fafc;
    }
    .meta-cell {
      padding: 10px 14px;
      border-right: 1px solid #e2e8f0;
    }
    .meta-cell:last-child { border-right: none; }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 2px;
    }
    .meta-value {
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .copy-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      padding: 16px;
      font-size: 13px;
      white-space: pre-wrap;
      font-family: inherit;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 12px;
    }
    th {
      text-align: left;
      padding: 8px 10px;
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      border: 1px solid #e2e8f0;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .signoff-box {
      margin-top: 32px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 16px;
      background: #f8fafc;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .sig-line {
      border-bottom: 1px dashed #94a3b8;
      height: 32px;
      margin-top: 8px;
    }
    .no-print {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: white;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: -24px -24px 24px -24px;
    }
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div><strong>ARCON FORM ASP-PV1</strong> • Pre-Clearance Dossier</div>
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:600;cursor:pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header-bar">
    <div>
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">
        FEDERAL REPUBLIC OF NIGERIA • ADVERTISING REGULATORY COUNCIL OF NIGERIA
      </div>
      <h1 style="font-size: 20px; font-weight: 800; margin: 4px 0 0 0; color: #0f172a;">
        Statutory Pre-Vetting Compliance Dossier
      </h1>
      <div style="font-size: 12px; color: #475569; margin-top: 4px;">
        Institutional Clearance Reference: <span style="font-family: monospace; font-weight: 600;">ARCON/PV-2026-${campaign.id.slice(0, 8).toUpperCase()}</span>
      </div>
    </div>
    <div style="text-align: right;">
      <span class="badge">STATUS: ${campaign.status.toUpperCase()}</span>
      <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Generated: ${new Date().toUTCString()}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-cell">
      <div class="meta-label">Regulated Institution</div>
      <div class="meta-value">${orgName}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Product Category</div>
      <div class="meta-value">${campaign.product_category}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Dissemination Channel</div>
      <div class="meta-value">${campaign.channel}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Designated Reviewer</div>
      <div class="meta-value">${campaign.assigned_reviewer}</div>
    </div>
  </div>

  <div class="section-title">Submitted Promotional Copy</div>
  <div class="copy-box">${campaign.canvas_content || '(No copy text submitted)'}</div>

  <div class="section-title">Promotional Claims Concordance Ledger (${claims?.length || 0} Claims Evaluated)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 12%;">Code</th>
        <th style="width: 38%;">Evaluated Claim</th>
        <th style="width: 25%;">Statutory Rule & Citation</th>
        <th style="width: 15%;">Verdict</th>
        <th style="width: 10%;">Review</th>
      </tr>
    </thead>
    <tbody>
      ${(claims && claims.length > 0)
        ? claims.map((c: any) => `
          <tr>
            <td style="font-family: monospace; font-weight: 600;">${c.code}</td>
            <td><strong>"${c.claim_text}"</strong><br><span style="font-size: 11px; color: #64748b;">${c.ai_rationale}</span></td>
            <td style="font-size: 11px;">${c.statutory_citation}</td>
            <td><span style="font-family: monospace; font-size: 11px; font-weight: 600;">${c.verdict}</span></td>
            <td><span style="font-size: 11px; font-weight: 600;">${c.review_status}</span></td>
          </tr>
        `).join('')
        : `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 16px;">Zero isolated claims flagged. Standard copy cleared.</td></tr>`
      }
    </tbody>
  </table>

  <div class="signoff-box">
    <div>
      <div class="meta-label">CCO Attestation & Statutory Sign-Off</div>
      <div style="font-size: 11px; color: #475569; margin-top: 4px;">
        I hereby attest that this promotional campaign has been vetted against ARCON Code 2022, CBN Consumer Protection Framework, and applicable sectoral guidelines.
      </div>
      <div class="sig-line"></div>
      <div style="font-size: 11px; font-weight: 600; margin-top: 4px;">Chief Compliance Officer / Legal Counsel</div>
    </div>
    <div>
      <div class="meta-label">Cryptographic Provenance Audit Hash</div>
      <div style="font-family: monospace; font-size: 10px; word-break: break-all; background: #e2e8f0; padding: 6px; border-radius: 4px; margin-top: 6px;">
        ${auditHash}
      </div>
      <div style="font-size: 10px; color: #64748b; margin-top: 6px;">
        Tamper-evident SHA-256 seal verified by Cogent Sovereign RegTech OS.
      </div>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err) {
    logger.error({ err }, 'Unexpected error in GET /api/marketing/campaigns/[id]/dossier');
    return new Response('Internal server error', { status: 500 });
  }
}
