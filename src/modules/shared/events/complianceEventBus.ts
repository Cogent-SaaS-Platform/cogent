import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';
import { AuditService } from '@/modules/audit/auditService';
import { logger } from '@/shared/logger';
import { CascadeTriggerService, CascadeGapTriggerResult } from '@/modules/radar/services/cascadeTriggerService';
import { MarketingCascadeListener, MarketingCascadeCheckResult } from '@/modules/marketing-shield/services/marketingCascadeListener';

export type CompliancePillar =
  | 'PILLAR_1_MARKETING_SHIELD'
  | 'PILLAR_2_RADAR'
  | 'PILLAR_3_GAP_MATRIX'
  | 'EXECUTIVE_COMMAND_CENTER';

export type ComplianceCascadeEventType =
  | 'CIRCULAR_RATIFIED'
  | 'CIRCULAR_INGESTED'
  | 'GAP_RE_EVALUATION_TRIGGERED'
  | 'MARKETING_DRIFT_INVALIDATED'
  | 'RISK_POSTURE_UPDATED';

export interface CascadeHopRecord {
  id: string;
  organizationId: string;
  circularId: string | null;
  hopNumber: number;
  sourcePillar: CompliancePillar;
  targetPillar: CompliancePillar;
  eventType: ComplianceCascadeEventType;
  entityType: string;
  entityId: string | null;
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS';
  details: Record<string, any>;
  sha256Hash: string;
  previousEventHash: string | null;
  createdAt: string;
}

export interface ComplianceCascadeEvent<T = Record<string, any>> {
  organizationId: string;
  circularId?: string;
  hopNumber?: number;
  sourcePillar: CompliancePillar;
  targetPillar: CompliancePillar;
  eventType: ComplianceCascadeEventType;
  entityType: string;
  entityId?: string | null;
  details: T;
  userId?: string | null;
  previousEventHash?: string | null;
}

export interface AutonomousCascadeResult {
  success: boolean;
  circularId: string;
  organizationId: string;
  hops: CascadeHopRecord[];
  gapCascade: CascadeGapTriggerResult;
  marketingCascade: MarketingCascadeCheckResult;
  executedAt: string;
  cryptographicRootHash: string;
}

export type CascadeEventListener = (event: CascadeHopRecord) => Promise<void> | void;

/**
 * Connected Compliance Cascade Event Bus
 * 
 * Provides an event-driven compliance cascade loop triggered when statutory directives
 * or circulars are ratified in Pillar 2 (Radar), propagating autonomously across:
 * 1. Pillar 2 (Radar) -> Pillar 3 (Gap Matrix): Policy concordance re-auditing
 * 2. Pillar 2 (Radar) -> Pillar 1 (Marketing Shield): Claims drift invalidation
 * 3. Pillar 3 / 1 -> Executive Command Center: Institutional risk posture recalculation
 * 
 * Cryptographically chains every hop in the immutable `compliance_cascade_events` ledger.
 */
export class ComplianceEventBus {
  private dbClient: SupabaseClient<Database>;
  private auditService: AuditService;
  private cascadeTriggerService: CascadeTriggerService;
  private marketingCascadeListener: MarketingCascadeListener;
  private listeners: Map<ComplianceCascadeEventType, Set<CascadeEventListener>> = new Map();

  constructor(options: {
    dbClient: SupabaseClient<Database>;
    auditService?: AuditService;
    cascadeTriggerService?: CascadeTriggerService;
    marketingCascadeListener?: MarketingCascadeListener;
  } | SupabaseClient<Database>) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('ComplianceEventBus requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;
    this.auditService = (options && 'auditService' in options && options.auditService)
      ? options.auditService
      : new AuditService(this.dbClient);
    this.cascadeTriggerService = (options && 'cascadeTriggerService' in options && options.cascadeTriggerService)
      ? options.cascadeTriggerService
      : new CascadeTriggerService({ dbClient: this.dbClient, auditService: this.auditService });
    this.marketingCascadeListener = (options && 'marketingCascadeListener' in options && options.marketingCascadeListener)
      ? options.marketingCascadeListener
      : new MarketingCascadeListener({ dbClient: this.dbClient, auditService: this.auditService });
  }

