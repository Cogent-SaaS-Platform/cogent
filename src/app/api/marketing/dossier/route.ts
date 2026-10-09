import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ArconDossierService, AuditService } from '@/modules/audit';
import { AuditDefenseExporter, DefensePackRegulator } from '@/modules/marketing-shield/auditDefenseExporter';
import { logger } from '@/shared/logger';
import { MarketingShieldViewModel } from '@/shared/types/presentation';
import { getTenantContext } from '@/shared/auth';

const DossierPostSchema = z.object({
  scanId: z.string().optional(),
  viewModel: z
    .custom<MarketingShieldViewModel>((val) => typeof val === 'object' && val !== null)
    .optional(),
  regulator: z.enum(['ARCON', 'CBN'] as const).default('ARCON'),
  format: z.enum(['markdown', 'html', 'pdf']).default('html'),
  applicantCcoName: z.string().optional(),
  applicantCcoTitle: z.string().optional(),
  attestationNotes: z.string().optional(),
  attestationHash: z.string().optional(),
  organizationName: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get('scanId');
    const regulator = (searchParams.get('regulator')?.toUpperCase() || 'ARCON') as DefensePackRegulator;
    const format = searchParams.get('format') || 'html';

    if (!scanId) {
      return NextResponse.json(
        { success: false, error: 'scanId query parameter is required' },
        { status: 400 }
      );
    }

    const exporter = new AuditDefenseExporter(tenantCtx.dbClient);
    const defensePackData = await exporter.loadDefensePackData(
      scanId,
      tenantCtx.organizationId,
      regulator
    );

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: defensePackData,
      });
    }

    const html = exporter.generateHtml(defensePackData);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="DEFENSE_PACK_${regulator}_${scanId.substring(0, 8)}.html"`,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed to fetch audit defense pack');
    return NextResponse.json(
      { success: false, error: err.message || 'Error generating defense pack' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const body = await req.json();
    const validationResult = DossierPostSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      scanId,
      viewModel,
      regulator,
      format,
      applicantCcoName = 'Olumide Adebayo, Esq.',
      applicantCcoTitle = 'Chief Compliance Officer',
      attestationNotes,
      attestationHash,
      organizationName = 'Cogent Enterprise FinTech',
    } = validationResult.data;

    let content: string;
    let contentType = 'text/html; charset=utf-8';
    let extension = 'html';

    // If scanId provided, load authoritative data directly from database
    if (scanId) {
      const exporter = new AuditDefenseExporter(tenantCtx.dbClient);
      const defensePackData = await exporter.loadDefensePackData(
        scanId,
        tenantCtx.organizationId,
        regulator
      );

      if (applicantCcoName) defensePackData.ccoName = applicantCcoName;
      if (applicantCcoTitle) defensePackData.ccoTitle = applicantCcoTitle;
      if (attestationNotes) defensePackData.attestationNotes = attestationNotes;
      if (attestationHash) defensePackData.attestationHash = attestationHash;

      content = exporter.generateHtml(defensePackData);
    } else if (viewModel) {
      if (format === 'html' || format === 'pdf') {
        content = ArconDossierService.generateHtmlDossier({
          viewModel,
          organizationName,
          organizationId: tenantCtx.organizationId,
          applicantCcoName,
          applicantCcoTitle,
          attestationNotes,
          attestationHash,
        });
      } else {
        content = ArconDossierService.generateMarkdownDossier({
          viewModel,
          organizationName,
          organizationId: tenantCtx.organizationId,
          applicantCcoName,
          applicantCcoTitle,
          attestationNotes,
          attestationHash,
        });
        contentType = 'text/markdown; charset=utf-8';
        extension = 'md';
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Either scanId or viewModel must be provided' },
        { status: 400 }
      );
    }

    const contentHash = AuditService.computeSha256(content);
    const campaignTitle = viewModel?.title || scanId || 'Campaign';
    const sanitizedTitle = campaignTitle.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    const filename = `${regulator}_Defense_Dossier_${sanitizedTitle}.${extension}`;

    // Commit append-only record to immutable audit ledger
    const auditService = new AuditService(tenantCtx.dbClient);
    await auditService.recordLog({
      organizationId: tenantCtx.organizationId,
      action: `${regulator}_DOSSIER_EXPORTED`,
      entityType: 'marketing_scans',
      entityId: scanId || tenantCtx.organizationId,
      sha256InputHash:
        viewModel?.telemetry?.auditHash ||
        AuditService.computeSha256(viewModel?.originalCopy || scanId || ''),
      sha256OutputHash: contentHash,
      metadata: {
        campaignName: campaignTitle,
        format,
        filename,
        regulator,
        applicantCcoName,
        applicantCcoTitle,
      },
    });

    logger.info(
      {
        filename,
        format,
        regulator,
        contentLength: content.length,
        contentHashPrefix: contentHash.substring(0, 8),
      },
      'Audit Defense Pack exported successfully'
    );

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Audit-Hash': contentHash,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed to export audit defense pack');
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error exporting defense pack' },
      { status: 500 }
    );
  }
}
