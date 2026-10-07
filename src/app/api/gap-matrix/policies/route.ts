import { NextRequest, NextResponse } from 'next/server';
import { PolicyIngestionService } from '@/modules/gap-matrix/services/policyIngestionService';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

/**
 * GET /api/gap-matrix/policies
 * Returns all ingested policy documents for the authenticated tenant with clause counts and latest evaluations.
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const organizationId = tenantCtx.organizationId;
    const dbClient = tenantCtx.dbClient;

    const { data: policies, error } = await (dbClient as any)
      .from('policy_documents')
      .select(`
        id,
        title,
        department,
        version_tag,
        source_file_hash,
        storage_path,
        created_at,
        policy_clauses(count),
        gap_evaluations(
          id,
          overall_compliance_percentage,
          critical_gaps_count,
          partially_met_count,
          adequately_met_count,
          created_at
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error: error.message }, 'Failed retrieving tenant policy documents');
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const formattedPolicies = (policies || []).map((p: any) => {
      const clausesCount = Array.isArray(p.policy_clauses) && p.policy_clauses.length > 0
        ? p.policy_clauses[0].count
        : 0;
      const latestEvaluation = Array.isArray(p.gap_evaluations) && p.gap_evaluations.length > 0
        ? p.gap_evaluations[0]
        : null;

      return {
        id: p.id,
        title: p.title,
        department: p.department,
        versionTag: p.version_tag,
        sourceFileHash: p.source_file_hash,
        storagePath: p.storage_path,
        createdAt: p.created_at,
        clausesCount,
        latestEvaluation,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedPolicies,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error in GET /api/gap-matrix/policies');
    return NextResponse.json(
      { error: error.message || 'Failed retrieving policy documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gap-matrix/policies
 * Ingests an internal company policy manual into the tenant's private vault
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const tenantCtx = await getTenantContext();
    const policyIngestionService = new PolicyIngestionService({ dbClient: tenantCtx.dbClient });

    const organizationId = tenantCtx.organizationId;
    let title = 'Company Compliance Manual';
    let department = 'COMPLIANCE_LEGAL';
    let fileName = 'policy_document.txt';
    let rawText = '';
    let fileBuffer: Buffer | undefined;
    let mimeType = 'text/plain';
    let versionTag = '1.0';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      title = (formData.get('title') as string) || title;
      department = (formData.get('department') as string) || department;
      versionTag = (formData.get('versionTag') as string) || versionTag;

      const file = formData.get('file') as File | null;
      if (file) {
        fileName = file.name;
        mimeType = file.type || 'application/pdf';
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } else {
        rawText = (formData.get('rawText') as string) || '';
      }
    } else {
      const json = await req.json();
      title = json.title || title;
      department = json.department || department;
      versionTag = json.versionTag || versionTag;
      fileName = json.fileName || fileName;
      rawText = json.rawText || '';
      mimeType = json.mimeType || 'text/plain';
    }

    if (!rawText && !fileBuffer) {
      return NextResponse.json(
        { error: 'Neither file nor rawText provided for ingestion' },
        { status: 400 }
      );
    }

    const document = await policyIngestionService.ingestPolicy({
      organizationId,
      title,
      department: department as any,
      versionTag,
      fileName,
      mimeType,
      fileBuffer,
      rawText: rawText || undefined,
    });

    const isDeduplicated = Boolean((document as any).deduplicated);
    const statusCode = isDeduplicated ? 409 : 201;

    return NextResponse.json({
      success: !isDeduplicated,
      deduplicated: isDeduplicated,
      message: isDeduplicated
        ? 'Policy document with matching SHA-256 checksum already exists (deduplicated)'
        : 'Policy document ingested and indexed successfully',
      data: document,
    }, { status: statusCode });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed ingesting internal policy document');
    return NextResponse.json(
      { error: error.message || 'Internal ingestion error' },
      { status: 500 }
    );
  }
}
