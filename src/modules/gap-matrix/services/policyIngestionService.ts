import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, createAdminClient, createClient } from '@/shared/db';
import { AuditService } from '@/modules/audit/auditService';
import { logger } from '@/shared/logger';
import {
  PolicyIngestInput,
  PolicyIngestResult,
} from '../types';
import {
  PolicyStructureExtractor,
  defaultPolicyStructureExtractor,
} from './policyStructureExtractor';
import {
  PolicyVectorIndexService,
  defaultPolicyVectorIndexService,
} from './policyVectorIndexService';
import { inngestGapMatrixDispatcher } from '../inngest/client';

/**
 * Policy Document Ingestion & Chunking Service (Epic 14 / Task 14.1 & 14.2)
 * Handles PDF/DOCX/Text upload, storage pathing (policies/{org_id}/{policy_id}/),
 * structural heading extraction, 768d clause vector indexing, and immutable audit sealing.
 */
export class PolicyIngestionService {
  private dbClient: SupabaseClient<Database> | null = null;
  private auditService: AuditService;
  private structureExtractor: PolicyStructureExtractor;
  private vectorIndexService: PolicyVectorIndexService;

  constructor(options?: {
    dbClient?: SupabaseClient<Database>;
    auditService?: AuditService;
    structureExtractor?: PolicyStructureExtractor;
    vectorIndexService?: PolicyVectorIndexService;
  }) {
    if (options?.dbClient) {
      this.dbClient = options.dbClient;
    } else {
      try {
        this.dbClient = createAdminClient();
      } catch {
        try {
          this.dbClient = createClient();
        } catch {
          this.dbClient = null;
        }
      }
    }

    this.auditService = options?.auditService || new AuditService(this.dbClient as any);
    this.structureExtractor = options?.structureExtractor || defaultPolicyStructureExtractor;
    this.vectorIndexService = options?.vectorIndexService || defaultPolicyVectorIndexService;
  }

  /**
   * Ingests an internal company policy manual into the tenant's private vault
   */
  public async ingestPolicy(input: PolicyIngestInput): Promise<PolicyIngestResult> {
    const startTime = performance.now();
    const policyId = crypto.randomUUID();
    const {
      organizationId,
      title,
      department,
      versionTag = '1.0',
      fileName,
      mimeType = 'application/pdf',
      fileBuffer,
      rawText,
    } = input;

    // 1. Calculate source document SHA-256 hash
    const sourceContent = fileBuffer ? Buffer.from(fileBuffer) : Buffer.from(rawText || '', 'utf-8');
    const sourceFileHash = AuditService.computeSha256(sourceContent);

    // 1.1 Check for duplicate document via SHA-256 checksum for this tenant
    if (this.dbClient) {
      try {
        const { data: existingDoc } = await (this.dbClient as any)
          .from('policy_documents')
          .select(`
            id,
            title,
            department,
            version_tag,
            storage_path,
            source_file_hash,
            policy_clauses(count)
          `)
          .eq('organization_id', organizationId)
          .eq('source_file_hash', sourceFileHash)
          .maybeSingle();

        if (existingDoc) {
          const clausesCount = Array.isArray(existingDoc.policy_clauses) && existingDoc.policy_clauses.length > 0
            ? Number(existingDoc.policy_clauses[0].count) || 0
            : 0;

          logger.info(
            { policyId: existingDoc.id, organizationId, sourceFileHash },
            'Policy document with identical SHA-256 checksum already exists; returning deduplicated document'
          );

          return {
            policyId: existingDoc.id,
            organizationId,
            title: existingDoc.title,
            department: existingDoc.department,
            versionTag: existingDoc.version_tag,
            storagePath: existingDoc.storage_path,
            sourceFileHash: existingDoc.source_file_hash,
            clausesCount,
            clauses: [],
            auditId: 'DEDUPLICATED',
            deduplicated: true,
          };
        }
      } catch (err) {
        logger.warn({ err: String(err) }, 'Error during deduplication check, proceeding with fresh ingestion');
      }
    }

    logger.info(
      {
        policyId,
        organizationId,
        title,
        department,
        sourceFileHashPrefix: sourceFileHash.slice(0, 8),
      },
      'Starting policy document ingestion'
    );

    // 2. Structural heading detection & clause chunking
    const extracted = await this.structureExtractor.extractStructure({
      fileBuffer,
      rawText,
      fileName,
      mimeType,
      department,
      versionTag,
      title,
    });

    // 3. Supabase Storage upload: policies/{org_id}/{policy_id}/{fileName}
    const storagePath = `policies/${organizationId}/${policyId}/${fileName}`;
    await this.uploadToStorage(sourceContent, storagePath, mimeType);

    // 4. Database persistence into policy_documents
    if (this.dbClient) {
      const { error: docError } = await (this.dbClient as any).from('policy_documents').insert({
        id: policyId,
        organization_id: organizationId,
        title: extracted.title,
        department,
        version_tag: versionTag,
        storage_path: storagePath,
        raw_text: extracted.rawText,
        source_file_hash: sourceFileHash,
      });

      if (docError) {
        logger.error({ error: docError.message }, 'Failed to persist policy_document record');
        throw new Error(`Failed to save policy document: ${docError.message}`);
      }
    }

    // 5. Clause Vector Indexing (Epic 15)
    await this.vectorIndexService.indexPolicyClauses({
      organizationId,
      policyId,
      clauses: extracted.clauses,
    });

    // 6. Inngest Event Dispatch (ADR-006)
    await inngestGapMatrixDispatcher.send({
      name: 'gap-matrix/policy.uploaded',
      data: {
        policyId,
        organizationId,
        title: extracted.title,
        storagePath,
        sourceFileHash,
        clausesCount: extracted.clauses.length,
      },
    });

    // 7. Immutable Audit Log (CAMA / BOFIA 6-year retention)
    const auditOutputHash = AuditService.computeSha256({
      policyId,
      title: extracted.title,
      clausesCount: extracted.clauses.length,
      storagePath,
    });

    const auditEntry = await this.auditService.recordLog({
      organizationId,
      action: 'POLICY_DOCUMENT_INGESTED',
      entityType: 'policy_documents',
      entityId: policyId,
      sha256InputHash: sourceFileHash,
      sha256OutputHash: auditOutputHash,
      metadata: {
        title: extracted.title,
        department,
        versionTag,
        clausesCount: extracted.clauses.length,
        storagePath,
        latencyMs: Math.round(performance.now() - startTime),
      },
    });

    logger.info(
      {
        policyId,
        organizationId,
        clausesCount: extracted.clauses.length,
        auditId: auditEntry.id,
      },
      'Policy document ingested and indexed successfully'
    );

    return {
      policyId,
      organizationId,
      title: extracted.title,
      department,
      versionTag,
      storagePath,
      sourceFileHash,
      clausesCount: extracted.clauses.length,
      clauses: extracted.clauses,
      auditId: auditEntry.id,
    };
  }

  private async uploadToStorage(
    fileBuffer: Buffer,
    storagePath: string,
    mimeType: string
  ): Promise<void> {
    if (!this.dbClient) return;

    try {
      const { error } = await this.dbClient.storage
        .from('policies')
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        logger.warn(
          { storagePath, error: error.message },
          'Storage upload failed or skipped; continuing with database records'
        );
      } else {
        logger.info({ storagePath }, 'Uploaded policy manual to Supabase Storage');
      }
    } catch (err) {
      logger.warn({ err }, 'Storage upload threw error; falling back to DB raw text');
    }
  }
}

export const defaultPolicyIngestionService = new PolicyIngestionService();
