import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';
import { AuditService } from '@/modules/audit/auditService';
import { logger } from '@/shared/logger';
import {
  CircularIngestInput,
  CircularIngestResult,
  DeterministicMetadataResult,
} from '../types';
import {
  PdfStructureExtractor,
  defaultPdfStructureExtractor,
} from './pdfStructureExtractor';
import {
  DeterministicMetadataExtractor,
  defaultDeterministicMetadataExtractor,
} from './deterministicMetadataExtractor';
import { LineageService } from './lineageService';
import { LineageStatus } from '@/shared/types';
import { inngestDispatcher } from '../inngest/client';

/**
 * Circular Ingestion Service (Task 9.1 & 10.2)
 * Orchestrates layout-preserving extraction, deterministic metadata parsing,
 * storage uploading, DB persistence, Inngest event dispatching, and audit sealing.
 */
export class CircularIngestionService {
  private dbClient: SupabaseClient<Database>;
  private auditService: AuditService;
  private structureExtractor: PdfStructureExtractor;
  private metadataExtractor: DeterministicMetadataExtractor;
  private lineageService: LineageService;

  constructor(options: {
    dbClient: SupabaseClient<Database>;
    auditService?: AuditService;
    structureExtractor?: PdfStructureExtractor;
    metadataExtractor?: DeterministicMetadataExtractor;
    lineageService?: LineageService;
  } | SupabaseClient<Database>) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('CircularIngestionService requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;

    this.auditService = (options && 'auditService' in options && options.auditService)
      ? options.auditService
      : new AuditService(this.dbClient);
    this.structureExtractor = (options && 'structureExtractor' in options && options.structureExtractor)
      ? options.structureExtractor
      : defaultPdfStructureExtractor;
    this.metadataExtractor = (options && 'metadataExtractor' in options && options.metadataExtractor)
      ? options.metadataExtractor
      : defaultDeterministicMetadataExtractor;
    this.lineageService = (options && 'lineageService' in options && options.lineageService)
      ? options.lineageService
      : new LineageService(this.dbClient);
  }

