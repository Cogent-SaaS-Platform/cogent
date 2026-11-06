import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';
import { AuditService } from '@/modules/audit/auditService';
import { logger } from '@/shared/logger';
import { RegulatorCode } from '@/shared/types';

export interface MarketingCascadeCheckParams {
  circularId: string;
  organizationId?: string;
  userId?: string | null;
  simulate?: boolean;
}

export interface InvalidatedCampaignItem {
  scanId: string;
  campaignName: string;
  channel: string;
  previousApprovalStatus: string;
  newApprovalStatus: 'NEEDS_RE_REVIEW';
  stateReason: string;
  flaggedPhrases: string[];
  deterministicPenaltyNaira: number;
  governingRegulator: RegulatorCode;
  auditId?: string;
}

export interface FlaggedClaimItem {
  claimId: string;
  approvedText: string;
  productCategory: string;
  governingRegulator: RegulatorCode;
  driftReason: string;
  isDeactivated: boolean;
}

export interface MarketingCascadeCheckResult {
  success: boolean;
  circularId: string;
  circularNumber: string;
  regulatorCode: RegulatorCode;
  subject: string;
  isMarketingImpacted: boolean;
  marketingImpactRationale: string;
  invalidatedCampaignsCount: number;
  invalidatedClaimsCount: number;
  totalStatutoryFineExposureNaira: number;
  invalidatedCampaigns: InvalidatedCampaignItem[];
  flaggedClaims: FlaggedClaimItem[];
  simulationMode: boolean;
  checkedAt: string;
}

/**
 * 4.2 Upstream Circular -> Trigger Downstream Marketing Drift Check
 * Connects Pillar 2 (Regulatory Radar) to Pillar 1 (Marketing Shield Enterprise).
 *
 * Automatically monitors newly enacted regulatory directives for changes to advertising,
 * fee disclosure, interest rate caps, or consumer protection baselines.
 * Cross-matches against active tenant approved campaigns and tenant claims ledger.
 */
export class MarketingCascadeListener {
  private dbClient: SupabaseClient<Database>;
  private auditService: AuditService;

