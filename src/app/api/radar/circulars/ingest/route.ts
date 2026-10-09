import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { CircularIngestionService } from '@/modules/radar/services/circularIngestionService';
import { logger } from '@/shared/logger';
import { RegulatorCode } from '@/shared/types';

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const circularIngestionService = new CircularIngestionService({ dbClient: tenantCtx.dbClient });
    const contentType = req.headers.get('content-type') || '';

    let fileBuffer: Buffer;
    let fileName = 'circular.pdf';
    let mimeType = 'application/pdf';
    let manualRegulator: RegulatorCode | undefined;
    let manualReferenceCode: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided in multipart/form-data request' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = file.name || 'circular.pdf';
      mimeType = file.type || 'application/pdf';

      const regulatorVal = formData.get('regulator') as string | null;
      if (regulatorVal && ['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU'].includes(regulatorVal)) {
        manualRegulator = regulatorVal as RegulatorCode;
      }
      manualReferenceCode = (formData.get('referenceCode') as string) || undefined;
    } else {
      // JSON payload support
      const body = await req.json();
      const rawText = body.rawText || '';

      if (!rawText && !body.base64Content) {
        return NextResponse.json(
          { error: 'Invalid JSON request: Provide either rawText or base64Content' },
          { status: 400 }
        );
      }

      if (body.base64Content) {
        fileBuffer = Buffer.from(body.base64Content, 'base64');
      } else {
        fileBuffer = Buffer.from(rawText, 'utf8');
        mimeType = 'text/plain';
      }

      fileName = body.fileName || 'circular.txt';
      if (body.regulator && ['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU'].includes(body.regulator)) {
        manualRegulator = body.regulator as RegulatorCode;
      }
      manualReferenceCode = body.referenceCode;
    }

    const result = await circularIngestionService.ingestCircular({
      fileBuffer,
      fileName,
      mimeType,
      manualRegulator,
      manualReferenceCode,
    });

    const statusCode = result.deduplicated ? 409 : 201;

    return NextResponse.json(
      {
        success: !result.deduplicated,
        deduplicated: result.deduplicated,
        message: result.deduplicated
          ? 'Circular with matching SHA-256 checksum or reference code already exists (deduplicated)'
          : 'Circular successfully ingested and indexed',
        data: result,
      },
      { status: statusCode }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Error in /api/radar/circulars/ingest');
    return NextResponse.json(
      {
        error: err.message || 'Internal circular ingestion failure',
      },
      { status: 500 }
    );
  }
}