  /**
   * Subscribe to specific compliance cascade events
   */
  public subscribe(eventType: ComplianceCascadeEventType, listener: CascadeEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Computes the deterministic SHA-256 seal for a cascade hop
   */
  public static computeHopHash(params: {
    organizationId: string;
    circularId: string | null;
    hopNumber: number;
    sourcePillar: string;
    targetPillar: string;
    eventType: string;
    entityType: string;
    entityId: string | null;
    details: Record<string, any>;
    previousEventHash: string | null;
  }): string {
    const payload = JSON.stringify({
      org: params.organizationId,
      circ: params.circularId,
      hop: params.hopNumber,
      src: params.sourcePillar,
      tgt: params.targetPillar,
      type: params.eventType,
      entType: params.entityType,
      entId: params.entityId,
      det: params.details,
      prev: params.previousEventHash || 'GENESIS_CASCADE_BLOCK',
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Persists a cryptographic cascade hop into the compliance_cascade_events table
   */
  public async recordCascadeHop(event: ComplianceCascadeEvent): Promise<CascadeHopRecord> {
    const id = crypto.randomUUID();
    const hopNumber = event.hopNumber || 1;
    const createdAt = new Date().toISOString();

    const sha256Hash = ComplianceEventBus.computeHopHash({
      organizationId: event.organizationId,
      circularId: event.circularId || null,
      hopNumber,
      sourcePillar: event.sourcePillar,
      targetPillar: event.targetPillar,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId || null,
      details: event.details,
      previousEventHash: event.previousEventHash || null,
    });

    const hopRecord: CascadeHopRecord = {
      id,
      organizationId: event.organizationId,
      circularId: event.circularId || null,
      hopNumber,
      sourcePillar: event.sourcePillar,
      targetPillar: event.targetPillar,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId || null,
      status: 'COMPLETED',
      details: event.details,
      sha256Hash,
      previousEventHash: event.previousEventHash || null,
      createdAt,
    };

    if (this.dbClient) {
      try {
        await this.dbClient.from('compliance_cascade_events').insert({
          id: hopRecord.id,
          organization_id: hopRecord.organizationId,
          circular_id: hopRecord.circularId,
          hop_number: hopRecord.hopNumber,
          source_pillar: hopRecord.sourcePillar,
          target_pillar: hopRecord.targetPillar,
          event_type: hopRecord.eventType,
          entity_type: hopRecord.entityType,
          entity_id: hopRecord.entityId,
          status: hopRecord.status,
          details: hopRecord.details,
          sha256_hash: hopRecord.sha256Hash,
          previous_event_hash: hopRecord.previousEventHash,
          created_at: hopRecord.createdAt,
        });
      } catch (dbErr) {
        logger.warn({ dbErr }, 'Warning persisting compliance_cascade_events row');
      }
    }

    // Write audit log for statutory forensic traceability
    try {
      await this.auditService.recordLog({
        organizationId: event.organizationId,
        userId: event.userId || null,
        action: `CASCADE_HOP_${event.eventType}` as any,
        entityType: event.entityType as any,
        entityId: event.entityId || id,
        sha256InputHash: event.previousEventHash || sha256Hash,
        sha256OutputHash: sha256Hash,
        metadata: {
          hopNumber,
          sourcePillar: event.sourcePillar,
          targetPillar: event.targetPillar,
          circularId: event.circularId,
          ...event.details,
        },
      });
    } catch (auditErr) {
      logger.warn({ auditErr }, 'Warning writing cascade audit log');
    }

    // Notify registered in-process listeners
    const listeners = this.listeners.get(event.eventType);
    if (listeners && listeners.size > 0) {
      for (const listener of listeners) {
        try {
          await listener(hopRecord);
        } catch (listenerErr) {
          logger.error({ listenerErr }, 'Error executing cascade event listener');
        }
      }
    }

    return hopRecord;
  }

  /**
   * Executes the full autonomous 3-pillar cascade loop from a single circular ratification event:
   * Hop 1: Radar -> Gap Matrix (identifies impacted internal policies and schedules concordance re-audit)
   * Hop 2: Radar -> Marketing Shield (invalidates conflicting approved campaigns & claims)
   * Hop 3: Downstream Gap/Marketing -> Executive Command Center risk posture recalculation
   */
  public async executeAutonomousCascade(params: {
    circularId: string;
    organizationId: string;
    userId?: string | null;
  }): Promise<AutonomousCascadeResult> {
    const { circularId, organizationId, userId = null } = params;
    logger.info({ circularId, organizationId }, 'Initiating Autonomous Cross-Pillar Compliance Cascade');

    const hops: CascadeHopRecord[] = [];

    // Hop 0: Ingestion/Ratification Event Record
    const hop0 = await this.recordCascadeHop({
      organizationId,
      circularId,
      hopNumber: 0,
      sourcePillar: 'PILLAR_2_RADAR',
      targetPillar: 'PILLAR_2_RADAR',
      eventType: 'CIRCULAR_RATIFIED',
      entityType: 'radar_circulars',
      entityId: circularId,
      details: { trigger: 'AUTOMATED_CASCADE_INITIATED' },
      userId,
      previousEventHash: null,
    });
    hops.push(hop0);

    // Hop 1: Pillar 2 (Radar) -> Pillar 3 (Gap Matrix)
    const gapResult = await this.cascadeTriggerService.triggerGapReEvaluation({
      circularId,
      organizationId,
      userId,
    });

    const hop1 = await this.recordCascadeHop({
      organizationId,
      circularId,
      hopNumber: 1,
      sourcePillar: 'PILLAR_2_RADAR',
      targetPillar: 'PILLAR_3_GAP_MATRIX',
      eventType: 'GAP_RE_EVALUATION_TRIGGERED',
      entityType: 'gap_evaluations',
      entityId: gapResult.triggeredEvaluations[0]?.evaluationId || null,
      details: {
        impactedPoliciesCount: gapResult.impactedPoliciesCount,
        affectedDomains: gapResult.affectedDomains,
        circularNumber: gapResult.circularNumber,
      },
      userId,
      previousEventHash: hop0.sha256Hash,
    });
    hops.push(hop1);

    // Hop 2: Pillar 2 (Radar) -> Pillar 1 (Marketing Shield)
    const marketingResult = await this.marketingCascadeListener.checkMarketingDrift({
      circularId,
      organizationId,
      userId,
      simulate: false,
    });

    const hop2 = await this.recordCascadeHop({
      organizationId,
      circularId,
      hopNumber: 2,
      sourcePillar: 'PILLAR_2_RADAR',
      targetPillar: 'PILLAR_1_MARKETING_SHIELD',
      eventType: 'MARKETING_DRIFT_INVALIDATED',
      entityType: 'marketing_scans',
      entityId: marketingResult.invalidatedCampaigns[0]?.scanId || null,
      details: {
        isMarketingImpacted: marketingResult.isMarketingImpacted,
        invalidatedCampaignsCount: marketingResult.invalidatedCampaignsCount,
        invalidatedClaimsCount: marketingResult.invalidatedClaimsCount,
        totalStatutoryFineExposureNaira: marketingResult.totalStatutoryFineExposureNaira,
      },
      userId,
      previousEventHash: hop1.sha256Hash,
    });
    hops.push(hop2);

    // Hop 3: Gap & Marketing -> Executive Command Center (Risk Posture Update)
    const hop3 = await this.recordCascadeHop({
      organizationId,
      circularId,
      hopNumber: 3,
      sourcePillar: 'PILLAR_3_GAP_MATRIX',
      targetPillar: 'EXECUTIVE_COMMAND_CENTER',
      eventType: 'RISK_POSTURE_UPDATED',
      entityType: 'organizations',
      entityId: organizationId,
      details: {
        impactedPoliciesCount: gapResult.impactedPoliciesCount,
        invalidatedCampaignsCount: marketingResult.invalidatedCampaignsCount,
        incrementalFineExposureNaira: marketingResult.totalStatutoryFineExposureNaira,
        status: 'POSTURE_RECALCULATED',
      },
      userId,
      previousEventHash: hop2.sha256Hash,
    });
    hops.push(hop3);

    return {
      success: true,
      circularId,
      organizationId,
      hops,
      gapCascade: gapResult,
      marketingCascade: marketingResult,
      executedAt: new Date().toISOString(),
      cryptographicRootHash: hop3.sha256Hash,
    };
  }

  /**
   * Retrieves the full cryptographic cascade chain for a circular
   */
  public async getCascadeChain(circularId: string, organizationId: string): Promise<CascadeHopRecord[]> {
    if (!this.dbClient) return [];
    try {
      const { data } = await this.dbClient
        .from('compliance_cascade_events')
        .select('*')
        .eq('circular_id', circularId)
        .eq('organization_id', organizationId)
        .order('hop_number', { ascending: true });

      return (data || []).map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        circularId: row.circular_id,
        hopNumber: row.hop_number,
        sourcePillar: row.source_pillar as CompliancePillar,
        targetPillar: row.target_pillar as CompliancePillar,
        eventType: row.event_type as ComplianceCascadeEventType,
        entityType: row.entity_type,
        entityId: row.entity_id,
        status: row.status as 'COMPLETED',
        details: (row.details as Record<string, any>) || {},
        sha256Hash: row.sha256_hash,
        previousEventHash: row.previous_event_hash,
        createdAt: row.created_at,
      }));
    } catch (err) {
      logger.warn({ err }, 'Failed reading cascade chain from database');
      return [];
    }
  }
}
