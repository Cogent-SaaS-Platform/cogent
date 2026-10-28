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
import { ApplicabilityEngine } from './applicabilityEngine';
import { ClauseSegmentationEngine } from './clauseSegmentationEngine';
import { ObligationExtractionService } from './obligationExtractionService';
import { RoleSynthesisService } from './roleSynthesisService';

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
  private obligationExtractor: ObligationExtractionService;

  constructor(options: {
    dbClient: SupabaseClient<Database>;
    auditService?: AuditService;
    structureExtractor?: PdfStructureExtractor;
    metadataExtractor?: DeterministicMetadataExtractor;
    lineageService?: LineageService;
    obligationExtractor?: ObligationExtractionService;
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
    this.obligationExtractor = (options && 'obligationExtractor' in options && options.obligationExtractor)
      ? options.obligationExtractor
      : new ObligationExtractionService({ dbClient: this.dbClient });
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
      subject: input.manualSubject,
      publicationDate: input.manualPublicationDate,
    });

    // Step 4: Storage Upload
    const year = new Date().getFullYear();
    const sanitizedRef = metadata.circularNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `circulars/${metadata.regulatorCode.toLowerCase()}/${year}/${sanitizedRef}_${fileName}`;

    await this.uploadToStorage(fileBuffer, storagePath, mimeType);

    // Step 5: Database Persistence with SHA-256 deduplication and granular clause indexing
    const {
      circularId,
      documentVersionId,
      deduplicated = false,
      lineageStatus = 'ACTIVE_LAW'
    } = await this.persistToDatabase(
      metadata,
      storagePath,
      sourceFileHash,
      extractedStructure.rawText,
      extractedStructure.sections,
      input.sourceUrl,
      organizationId,
      input.provenance
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
    if (!deduplicated && this.dbClient && organizationId) {
      try {
        await this.dbClient.from('notifications').insert({
          organization_id: organizationId,
          title: `Statutory Directive Enacted: ${metadata.circularNumber} (${metadata.regulatorCode})`,
          message: `${metadata.subject || 'New statutory regulatory directive'}. Full compliance required by ${metadata.statutoryDeadline || 'prescribed timeline'}. Immediate gap audit advised.`,
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
    rawText?: string,
    sections?: Array<{ sectionNumber: string; heading: string; content: string }>,
    sourceUrl?: string,
    organizationId?: string,
    provenance?: 'PRIMARY' | 'SECONDARY' | 'MANUAL'
  ): Promise<{ circularId: string; documentVersionId: string; deduplicated?: boolean; lineageStatus?: LineageStatus }> {
    const circularId = crypto.randomUUID();
    const documentVersionId = crypto.randomUUID();

    if (!this.dbClient) {
      return { circularId, documentVersionId, deduplicated: false, lineageStatus: 'ACTIVE_LAW' };
    }

    try {
      const client = this.dbClient;

      // 1. Deduplication Check: Check if circular already exists by checksum or reference code
      const { data: existingCirculars } = await client
        .from('radar_circulars')
        .select('id, document_version_id, circular_number, lineage_status, document_checksum')
        .or(`document_checksum.eq.${sourceFileHash},circular_number.eq.${metadata.circularNumber}`)
        .limit(1);

      if (existingCirculars && existingCirculars.length > 0) {
        const existing = existingCirculars[0];
        const nowIso = new Date().toISOString();

        // 1. Bump radar_circulars timestamp and update subject if better metadata available
        const updatePayload: { created_at: string; subject?: string } = { created_at: nowIso };
        if (metadata.subject && metadata.subject.length > 10) {
          updatePayload.subject = metadata.subject;
        }
        await (client.from('radar_circulars').update as any)(updatePayload).eq('id', existing.id);

        // 2. Also bump the regulatory instrument timestamp and title so it surfaces at the top of Library
        if (existing.document_version_id) {
          const { data: ver } = await client
            .from('regulatory_document_versions')
            .select('instrument_id')
            .eq('id', existing.document_version_id)
            .maybeSingle();

          if (ver?.instrument_id) {
            const instPayload: { created_at: string; title?: string; short_name?: string } = { created_at: nowIso };
            if (metadata.subject && metadata.subject.length > 10) {
              instPayload.title = metadata.subject;
              instPayload.short_name = metadata.subject.length > 50 ? metadata.subject.slice(0, 47) + '...' : metadata.subject;
            }
            await (client.from('regulatory_instruments').update as any)(instPayload).eq('id', ver.instrument_id);
          }

          // 3. If this version has 0 clauses in the database, segment & persist them now!
          const { count: clauseCount } = await client
            .from('regulatory_clauses')
            .select('id', { count: 'exact', head: true })
            .eq('document_version_id', existing.document_version_id);

          if (!clauseCount || clauseCount === 0) {
            const segmentedClauses = ClauseSegmentationEngine.segmentAndDecompose({
              rawText,
              sections,
              regulatorCode: metadata.regulatorCode,
              circularNumber: metadata.circularNumber,
              subject: metadata.subject,
              priority: metadata.priority,
              statutoryDeadline: metadata.statutoryDeadline,
            });
            if (segmentedClauses.length > 0) {
              await ClauseSegmentationEngine.persistDocumentClauses(client, existing.document_version_id, segmentedClauses);
            }
          }
        }

        logger.info(
          {
            circularId: existing.id,
            circularNumber: existing.circular_number,
            sourceFileHashPrefix: sourceFileHash.slice(0, 8),
          },
          'Circular with matching SHA-256 hash or circular reference updated, timestamp bumped, and surfaced at top of Library'
        );
        return {
          circularId: existing.id,
          documentVersionId: existing.document_version_id,
          deduplicated: true,
          lineageStatus: (existing.lineage_status || 'ACTIVE_LAW') as LineageStatus,
        };
      }

      // 2. Resolve Regulatory Body & Regulatory Instrument
      let instrumentId: string = crypto.randomUUID();
      const { data: existingBodies } = await client
        .from('regulatory_bodies')
        .select('id')
        .eq('code', metadata.regulatorCode)
        .limit(1);

      const bodyId = existingBodies?.[0]?.id;

      if (bodyId) {
        // Match existing instrument by title, short name, or circular number
        const { data: matchedInst } = await client
          .from('regulatory_instruments')
          .select('id')
          .or(`short_name.ilike.%${metadata.circularNumber}%,title.ilike.%${metadata.subject || metadata.circularNumber}%`)
          .limit(1)
          .maybeSingle();

        if (matchedInst) {
          instrumentId = matchedInst.id;
          if (metadata.subject && metadata.subject.length > 10) {
            await client
              .from('regulatory_instruments')
              .update({
                title: metadata.subject,
                short_name: metadata.subject.length > 50 ? metadata.subject.slice(0, 47) + '...' : metadata.subject,
              })
              .eq('id', matchedInst.id);
          }
        } else {
          const instTitle = metadata.subject && metadata.subject.length > 10
            ? metadata.subject
            : `${metadata.regulatorCode} Regulatory Directive (${metadata.circularNumber})`;

          const shortName = metadata.subject && metadata.subject.length > 5
            ? (metadata.subject.length > 50 ? metadata.subject.slice(0, 47) + '...' : metadata.subject)
            : `${metadata.regulatorCode} Directive`;

          const { data: newInst } = await client
            .from('regulatory_instruments')
            .insert({
              id: instrumentId,
              body_id: bodyId,
              title: instTitle,
              short_name: shortName,
              instrument_type: 'CIRCULAR_DIRECTIVE',
            })
            .select('id')
            .single();

          if (newInst) {
            instrumentId = newInst.id;
          }
        }

        // 3. Insert document version with real canonical source URL and provenance
        const canonicalUrl = sourceUrl || storagePath;
        await client.from('regulatory_document_versions').insert({
          id: documentVersionId,
          instrument_id: instrumentId,
          version_number: '1.0',
          reference_code: metadata.circularNumber,
          publication_date: metadata.publicationDate,
          effective_date: metadata.effectiveDate,
          canonical_source_url: canonicalUrl,
          source_file_url: canonicalUrl,
          source_file_hash: sourceFileHash,
          verification_status: 'UNVERIFIED_INGESTION',
          verification_notes: 'Ingested via Cogent Automated Regulatory Ingestion Pipeline.',
          provenance: provenance || 'PRIMARY',
          is_active: true,
        });

        // 4. Insert radar_circulars master record
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
          source_tier: provenance || 'PRIMARY',
          issuance_date: metadata.publicationDate,
          effective_date: metadata.effectiveDate,
          raw_text: rawText || null,
          document_checksum: sourceFileHash,
        });

        if (circularError) {
          logger.warn({ error: circularError.message }, 'Failed to insert into radar_circulars table');
        }

        // 5. Adaptive Statutory Clause & Obligation Tokenization (Production Feature)
        const segmentedClauses = ClauseSegmentationEngine.segmentAndDecompose({
          rawText,
          sections,
          regulatorCode: metadata.regulatorCode,
          circularNumber: metadata.circularNumber,
          subject: metadata.subject,
          priority: metadata.priority,
          statutoryDeadline: metadata.statutoryDeadline,
        });

        // Enrich clauses with multi-obligation extraction and quote-to-source validation
        for (const clause of segmentedClauses) {
          try {
            const extractedObligations = await this.obligationExtractor.extractObligationsFromClause({
              clauseText: clause.clauseText,
              clauseReference: clause.sectionReference,
              sectionHeading: clause.sectionHeading,
              pageNumber: clause.pageNumber,
              regulatorCode: metadata.regulatorCode,
              circularNumber: metadata.circularNumber,
            });

            if (extractedObligations.length > 0) {
              clause.obligations = extractedObligations.map((o) => ({
                id: o.id,
                obligationType: o.obligationType,
                summary: o.summary,
                severityFloor: o.severityFloor,
                statutoryTimelineDays: o.statutoryTimelineDays,
                targetRole: 'Chief Compliance Officer',
                penalties: o.statedPenalty
                  ? [
                      {
                        penaltyMinNaira: o.statedPenalty.minNaira,
                        penaltyMaxNaira: o.statedPenalty.maxNaira,
                        dailyFineNaira: o.statedPenalty.dailyFineNaira,
                        carriesPersonalCriminalLiability: o.statedPenalty.carriesPersonalCriminalLiability,
                        carriesLicenseSuspensionRisk: o.statedPenalty.carriesLicenseSuspensionRisk,
                        penaltyLegalCitation: o.statedPenalty.citation,
                      },
                    ]
                  : [],
                actor: o.actor,
                action: o.action,
                object: o.object,
                condition: o.condition,
                deadline: o.deadline,
                verbatimQuote: o.verbatimQuote,
                startChar: o.startChar,
                endChar: o.endChar,
                targetedLicenses: o.targetedLicenses,
                affectedRails: o.affectedRails,
                appliesUniversally: o.appliesUniversally,
                isValidated: o.isValidated,
                groundingConfidence: o.groundingConfidence,
              }));
            }
          } catch (extractErr) {
            logger.warn({ extractErr, clauseRef: clause.sectionReference }, 'Clause multi-obligation extraction skipped');
          }
        }

        await ClauseSegmentationEngine.persistDocumentClauses(client, documentVersionId, segmentedClauses);

        // 6. Real-Time Tenant Impact Evaluation
        try {
          let orgQuery = client.from('organizations').select('id, name');
          if (organizationId) {
            orgQuery = (orgQuery as any).eq('id', organizationId);
          }
          const { data: orgs } = await orgQuery;
          if (orgs && orgs.length > 0) {
            for (const org of orgs) {
              const { data: licenses } = await client
                .from('tenant_licenses')
                .select('license_type, is_active')
                .eq('organization_id', org.id)
                .eq('is_active', true);

              const { data: rails } = await client
                .from('tenant_payment_rails')
                .select('rail_type, is_active')
                .eq('organization_id', org.id)
                .eq('is_active', true);

              const activeLicenses = (licenses || []).map((l: any) => l.license_type);
              const activeRails = (rails || []).map((r: any) => r.rail_type);

              const targetingCtx = {
                regulator: metadata.regulatorCode,
                targetedLicenses: metadata.targetedLicenseTypes,
                affectedRails: metadata.affectedPaymentRails,
                appliesUniversally: metadata.appliesUniversally,
              };

              const evalResult = ApplicabilityEngine.evaluatePure(
                { organizationId: org.id, activeLicenses, activeRails },
                targetingCtx
              );

              const roleSynth = new RoleSynthesisService({ dbClient: client });
              const synthesizedImpact = roleSynth.generateDeterministicFallback({
                circular: {
                  id: circularId,
                  circularNumber: metadata.circularNumber,
                  regulatorCode: metadata.regulatorCode,
                  subject: metadata.subject,
                  summary: metadata.summary,
                  statutoryDeadline: metadata.statutoryDeadline,
                  rawText,
                  sections,
                },
                tenant: {
                  organizationId: org.id,
                  organizationName: org.name,
                  matchedLicenses: evalResult.matchedLicenses,
                  matchedRails: evalResult.matchedRails,
                  applicabilityReason: evalResult.reason,
                },
              });

              const impactId = crypto.randomUUID();
              await client.from('radar_tenant_impacts').insert({
                id: impactId,
                organization_id: org.id,
                circular_id: circularId,
                is_applicable: evalResult.isApplicable,
                applicability_reason: evalResult.reason,
                executive_brief_cco: synthesizedImpact.executiveBriefCco,
                action_brief_coo: synthesizedImpact.actionBriefCoo,
                technical_brief_product_eng: synthesizedImpact.technicalBriefProductEng,
                financial_brief_cfo: synthesizedImpact.financialBriefCfo,
                role_briefs: synthesizedImpact,
                brief_cco: { brief: synthesizedImpact.executiveBriefCco },
                brief_cfo: { brief: synthesizedImpact.financialBriefCfo },
                brief_cto: { brief: synthesizedImpact.technicalBriefCto || synthesizedImpact.technicalBriefProductEng },
                brief_ceo_cro: { brief: synthesizedImpact.governanceBriefCeoCro || synthesizedImpact.actionBriefCoo },
                status: 'SYNTHESIZED',
              });

              if (evalResult.isApplicable && synthesizedImpact.actionChecklist?.length > 0) {
                const actionRows = synthesizedImpact.actionChecklist.map((act) => ({
                  organization_id: org.id,
                  impact_id: impactId,
                  target_department: act.targetDepartment,
                  action_title: act.actionTitle,
                  action_description: act.actionDescription,
                  suggested_deadline: act.suggestedDeadline,
                  is_completed: false,
                }));
                await client.from('radar_action_items').insert(actionRows);
              }
            }
          }
        } catch (impactErr) {
          logger.warn({ impactErr }, 'Tenant impact pre-computation encountered non-fatal error');
        }
      }
    } catch (dbErr) {
      logger.warn({ dbErr }, 'Database persistence failed in CircularIngestionService; returning generated IDs');
    }

    return { circularId, documentVersionId, deduplicated: false, lineageStatus: 'ACTIVE_LAW' };
  }
}
