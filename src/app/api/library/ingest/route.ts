import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { DomSanitizer } from '@/modules/radar/services/domSanitizer';
import { resilientFetch } from '@/shared/network/resilientHttp';
import { RegulatoryExtractionService } from '@/modules/regulatory/services/regulatoryExtractionService';
import { uploadDocument, getPresignedDownloadUrl } from '@/shared/storage';
import { verifyEntitlement } from '@/lib/plans';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const db = createAdminClient();

    // 0. Quota & Plan Entitlement Verification
    const entitlement = await verifyEntitlement(db, tenantCtx.organizationId, 'CUSTOM_REGULATION_INGEST');
    if (!entitlement.allowed) {
      return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
    }

    const contentType = req.headers.get('content-type') || '';

    let cleanText = '';
    let documentTitle = '';
    let regulatorCode = 'CBN';
    let sourceUrl: string | null = null;
    let sourceFileUrl: string | null = null;
    let sourceFileHash: string | null = null;
    let fileName = 'regulation.pdf';
    let fileBuffer: Buffer | null = null;

    // MODE A: Multipart PDF Upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const regulator = formData.get('regulator') as string | null;
      const customTitle = formData.get('title') as string | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No PDF file provided. Please upload a valid regulatory PDF.' },
          { status: 400 }
        );
      }

      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        return NextResponse.json(
          { success: false, error: 'Unsupported file format. Strictly official PDF regulatory instruments only.' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = file.name;
      sourceFileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Upload to R2 for source document viewing
      try {
        const storageKey = `library/instruments/${sourceFileHash}_${fileName}`;
        await uploadDocument(process.env.R2_BUCKET_NAME || 'cogent-prod-storage', storageKey, fileBuffer, 'application/pdf');
        sourceFileUrl = await getPresignedDownloadUrl(storageKey, 86400 * 7); // 7-day valid presigned URL
      } catch (storageErr: any) {
        logger.warn({ error: storageErr.message }, 'R2 storage upload warning, continuing with in-memory buffer');
      }

      // Extract text from PDF using unpdf
      cleanText = await DomSanitizer.extractPdfText(fileBuffer);

      if (!cleanText || cleanText.length < 50) {
        return NextResponse.json(
          { success: false, error: 'Unable to extract legible text from this PDF document. Please verify it is not scanned image-only or password-protected.' },
          { status: 422 }
        );
      }

      regulatorCode = regulator?.toUpperCase() || 'CBN';
      documentTitle = customTitle?.trim() || fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
    }

    // MODE B: Regulator Web URL
    else {
      const body = await req.json();
      const rawUrl = body.url ? String(body.url).trim() : null;
      const regulator = body.regulator as string | null;
      const customTitle = body.title as string | null;

      if (!rawUrl) {
        return NextResponse.json(
          { success: false, error: 'No URL provided. Please provide an official regulator webpage URL.' },
          { status: 400 }
        );
      }

      sourceUrl = rawUrl;

      // Fetch webpage with resilient DNS & headers
      try {
        const resp = await resilientFetch(rawUrl, { timeoutMs: 12000 });
        const ct = resp.headers['content-type'];
        const contentTypeHeader = (Array.isArray(ct) ? ct.join(' ') : (ct || '')).toLowerCase();

        // If the URL directly points to a PDF
        if (contentTypeHeader.includes('application/pdf') || rawUrl.toLowerCase().endsWith('.pdf')) {
          fileBuffer = await resp.buffer();
          sourceFileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          cleanText = await DomSanitizer.extractPdfText(fileBuffer);
          documentTitle = customTitle || rawUrl.split('/').pop()?.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ') || 'Regulatory Directive';

          try {
            const storageKey = `library/instruments/${sourceFileHash}_directive.pdf`;
            await uploadDocument(process.env.R2_BUCKET_NAME || 'cogent-prod-storage', storageKey, fileBuffer, 'application/pdf');
            sourceFileUrl = await getPresignedDownloadUrl(storageKey, 86400 * 7);
          } catch {}
        } else {
          // Webpage HTML Article
          const html = await resp.text();

          // Reject bot challenge pages
          if (
            html.includes('challenges.cloudflare.com') ||
            html.includes('Enable JavaScript and cookies to continue') ||
            resp.status === 403 ||
            resp.status === 503
          ) {
            return NextResponse.json(
              {
                success: false,
                error: 'The regulatory portal is behind Cloudflare bot verification. Please download the official PDF and upload it directly.',
              },
              { status: 422 }
            );
          }

          // Extract title
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          const rawScrapedTitle = (titleMatch ? titleMatch[1] : (h1Match ? h1Match[1] : 'Regulatory Directive')).trim();
          documentTitle = customTitle?.trim() || DomSanitizer.cleanTitle(rawScrapedTitle);

          // Priority 1: Check for attached PDF in the webpage
          const pdfLinks = DomSanitizer.extractPdfLinks(html, rawUrl);
          let pdfExtracted = false;

          if (pdfLinks.length > 0) {
            try {
              const pdfResp = await resilientFetch(pdfLinks[0]);
              if (pdfResp.ok) {
                const pdfBuf = await pdfResp.buffer();
                if (pdfBuf && pdfBuf.length > 100) {
                  const extracted = await DomSanitizer.extractPdfText(pdfBuf);
                  if (extracted.length > 100) {
                    cleanText = extracted;
                    fileBuffer = pdfBuf;
                    sourceFileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                    pdfExtracted = true;

                    try {
                      const storageKey = `library/instruments/${sourceFileHash}_attached.pdf`;
                      await uploadDocument(process.env.R2_BUCKET_NAME || 'cogent-prod-storage', storageKey, fileBuffer, 'application/pdf');
                      sourceFileUrl = await getPresignedDownloadUrl(storageKey, 86400 * 7);
                    } catch {}
                  }
                }
              }
            } catch (pErr) {
              logger.warn({ error: String(pErr) }, 'Could not download attached PDF from portal');
            }
          }

          // Priority 2: Extract clean substantive DOM article
          if (!pdfExtracted) {
            cleanText = DomSanitizer.extractArticleContent(html, { baseUrl: rawUrl });
            sourceFileHash = crypto.createHash('sha256').update(cleanText).digest('hex');
          }
        }
      } catch (fetchErr: any) {
        return NextResponse.json(
          { success: false, error: `Failed to fetch regulator portal: ${fetchErr.message}` },
          { status: 502 }
        );
      }

      // Infer regulator from URL if not specified
      if (regulator) {
        regulatorCode = regulator.toUpperCase();
      } else if (rawUrl.includes('cbn.gov.ng')) regulatorCode = 'CBN';
      else if (rawUrl.includes('sec.gov.ng')) regulatorCode = 'SEC';
      else if (rawUrl.includes('ndpc.gov.ng')) regulatorCode = 'NDPC';
      else if (rawUrl.includes('fccpc.gov.ng')) regulatorCode = 'FCCPC';
      else if (rawUrl.includes('arcon.gov.ng')) regulatorCode = 'ARCON';
      else if (rawUrl.includes('bog.gov.gh')) regulatorCode = 'BOG';
      else regulatorCode = 'CBN';
    }

    // STATUTORY ELIGIBILITY GATE: Reject junk, study tours, or empty pages
    if (DomSanitizer.isJunkTitle(documentTitle)) {
      return NextResponse.json(
        {
          success: false,
          error: `Document rejected by Statutory Eligibility Gate: "${documentTitle}" is a general portal navigation page or non-binding administrative item, not an enacted statutory instrument.`,
        },
        { status: 422 }
      );
    }

    if (!cleanText || cleanText.length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'The extracted text was insufficient (less than 50 characters) to identify binding regulatory compliance obligations.',
        },
        { status: 422 }
      );
    }

    // RUN STRUCTURED STATUTORY EXTRACTION PIPELINE
    const extractionService = new RegulatoryExtractionService();
    const extractedData = await extractionService.extractRegulationAndObligations({
      cleanText,
      title: documentTitle,
      regulatorCode,
      sourceUrl,
      year: new Date().getFullYear(),
    });

    // PERSIST EXTRACTED INSTRUMENT, SECTIONS, OBLIGATIONS & CRITERIA
    const persisted = await extractionService.persistExtractedInstrument(db, {
      title: documentTitle,
      regulatorCode,
      sourceUrl,
      sourceFileUrl,
      sourceFileHash,
      extracted: extractedData,
      capturedText: cleanText,
      owner: 'Chief Compliance Officer',
      organizationId: tenantCtx.organizationId,
      userId: tenantCtx.userId,
    });

    const pubDate = extractedData.publicationDate || null;
    const effDate = extractedData.entryIntoForceDate || null;
    const enactedYear = pubDate
      ? new Date(pubDate).getFullYear() || new Date().getFullYear()
      : new Date().getFullYear();

    return NextResponse.json({
      success: true,
      message: 'Statutory regulation successfully ingested, synthesized, and indexed.',
      instrumentId: persisted.instrumentId,
      versionId: persisted.versionId,
      sectionsCount: persisted.sectionsCount,
      obligationsCount: persisted.obligationsCount,
      instrument: {
        id: persisted.instrumentId,
        shortTitle:
          documentTitle.length > 90 ? `${documentTitle.slice(0, 87)}...` : documentTitle,
        fullTitle: documentTitle,
        officialCitation:
          extractedData.officialReferenceCode || `${regulatorCode} (${enactedYear})`,
        regulator: regulatorCode as any,
        regulatorName: regulatorCode,
        instrumentType: (extractedData.instrumentType as any) || 'SUBSIDIARY_REGULATION',
        domain: (extractedData.domain as any) || 'FINTECH_PAYMENTS',
        jurisdiction: 'NG',
        classification:
          extractedData.instrumentType === 'PRIMARY_ACT'
            ? 'PRIMARY_LEGISLATION'
            : 'SUBSIDIARY_REGULATION',
        year: enactedYear,
        sectionsCount: persisted.sectionsCount,
        totalObligationsCount: persisted.obligationsCount,
        status: 'ACTIVE_LAW',
        description: extractedData.overview,
        overview: extractedData.overview,
        scope: extractedData.scope,
        keyRequirementAreas: extractedData.keyRequirementAreas,
        activeVersionId: persisted.versionId,
        publicationDate: pubDate,
        effectiveDate: effDate,
        sourceFileUrl: sourceFileUrl || sourceUrl || null,
        isStarred: false,
        owner: 'Chief Compliance Officer',
        capturedText: cleanText,
      },
    });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed in POST /api/library/ingest');
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error ingesting regulatory instrument' },
      { status: 500 }
    );
  }
}