  constructor(
    options:
      | {
          dbClient: SupabaseClient<Database>;
          auditService?: AuditService;
        }
      | SupabaseClient<Database>
  ) {
    const client =
      options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('MarketingCascadeListener requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;

    this.auditService =
      options && 'auditService' in options && options.auditService
        ? options.auditService
        : new AuditService(this.dbClient);
  }

  /**
   * Evaluates whether an upstream circular impacts marketing rules
   */
  public isMarketingImpacted(circular: {
    subject: string;
    summary?: string | null;
    raw_text?: string | null;
    regulatorCode?: string;
  }): { impacted: boolean; rationale: string; prohibitedTerms: string[] } {
    const textCorpus = `${circular.subject} ${circular.summary || ''} ${circular.raw_text || ''}`.toLowerCase();
    const prohibitedTerms: string[] = [];

    let impacted = false;
    let rationale = 'Circular does not contain consumer advertising or disclosure restrictions.';

    if (
      textCorpus.includes('advertis') ||
      textCorpus.includes('promot') ||
      textCorpus.includes('marketing') ||
      textCorpus.includes('arcon')
    ) {
      impacted = true;
      rationale = 'Circular directly modifies advertising standards and promotional guidelines.';
      prohibitedTerms.push('unvetted promo', 'unapproved advert', 'registered name');
    }

    if (
      textCorpus.includes('apr') ||
      textCorpus.includes('interest rate') ||
      textCorpus.includes('fee disclosure') ||
      textCorpus.includes('zero interest') ||
      textCorpus.includes('lending') ||
      textCorpus.includes('credit')
    ) {
      impacted = true;
      rationale = 'Circular modifies consumer credit pricing, loan disclosure, or APR transparency requirements.';
      prohibitedTerms.push('zero interest', 'instant cash', 'transparent rates', 'no collateral');
    }

    if (
      textCorpus.includes('guarantee') ||
      textCorpus.includes('risk-free') ||
      textCorpus.includes('investment return') ||
      textCorpus.includes('wealth') ||
      textCorpus.includes('sec')
    ) {
      impacted = true;
      rationale = 'Circular tightens investor protection and bans deceptive capital guarantees.';
      prohibitedTerms.push('guaranteed return', 'risk-free', '100% safe', 'capital safe');
    }

    if (
      textCorpus.includes('consumer protection') ||
      textCorpus.includes('fair hearing') ||
      textCorpus.includes('fccpc')
    ) {
      impacted = true;
      rationale = 'Circular introduces FCCPC/CBN Consumer Protection transparency obligations.';
      prohibitedTerms.push('guaranteed approval', '100% approval', 'hidden charges');
    }

    return { impacted, rationale, prohibitedTerms };
  }

  /**
   * Executes the full marketing cascade check across tenant marketing assets and claims ledger.
   * Never fabricates circular numbers or statutory penalty figures not explicitly grounded in DB records.
   */
  public async checkMarketingDrift(
    params: MarketingCascadeCheckParams
  ): Promise<MarketingCascadeCheckResult> {
    const {
      circularId,
      organizationId = '00000000-0000-0000-0000-000000000001',
      userId = null,
      simulate = false,
    } = params;

    logger.info(
      { circularId, organizationId, simulate },
      'Executing Upstream Circular -> Marketing Drift Check'
    );

    // 1. Fetch circular details strictly from database (no invented circular codes)
    let circularNumber = 'Not explicitly specified in source text';
    let subject = 'Not explicitly specified in source text';
    let summary = '';
    let rawText = '';
    let regulatorCode: RegulatorCode = 'CBN';

    if (this.dbClient) {
      try {
        const { data: circularRow } = await this.dbClient
          .from('radar_circulars')
          .select('id, circular_number, subject, summary, raw_text')
          .eq('id', circularId)
          .single();

        if (circularRow) {
          circularNumber = circularRow.circular_number || circularNumber;
          subject = circularRow.subject || subject;
          summary = circularRow.summary || '';
          rawText = circularRow.raw_text || '';

          if (circularNumber.startsWith('ARCON')) regulatorCode = 'ARCON';
          else if (circularNumber.startsWith('FCCPC')) regulatorCode = 'FCCPC';
          else if (circularNumber.startsWith('SEC')) regulatorCode = 'SEC';
          else if (circularNumber.startsWith('NDPC')) regulatorCode = 'NDPC';
          else if (circularNumber.startsWith('NFIU')) regulatorCode = 'NFIU';
        }
      } catch (err) {
        logger.error({ err, circularId }, 'Failed reading circular row from radar_circulars');
      }
    }

    // 2. Assess whether circular impacts marketing or consumer disclosures
    const impactAssessment = this.isMarketingImpacted({
      subject,
      summary,
      raw_text: rawText,
      regulatorCode,
    });

    const invalidatedCampaigns: InvalidatedCampaignItem[] = [];
    const flaggedClaims: FlaggedClaimItem[] = [];
    let totalFineExposureNaira = 0;

    // 3. Query active tenant campaigns from marketing_scans
    interface MarketingScanRow {
      id: string;
      campaign_name: string;
      channel: string;
      raw_copy: string;
      approval_status: string;
      verdict: string;
      deterministic_penalty_naira?: number;
    }

    let candidateScans: MarketingScanRow[] = [];

    if (this.dbClient) {
      try {
        const { data: scanRows } = await this.dbClient
          .from('marketing_scans')
          .select('id, campaign_name, channel, raw_copy, approval_status, verdict, deterministic_penalty_naira')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (scanRows && scanRows.length > 0) {
          candidateScans = scanRows;
        }
      } catch (err) {
        logger.error({ err, organizationId }, 'Failed querying marketing_scans for drift check');
      }
    }

    if (candidateScans.length === 0) {
      logger.info({ organizationId }, 'Zero marketing scans found for tenant; no campaigns to evaluate for drift');
    }

    // 4. Query active claims in tenant_claims_ledger
    interface ClaimsLedgerRow {
      id: string;
      product_category: string;
      approved_text: string;
      prohibited_counterpart?: string | null;
      governing_regulator: RegulatorCode;
      is_active: boolean;
    }

    let candidateClaims: ClaimsLedgerRow[] = [];

    if (this.dbClient) {
      try {
        const { data: claimRows } = await this.dbClient
          .from('tenant_claims_ledger')
          .select('id, product_category, approved_text, prohibited_counterpart, governing_regulator, is_active')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (claimRows && claimRows.length > 0) {
          candidateClaims = claimRows;
        }
      } catch (err) {
        logger.error({ err, organizationId }, 'Failed querying tenant_claims_ledger for drift check');
      }
    }

    // Prohibited key phrases that violate updated baseline
    const crossMatchPatterns = [
      'zero interest',
      'guaranteed approval',
      'guaranteed return',
      'risk-free',
      '100% safe',
      'no credit checks',
      'transparent rates',
      'instant loan in 5 mins',
      'capital safe',
    ];

    // 5. Cross-match against marketing_scans
    for (const scan of candidateScans) {
      const copy = (scan.raw_copy || '').toLowerCase();
      const matchedPhrases: string[] = [];

      for (const phrase of crossMatchPatterns) {
        if (copy.includes(phrase)) {
          matchedPhrases.push(phrase);
        }
      }

      const isApproved =
        scan.approval_status === 'APPROVED_BY_CCO' ||
        scan.approval_status === 'MODIFIED_AND_APPROVED' ||
        scan.approval_status === 'APPROVED';

      if (matchedPhrases.length > 0 || (isApproved && impactAssessment.impacted)) {
        // Strictly use explicitly recorded deterministic penalty from database (0 if unspecified)
        const penaltyNaira = Number(scan.deterministic_penalty_naira) || 0;
        totalFineExposureNaira += penaltyNaira;

        const stateReason = `Statutory baseline modified by Circular ${circularNumber} (${subject}). Flagged prohibitions: ${
          matchedPhrases.length > 0 ? matchedPhrases.join(', ') : 'Updated statutory disclosure rules'
        }`;

        let auditId: string | undefined = undefined;

        if (!simulate && this.dbClient) {
          try {
            await this.dbClient
              .from('marketing_scans')
              .update({
                approval_status: 'NEEDS_RE_REVIEW',
                state_reason: stateReason,
              })
              .eq('id', scan.id);

            await this.dbClient
              .from('marketing_live_assets')
              .update({
                drift_status: 'DRIFT_DETECTED',
                drift_findings: {
                  circularNumber,
                  stateReason,
                  flaggedPhrases: matchedPhrases,
                  detectedAt: new Date().toISOString(),
                },
              })
              .eq('scan_id', scan.id);

            const penaltySummary =
              penaltyNaira > 0
                ? `₦${penaltyNaira.toLocaleString()}`
                : 'Not explicitly specified in source text';

            const notifTitle = `Marketing Shield Drift: Campaign "${scan.campaign_name}" Invalidated`;
            const notifMessage = `Promotional asset invalidated following Circular ${circularNumber}. Statutory fine exposure: ${penaltySummary}. Status mutated to NEEDS_RE_REVIEW.`;
            const isUserUuid = Boolean(
              userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
            );
            const safeUserId = isUserUuid ? userId : null;

            await this.dbClient.from('radar_notifications').insert({
              id: crypto.randomUUID(),
              organization_id: organizationId,
              user_id: safeUserId,
              title: notifTitle,
              message: notifMessage,
              type: 'CASCADE_MARKETING_DRIFT',
              priority: 'HIGH',
              target_department: 'GROWTH_MARKETING',
              action_url: `/marketing?scanId=${scan.id}`,
              link: `/marketing?scanId=${scan.id}`,
              is_read: false,
              metadata: {
                circularNumber,
                scanId: scan.id,
                penaltyNaira,
              },
            });

            await this.dbClient.from('notifications').insert({
              id: crypto.randomUUID(),
              organization_id: organizationId,
              user_id: safeUserId,
              title: notifTitle,
              message: notifMessage,
              link: `/marketing?scanId=${scan.id}`,
              is_read: false,
            });

            const auditLog = await this.auditService.recordLog({
              organizationId,
              userId,
              action: 'CASCADE_MARKETING_DRIFT_DETECTED',
              entityType: 'marketing_scans',
              entityId: scan.id,
              sha256InputHash: AuditService.computeSha256(copy),
              sha256OutputHash: AuditService.computeSha256(stateReason),
              metadata: {
                circularNumber,
                campaignName: scan.campaign_name,
                previousApprovalStatus: scan.approval_status,
                newApprovalStatus: 'NEEDS_RE_REVIEW',
                statutoryPenaltyNaira: penaltyNaira,
                flaggedPhrases: matchedPhrases,
              },
            });
            auditId = auditLog.id;

            await this.dbClient.from('compliance_cascade_events').insert({
              id: crypto.randomUUID(),
              organization_id: organizationId,
              circular_id: circularId,
              hop_number: 2,
              source_pillar: 'PILLAR_2_RADAR',
              target_pillar: 'PILLAR_1_MARKETING_SHIELD',
              event_type: 'MARKETING_DRIFT_INVALIDATED',
              entity_type: 'marketing_scans',
              entity_id: scan.id,
              status: 'COMPLETED',
              details: {
                circularNumber,
                campaignName: scan.campaign_name,
                previousApprovalStatus: scan.approval_status,
                newApprovalStatus: 'NEEDS_RE_REVIEW',
                statutoryPenaltyNaira: penaltyNaira,
                flaggedPhrases: matchedPhrases,
              },
              sha256_hash: AuditService.computeSha256(stateReason),
              previous_event_hash: AuditService.computeSha256(copy),
            });
          } catch (mutateErr) {
            logger.error({ mutateErr, scanId: scan.id }, 'Error mutating marketing scan state during cascade drift check');
          }
        }

        invalidatedCampaigns.push({
          scanId: scan.id,
          campaignName: scan.campaign_name,
          channel: scan.channel,
          previousApprovalStatus: scan.approval_status,
          newApprovalStatus: 'NEEDS_RE_REVIEW',
          stateReason,
          flaggedPhrases: matchedPhrases.length > 0 ? matchedPhrases : ['Updated statutory disclosure rules'],
          deterministicPenaltyNaira: penaltyNaira,
          governingRegulator: regulatorCode,
          auditId,
        });
      }
    }

    // 6. Cross-match against tenant_claims_ledger
    for (const claim of candidateClaims) {
      const claimText = claim.approved_text.toLowerCase();
      let violatesBaseline = false;
      let matchedTerm = '';

      for (const phrase of crossMatchPatterns) {
        if (claimText.includes(phrase)) {
          violatesBaseline = true;
          matchedTerm = phrase;
          break;
        }
      }

      if (violatesBaseline) {
        const driftReason = `Flagged by Circular ${circularNumber}: Prohibited claim phrase "${matchedTerm}" violates updated ${regulatorCode} standard.`;

        if (!simulate && this.dbClient) {
          try {
            await this.dbClient
              .from('tenant_claims_ledger')
              .update({
                is_active: false,
                drift_flagged: true,
                drift_reason: driftReason,
              })
              .eq('id', claim.id);
          } catch (claimErr) {
            logger.error({ claimErr, claimId: claim.id }, 'Error flagging claim in tenant_claims_ledger');
          }
        }

        flaggedClaims.push({
          claimId: claim.id,
          approvedText: claim.approved_text,
          productCategory: claim.product_category,
          governingRegulator: claim.governing_regulator || regulatorCode,
          driftReason,
          isDeactivated: !simulate,
        });
      }
    }

    logger.info(
      {
        circularNumber,
        invalidatedCampaignsCount: invalidatedCampaigns.length,
        flaggedClaimsCount: flaggedClaims.length,
        totalFineExposureNaira,
      },
      'Marketing drift check completed'
    );

    return {
      success: true,
      circularId,
      circularNumber,
      regulatorCode,
      subject,
      isMarketingImpacted: impactAssessment.impacted,
      marketingImpactRationale: impactAssessment.rationale,
      invalidatedCampaignsCount: invalidatedCampaigns.length,
      invalidatedClaimsCount: flaggedClaims.length,
      totalStatutoryFineExposureNaira: totalFineExposureNaira,
      invalidatedCampaigns,
      flaggedClaims,
      simulationMode: simulate,
      checkedAt: new Date().toISOString(),
    };
  }
}