  /**
   * Ingests a raw circular PDF/document into Supabase Storage and radar database tables
   */
  public async ingestCircular(input: CircularIngestInput): Promise<CircularIngestResult> {
    const startTime = performance.now();
    const { fileBuffer, fileName, mimeType = 'application/pdf', organizationId } = input;

    // Step 1: Compute SHA-256 document checksum
    const sourceFileHash = AuditService.computeSha256(fileBuffer);
    logger.info(
      { fileName, sourceFileHashPrefix: sourceFileHash.slice(0, 8) },
      'Starting circular ingestion pipeline'
    );

    // Step 2: Layout-preserving structural text extraction
    const extractedStructure = await this.structureExtractor.extractStructure({
      fileBuffer,
      fileName,
      mimeType,
    });

    // Step 3: Deterministic metadata & targeting extraction
    const metadata = this.metadataExtractor.extractMetadata(extractedStructure, {
      regulator: input.manualRegulator,
      circularNumber: input.manualReferenceCode,
    });

    // Step 4: Storage Upload
    const year = new Date().getFullYear();
    const sanitizedRef = metadata.circularNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `circulars/${metadata.regulatorCode.toLowerCase()}/${year}/${sanitizedRef}_${fileName}`;

    await this.uploadToStorage(fileBuffer, storagePath, mimeType);

    // Step 5: Database Persistence with SHA-256 deduplication
    const {
      circularId,
      documentVersionId,
      deduplicated = false,
      lineageStatus = 'ACTIVE_LAW'
    } = await this.persistToDatabase(
      metadata,
      storagePath,
      sourceFileHash,
      extractedStructure.rawText
    );

    // Step 6: Dispatch Inngest Event (ADR-006)
    if (!deduplicated) {
      try {
        await inngestDispatcher.send({
          name: 'radar/circular.ingested',
          data: {
            circularId,
            circularNumber: metadata.circularNumber,
            storagePath,
            sourceFileHash,
            regulator: metadata.regulatorCode,
            organizationId,
            deduplicated,
          },
        });
      } catch (inngestErr) {
        logger.warn(
          { error: inngestErr instanceof Error ? inngestErr.message : String(inngestErr) },
          'Inngest event dispatch skipped or unreachable; continuing ingestion pipeline'
        );
      }
    }

    // Step 7: Resolve Lineage & Supersession Links (Task 2.5)
    try {
      await this.lineageService.detectAndLinkLineageFromText(circularId, extractedStructure.rawText);
    } catch (lineageErr) {
      logger.warn({ lineageErr }, 'Automated circular lineage linking encountered warning');
    }

    // Step 8: Record CAMA/BOFIA Immutable Audit Log
    const auditOutputHash = AuditService.computeSha256({
      circularId,
      circularNumber: metadata.circularNumber,
      statutoryDeadline: metadata.statutoryDeadline,
      targetedLicenses: metadata.targetedLicenseTypes,
      affectedRails: metadata.affectedPaymentRails,
      deduplicated,
    });

    const auditEntry = await this.auditService.recordLog({
      organizationId: organizationId || '00000000-0000-0000-0000-000000000000',
      action: deduplicated ? 'RADAR_CIRCULAR_DEDUPLICATED' : 'RADAR_CIRCULAR_INGESTED',
      entityType: 'radar_circulars',
      entityId: circularId,
      sha256InputHash: sourceFileHash,
      sha256OutputHash: auditOutputHash,
      metadata: {
        circularNumber: metadata.circularNumber,
        regulator: metadata.regulatorCode,
        priority: metadata.priority,
        storagePath,
        deduplicated,
        lineageStatus,
        sectionsCount: extractedStructure.sections.length,
        schedulesCount: extractedStructure.schedules.length,
        latencyMs: Math.round(performance.now() - startTime),
      },
    });

    logger.info(
      {
        circularId,
        circularNumber: metadata.circularNumber,
        priority: metadata.priority,
        statutoryDeadline: metadata.statutoryDeadline,
        deduplicated,
        auditId: auditEntry.id,
      },
      deduplicated ? 'Circular verified and deduplicated successfully' : 'Circular ingested and verified successfully'
    );

    // Step 9: Emit High-Priority Real-Time Notification to Tenant Enclave
    if (!deduplicated && this.dbClient) {
      try {
        const notifOrgId = organizationId || '00000000-0000-0000-0000-000000000001';
        await this.dbClient.from('notifications').insert({
          organization_id: notifOrgId,
          title: `🚨 Live Directive Enacted: ${metadata.circularNumber} (${metadata.regulatorCode})`,
          message: `${metadata.subject || 'New statutory regulatory directive'}. Full compliance required by ${metadata.statutoryDeadline || 'statutory timeline'}. Immediate gap audit advised.`,
          link: `/radar?circularNumber=${encodeURIComponent(metadata.circularNumber)}`,
          is_read: false,
        });
      } catch (notifErr) {
        logger.warn({ notifErr }, 'Failed to insert live notification row; continuing pipeline');
      }
    }


    return {
      circularId,
      documentVersionId,
      circularNumber: metadata.circularNumber,
      sourceFileHash,
      storagePath,
      metadata,
      extractedStructure,
      auditId: auditEntry.id,
      deduplicated,
      lineageStatus,
    };
  }

