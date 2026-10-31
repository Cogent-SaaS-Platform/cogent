import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { CircularIngestionService } from '@/modules/radar/services/circularIngestionService';
import { logger } from '@/shared/logger';
import { RegulatorCode } from '@/shared/types';
import { resilientFetch } from '@/shared/network/resilientHttp';

import { DomSanitizer } from '@/modules/radar/services/domSanitizer';

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    
    // Ingestion into master statutory library requires administrative persistence authority
    let dbClient = tenantCtx.dbClient;
    try {
      const { createAdminClient } = await import('@/shared/db');
      dbClient = createAdminClient();
    } catch {
      // Fallback to tenant client
    }

    const circularIngestionService = new CircularIngestionService({ dbClient });
    const contentType = req.headers.get('content-type') || '';

    let fileBuffer: Buffer = Buffer.alloc(0);
    let fileName = 'circular.pdf';
    let mimeType = 'application/pdf';
    let manualRegulator: RegulatorCode | undefined;
    let manualReferenceCode: string | undefined;
    let manualSubject: string | undefined;
    let sourceUrl: string | undefined;

    const validRegulators = ['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC', 'BOG', 'CBK', 'SARB'];

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
      if (regulatorVal && validRegulators.includes(regulatorVal)) {
        manualRegulator = regulatorVal as RegulatorCode;
      }
      manualReferenceCode = (formData.get('referenceCode') as string) || undefined;
      manualSubject = (formData.get('subject') as string) || undefined;
    } else {
      // JSON payload support (supports rawText, base64Content, OR direct web URL/portal)
      const body = await req.json();

      if (body.url) {
        // Direct Web Portal / Framework Ingestion (e.g. https://www.cbn.gov.ng/PaymentsSystem/ or SEC notice)
        const normalizedUrl = String(body.url).trim();
        sourceUrl = normalizedUrl;
        logger.info({ url: sourceUrl }, 'Fetching regulatory document or portal from URL');

        try {
          const resp = await resilientFetch(normalizedUrl);
          const ct = resp.headers['content-type'];
          const contentTypeHeader = (Array.isArray(ct) ? ct.join(' ') : (ct || '')).toLowerCase();
          const isDirectPdf = contentTypeHeader.includes('application/pdf') || normalizedUrl.toLowerCase().endsWith('.pdf');

          if (isDirectPdf) {
            fileBuffer = await resp.buffer();
            mimeType = 'application/pdf';
            const urlFileName = normalizedUrl.split('/').pop()?.split('?')[0] || 'circular.pdf';
            fileName = urlFileName.endsWith('.pdf') ? urlFileName : `${urlFileName}.pdf`;
            manualSubject = body.subject || fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
          } else {
            const html = await resp.text();

            // Extract title
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            const rawTitle = (titleMatch ? titleMatch[1] : (h1Match ? h1Match[1] : 'Regulatory Framework Directive'))
              .replace(/\s+/g, ' ')
              .trim();

            // Reject bot challenge pages (Cloudflare Turnstile, Just a moment..., 403 Forbidden)
            const isBotChallenge =
              rawTitle.toLowerCase().includes('just a moment') ||
              html.includes('Enable JavaScript and cookies to continue') ||
              html.includes('challenges.cloudflare.com') ||
              html.includes('cf-browser-verification') ||
              resp.status === 403 ||
              resp.status === 503;

            if (isBotChallenge) {
              return NextResponse.json(
                {
                  success: false,
                  error:
                    'The remote regulatory portal is protected by Cloudflare bot challenge verification. Please download the official circular PDF and upload it directly or paste its text into Cogent.',
                },
                { status: 422 }
              );
            }

            manualSubject = DomSanitizer.cleanTitle(body.subject || rawTitle) || 'Regulatory Framework Directive';

            // Priority 1: Check if official PDF attachment is linked in the HTML page
            const pdfLinks = DomSanitizer.extractPdfLinks(html, normalizedUrl);
            let downloadedPdf = false;

            if (pdfLinks.length > 0) {
              try {
                const pdfRes = await resilientFetch(pdfLinks[0]);
                if (pdfRes && pdfRes.ok) {
                  const pdfBuf = await pdfRes.buffer();
                  if (pdfBuf && pdfBuf.length > 100) {
                    fileBuffer = pdfBuf;
                    mimeType = 'application/pdf';
                    fileName = `${(manualSubject || 'circular').slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                    downloadedPdf = true;
                    logger.info({ pdfUrl: pdfLinks[0], bytes: fileBuffer.length }, 'Successfully ingested linked regulatory PDF attachment from portal');
                  }
                }
              } catch (pdfErr) {
                logger.warn({ err: String(pdfErr), pdfUrl: pdfLinks[0] }, 'Failed downloading attached PDF; falling back to sanitized DOM text');
              }
            }

            // Priority 2: Fall back to targeted DOM extraction if no PDF attachment
            if (!downloadedPdf) {
              const cleanText = DomSanitizer.extractArticleContent(html, { baseUrl: normalizedUrl });

              if (cleanText.length < 50) {
                return NextResponse.json(
                  {
                    success: false,
                    error: 'The provided portal URL did not contain sufficient textual regulatory content to parse.',
                  },
                  { status: 422 }
                );
              }

              fileBuffer = Buffer.from(cleanText, 'utf8');
              mimeType = 'text/plain';
              fileName = `${(manualSubject || 'web_framework').slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
            }
          }

          // Detect regulator from URL if not specified
          if (!manualRegulator) {
            if (normalizedUrl.includes('cbn.gov.ng')) manualRegulator = 'CBN';
            else if (normalizedUrl.includes('sec.gov.ng')) manualRegulator = 'SEC';
            else if (normalizedUrl.includes('bog.gov.gh')) manualRegulator = 'BOG';
            else if (normalizedUrl.includes('centralbank.go.ke')) manualRegulator = 'CBK';
            else if (normalizedUrl.includes('resbank.co.za')) manualRegulator = 'SARB';
            else if (normalizedUrl.includes('ndpc.gov.ng')) manualRegulator = 'NDPC';
            else if (normalizedUrl.includes('fccpc.gov.ng')) manualRegulator = 'FCCPC';
            else if (normalizedUrl.includes('nfiu.gov.ng')) manualRegulator = 'NFIU';
            else if (normalizedUrl.includes('ndic.gov.ng')) manualRegulator = 'NDIC';
          }

          if (!manualReferenceCode) {
            const rawSlug = normalizedUrl.replace(/\/+$/, '').split('/').pop() || 'DIRECTIVE';
            const cleanSlug = DomSanitizer.cleanSlug(rawSlug);
            const regPrefix = manualRegulator || 'REG';
            manualReferenceCode = `${regPrefix}/${cleanSlug}`;
          }
        } catch (fetchErr) {
          const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          return NextResponse.json(
            { error: `Failed to fetch content from portal URL: ${msg}` },
            { status: 502 }
          );
        }
      } else if (body.base64Content) {
        fileBuffer = Buffer.from(body.base64Content, 'base64');
        fileName = body.fileName || 'circular.pdf';
        mimeType = body.mimeType || 'application/pdf';
      } else if (body.rawText !== undefined) {
        const cleanRaw = String(body.rawText).trim();
        if (cleanRaw.length < 50) {
          return NextResponse.json(
            {
              success: false,
              error: 'The provided rawText did not contain sufficient textual regulatory content to parse (minimum 50 characters).',
            },
            { status: 422 }
          );
        }
        fileBuffer = Buffer.from(cleanRaw, 'utf8');
        mimeType = 'text/plain';
        fileName = body.fileName || 'circular.txt';
      } else {
        return NextResponse.json(
          { error: 'Invalid JSON request: Provide url, rawText, or base64Content' },
          { status: 400 }
        );
      }

      if (body.regulator && validRegulators.includes(body.regulator)) {
        manualRegulator = body.regulator as RegulatorCode;
      }
      if (body.referenceCode) {
        manualReferenceCode = body.referenceCode;
      }
      if (body.subject && !manualSubject) {
        manualSubject = body.subject;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No document content was provided or extracted.' },
        { status: 400 }
      );
    }

    const result = await circularIngestionService.ingestCircular({
      fileBuffer,
      fileName,
      mimeType,
      manualRegulator,
      manualReferenceCode,
      manualSubject,
      sourceUrl,
      organizationId: tenantCtx.organizationId,
    });

    const statusCode = result.deduplicated ? 409 : 201;

    return NextResponse.json(
      {
        success: !result.deduplicated,
        deduplicated: result.deduplicated,
        message: result.deduplicated
          ? 'Circular with matching SHA-256 checksum or reference code already exists (deduplicated)'
          : 'Circular successfully ingested and indexed into compliance pipeline',
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
