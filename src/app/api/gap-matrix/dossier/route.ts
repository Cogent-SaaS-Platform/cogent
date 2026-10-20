import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { defaultDossierExportService } from '@/modules/gap-matrix/services/dossierExportService';
import { EntitlementEngine } from '@/shared/billing';
import { AppError } from '@/shared/errors';
import { logger } from '@/shared/logger';

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    EntitlementEngine.assertEngineActive(tenantCtx.subscription, '5-W Gap Matrix Audit Defense Dossier export');

    const body = await req.json();
    const { evaluationResult, organizationName, ccoName, notes } = body;

    if (!evaluationResult || !evaluationResult.evaluationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: evaluationResult' },
        { status: 400 }
      );
    }

    const dossier = defaultDossierExportService.generateDossier({
      evaluationResult,
      organizationName,
      ccoName,
      notes,
    });

    const markdown = defaultDossierExportService.generateMarkdownDossier(dossier);
    const html = defaultDossierExportService.generateHtmlDossier(dossier);

    return NextResponse.json({
      success: true,
      data: {
        dossier,
        markdown,
        html,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed generating audit defense dossier');
    return NextResponse.json(
      { error: err.message || 'Internal dossier generation error' },
      { status: 500 }
    );
  }
}
