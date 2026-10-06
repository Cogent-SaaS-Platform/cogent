import { NextRequest, NextResponse } from 'next/server';
import { defaultDossierExportService } from '@/modules/gap-matrix/services/dossierExportService';
import { logger } from '@/shared/logger';

export async function POST(req: NextRequest) {
  try {
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
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed generating audit defense dossier');
    return NextResponse.json(
      { error: error.message || 'Internal dossier generation error' },
      { status: 500 }
    );
  }
}