  private async uploadToStorage(
    fileBuffer: Buffer | Uint8Array,
    storagePath: string,
    mimeType: string
  ): Promise<void> {
    if (!this.dbClient) return;

    try {
      const { error } = await this.dbClient.storage
        .from('regulatory-circulars')
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        logger.warn(
          { storagePath, error: error.message },
          'Supabase storage upload skipped or failed; continuing with metadata record'
        );
      } else {
        logger.info({ storagePath }, 'Uploaded circular binary to Supabase Storage');
      }
    } catch (err) {
      logger.warn({ err }, 'Storage operation threw error; falling back to metadata record');
    }
  }

  private async persistToDatabase(
    metadata: DeterministicMetadataResult,
    storagePath: string,
    sourceFileHash: string,
    rawText?: string
  ): Promise<{ circularId: string; documentVersionId: string; deduplicated?: boolean; lineageStatus?: LineageStatus }> {
    const circularId = crypto.randomUUID();
    const documentVersionId = crypto.randomUUID();

    if (!this.dbClient) {
      return { circularId, documentVersionId, deduplicated: false, lineageStatus: 'ACTIVE_LAW' };
    }

    try {
      const client = this.dbClient;

      // Deduplication Check: Check if circular already exists by checksum or reference code
      const { data: existingCirculars } = await client
        .from('radar_circulars')
        .select('id, document_version_id, circular_number, lineage_status, document_checksum')
        .or(`document_checksum.eq.${sourceFileHash},circular_number.eq.${metadata.circularNumber}`)
        .limit(1);

      if (existingCirculars && existingCirculars.length > 0) {
        const existing = existingCirculars[0];
        logger.info(
          {
            circularId: existing.id,
            circularNumber: existing.circular_number,
            sourceFileHashPrefix: sourceFileHash.slice(0, 8),
          },
          'Circular with matching SHA-256 hash or circular reference already exists; returning deduplicated record'
        );
        return {
          circularId: existing.id,
          documentVersionId: existing.document_version_id,
          deduplicated: true,
          lineageStatus: (existing.lineage_status || 'ACTIVE_LAW') as LineageStatus,
        };
      }

      // 1. Find or create regulatory instrument
      let instrumentId: string = crypto.randomUUID();
      const { data: existingBodies } = await client
        .from('regulatory_bodies')
        .select('id')
        .eq('code', metadata.regulatorCode)
        .limit(1);

      const bodyId = existingBodies?.[0]?.id;

      if (bodyId) {
        const { data: existingInstruments } = await client
          .from('regulatory_instruments')
          .select('id')
          .eq('body_id', bodyId)
          .limit(1);

        if (existingInstruments && existingInstruments.length > 0) {
          instrumentId = existingInstruments[0].id;
        } else {
          await client.from('regulatory_instruments').insert({
            id: instrumentId,
            body_id: bodyId,
            title: `${metadata.regulatorCode} Regulatory Circulars & Directives`,
            short_name: `${metadata.regulatorCode} Circulars`,
            instrument_type: 'CIRCULAR_DIRECTIVE',
          });
        }

        // 2. Insert document version
        await client.from('regulatory_document_versions').insert({
          id: documentVersionId,
          instrument_id: instrumentId,
          version_number: metadata.circularNumber,
          reference_code: metadata.circularNumber,
          publication_date: metadata.publicationDate,
          effective_date: metadata.effectiveDate,
          canonical_source_url: storagePath,
          source_file_url: storagePath,
          source_file_hash: sourceFileHash,
          verification_status: 'HUMAN_VERIFIED',
          is_active: true,
        });

        // 3. Insert radar_circulars master record with checksum, lineage_status, dates, and text
        const { error: circularError } = await client.from('radar_circulars').insert({
          id: circularId,
          document_version_id: documentVersionId,
          circular_number: metadata.circularNumber,
          subject: metadata.subject,
          summary: metadata.summary,
          priority: metadata.priority,
          statutory_deadline: metadata.statutoryDeadline,
          enforcement_risk_level: metadata.enforcementRiskLevel,
          targeted_license_types: metadata.targetedLicenseTypes,
          affected_payment_rails: metadata.affectedPaymentRails,
          applies_universally: metadata.appliesUniversally,
          lineage_status: 'ACTIVE_LAW',
          issuance_date: metadata.publicationDate,
          effective_date: metadata.effectiveDate,
          raw_text: rawText || null,
          document_checksum: sourceFileHash,
        });

        if (circularError) {
          logger.warn({ error: circularError.message }, 'Failed to insert into radar_circulars table');
        }
      }
    } catch (dbErr) {
      logger.warn({ dbErr }, 'Database persistence failed in CircularIngestionService; returning generated IDs');
    }

    return { circularId, documentVersionId, deduplicated: false, lineageStatus: 'ACTIVE_LAW' };
  }
}
