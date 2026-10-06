import { NextRequest, NextResponse } from 'next/server';
import { defaultPolicyIngestionService } from '@/modules/gap-matrix/services/policyIngestionService';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const tenantCtx = await getTenantContext();
    
    let organizationId = tenantCtx.organizationId;
    let title = 'Company Compliance Manual';
    let department = 'COMPLIANCE_LEGAL';
    let fileName = 'policy_document.txt';
    let rawText = '';
    let fileBuffer: Buffer | undefined;
    let mimeType = 'text/plain';

    let versionTag = '1.0';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      organizationId = (formData.get('organizationId') as string) || organizationId;
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
      organizationId = json.organizationId || organizationId;
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

    const document = await defaultPolicyIngestionService.ingestPolicy({
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

    return NextResponse.json(
      {
        success: !isDeduplicated,
        deduplicated: isDeduplicated,
        message: isDeduplicated
          ? 'Policy document with matching SHA-256 checksum already exists (deduplicated)'
          : 'Policy document ingested and indexed successfully',
        data: document,
      },
      { status: statusCode }
    );
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed ingesting internal policy document');
    return NextResponse.json(
      { error: error.message || 'Internal ingestion error' },
      { status: 500 }
    );
  }
}
