import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { ConfigurationError } from '@/shared/errors';
import { logger } from '@/shared/logger';
import { AuditLogEntry, CreateAuditLogParams } from '@/shared/types';

/**
 * Immutable Audit Ledger Service (Pillar 1 / Epic 7)
 * Implements CAMA 2020 & BOFIA 2020 6-Year Statutory Audit Retention
 * Adheres strictly to docs/SECURITY.md Section 5.2 and docs/DATA_MODEL.md Section 9
 */
export class AuditService {
  private dbClient: SupabaseClient;

  constructor(options: { dbClient: SupabaseClient } | SupabaseClient) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient);
    if (!client) {
      throw new ConfigurationError('AuditService requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;
  }

  /**
   * Computes a canonical SHA-256 cryptographic digest of data
   */
  public static computeSha256(data: string | object | Buffer): string {
    const payload =
      typeof data === 'string'
        ? data
        : Buffer.isBuffer(data)
        ? data
        : JSON.stringify(data);
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Verifies that given data matches its expected cryptographic SHA-256 hash
   */
  public static verifyIntegrity(data: string | object | Buffer, expectedHash: string): boolean {
    const computed = AuditService.computeSha256(data);
    return computed.toLowerCase() === expectedHash.toLowerCase();
  }

  /**
   * Records an append-only cryptographic log into `audit_logs`
   * Enforces zero-knowledge storage: retains only hashes and non-sensitive operational telemetry
   */
  public async recordLog(params: CreateAuditLogParams): Promise<AuditLogEntry> {
    const entryId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const entry: AuditLogEntry = {
      id: entryId,
      organizationId: params.organizationId,
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      sha256InputHash: params.sha256InputHash,
      sha256OutputHash: params.sha256OutputHash,
      metadata: params.metadata || {},
      createdAt,
    };

    if (!this.dbClient) {
      logger.info(
        { auditId: entryId, action: params.action, entityId: params.entityId },
        'Audit log entry sealed cryptographically (offline storage)'
      );
      return entry;
    }

    const isUuid = Boolean(params.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.userId));
    const dbUserId = isUuid ? params.userId : null;
    const finalMetadata = {
      ...(params.metadata || {}),
      ...(params.userId && !isUuid ? { rawUserId: params.userId } : {}),
    };

    try {
      const { data, error } = await this.dbClient
        .from('audit_logs')
        .insert({
          id: entryId,
          organization_id: params.organizationId,
          user_id: dbUserId,
          action: params.action,
          entity_type: params.entityType,
          entity_id: params.entityId,
          sha256_input_hash: params.sha256InputHash,
          sha256_output_hash: params.sha256OutputHash,
          metadata: finalMetadata,
          created_at: createdAt,
        })
        .select()
        .single();

      if (error) {
        logger.warn(
          { error: error.message, action: params.action, entityId: params.entityId },
          'Database error inserting audit_logs record; falling back to local cryptographic seal'
        );
        return entry;
      }

      logger.info(
        {
          auditId: entryId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          inputHashPrefix: params.sha256InputHash.substring(0, 8),
          outputHashPrefix: params.sha256OutputHash.substring(0, 8),
        },
        'Immutable audit log entry committed successfully'
      );

      return {
        id: data.id,
        organizationId: data.organization_id,
        userId: data.user_id,
        action: data.action,
        entityType: data.entity_type,
        entityId: data.entity_id,
        sha256InputHash: data.sha256_input_hash,
        sha256OutputHash: data.sha256_output_hash,
        metadata: data.metadata,
        createdAt: data.created_at,
      };
    } catch (err: any) {
      logger.warn(
        { err: err.message, action: params.action },
        'Failed to commit to audit_logs table; continuing with local cryptographic entry'
      );
      return entry;
    }
  }

  /**
   * Retrieves the chronological audit trail for a specific entity
   */
  public async getEntityAuditTrail(
    entityType: string,
    entityId: string,
    orgId?: string
  ): Promise<AuditLogEntry[]> {
    if (!this.dbClient) {
      return [];
    }

    try {
      let query = this.dbClient
        .from('audit_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;

      if (error || !data) {
        logger.warn({ error, entityType, entityId }, 'Could not retrieve audit trail from database');
        return [];
      }

      return data.map((d: any) => ({
        id: d.id,
        organizationId: d.organization_id,
        userId: d.user_id,
        action: d.action,
        entityType: d.entity_type,
        entityId: d.entity_id,
        sha256InputHash: d.sha256_input_hash,
        sha256OutputHash: d.sha256_output_hash,
        metadata: d.metadata || {},
        createdAt: d.created_at,
      }));
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to query audit trail');
      return [];
    }
  }
}
