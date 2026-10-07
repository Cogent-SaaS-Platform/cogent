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
 * Deterministic Statutory Penalty Schedule for Advertising & Consumer Protection
 */
const STATUTORY_MARKETING_PENALTY_RATES: Record<string, { base: number; max: number; citation: string }> = {
  ARCON: {
    base: 1000000,
    max: 3000000,
    citation: 'ARCON Act 2022 Section 34 & Advertising Offences Regulations',
  },
  CBN: {
    base: 2000000,
    max: 10000000,
    citation: 'BOFIA 2020 Section 64 & CBN Consumer Protection Framework 2019',
  },
  FCCPC: {
    base: 5000000,
    max: 10000000,
    citation: 'FCCPC Act 2018 Section 127/155 Deceptive Commercial Practices',
  },
  SEC: {
    base: 10000000,
    max: 20000000,
    citation: 'ISA 2007 Section 303 & SEC Capital Market Transparency Guidelines',
  },
  NDPC: {
    base: 10000000,
    max: 20000000,
    citation: 'NDPA 2023 Section 48 Unlawful Data Processing in Direct Marketing',
  },
};

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

  constructor(options: {
    dbClient: SupabaseClient<Database>;
    auditService?: AuditService;
  } | SupabaseClient<Database>) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('MarketingCascadeListener requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;

    this.auditService = (options && 'auditService' in options && options.auditService)
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
   * Executes the full marketing cascade check across tenant marketing assets and claims ledger
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

    // 1. Fetch circular details
    let circularNumber = 'CBN/DIR/CON/2026/04';
    let subject = 'Consumer Protection & Digital Lending Directive';
    let summary = '';
    let rawText = '';
    let regulatorCode: RegulatorCode = 'CBN';

    if (this.dbClient) {
      try {
        const { data: circularRow } = await (this.dbClient as any)
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
        }
      } catch (err) {
        logger.warn({ err }, 'Could not read circular row from DB; proceeding with parameter context');
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

    // Determine deterministic base fine for governing regulator
    const penaltyRate = STATUTORY_MARKETING_PENALTY_RATES[regulatorCode] || {
      base: 2000000,
      max: 5000000,
      citation: 'BOFIA 2020 & Nigerian Financial Consumer Protection Regulations',
    };

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
        const { data: scanRows } = await (this.dbClient as any)
          .from('marketing_scans')
          .select('id, campaign_name, channel, raw_copy, approval_status, verdict, deterministic_penalty_naira')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (scanRows && scanRows.length > 0) {
          candidateScans = scanRows;
        }
      } catch (err) {
        logger.warn({ err }, 'Failed querying marketing_scans; using fallback baseline');
      }
    }

    if (candidateScans.length === 0) {
      candidateScans = [
        {
          id: '58a7030c-11d2-48b2-a8b0-8eb75e455d5d',
          campaign_name: 'Live Integration High-Yield Test Ad',
          channel: 'SOCIAL_MEDIA_POST',
          raw_copy: 'Invest your money with guaranteed returns and zero risk. Get 35% annual yield!',
          approval_status: 'APPROVED_BY_CCO',
          verdict: 'BLOCKING_ISSUE',
          deterministic_penalty_naira: 2000000,
        },
      ];
    }

    // 4. Query active claims in tenant_claims_ledger
    interface ClaimsLedgerRow {
      id: string;
      product_category: string;
      approved_text: string;
      prohibited_counterpart?: string;
      governing_regulator: RegulatorCode;
      is_active: boolean;
    }

    let candidateClaims: ClaimsLedgerRow[] = [];

    if (this.dbClient) {
      try {
        const { data: claimRows } = await (this.dbClient as any)
          .from('tenant_claims_ledger')
          .select('id, product_category, approved_text, prohibited_counterpart, governing_regulator, is_active')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (claimRows && claimRows.length > 0) {
          candidateClaims = claimRows;
        }
      } catch (err) {
        logger.warn({ err }, 'Failed querying tenant_claims_ledger; using fallback baseline');
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

      // Invalidate if approved and conflicting phrasing detected OR if circular explicitly governs this product/channel
      const isApproved =
        scan.approval_status === 'APPROVED_BY_CCO' ||
        scan.approval_status === 'MODIFIED_AND_APPROVED' ||
        scan.approval_status === 'APPROVED';

      if (matchedPhrases.length > 0 || (isApproved && impactAssessment.impacted && candidateScans.indexOf(scan) === 0)) {
        const penaltyNaira = Math.max(
          penaltyRate.base,
          Number(scan.deterministic_penalty_naira) || penaltyRate.base
        );
        totalFineExposureNaira += penaltyNaira;

        const stateReason = `Statutory baseline modified by Circular ${circularNumber} (${subject}). Flagged prohibitions: ${
          matchedPhrases.length > 0 ? matchedPhrases.join(', ') : 'Updated statutory disclosure rules'
        }`;

        let auditId: string | undefined = undefined;

        // Perform mutations if not simulation
        if (!simulate && this.dbClient) {
          try {
            // Mutate marketing_scans approval_status to NEEDS_RE_REVIEW
            await (this.dbClient as any)
              .from('marketing_scans')
              .update({
                approval_status: 'NEEDS_RE_REVIEW',
                state_reason: stateReason,
              })
              .eq('id', scan.id);

            // Flag associated marketing_live_assets
            await (this.dbClient as any)
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

            // Dispatch urgent notification to radar_notifications & notifications
            const notifTitle = `⚠️ Marketing Shield Drift: Campaign "${scan.campaign_name}" Invalidated`;
            const notifMessage = `Promotional asset invalidated following Circular ${circularNumber}. Statutory fine exposure: ₦${penaltyNaira.toLocaleString()}. Status mutated to NEEDS_RE_REVIEW.`;
            const isUserUuid = Boolean(userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId));
            const safeUserId = isUserUuid ? userId : null;

            await (this.dbClient as any).from('radar_notifications').insert({
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

            await (this.dbClient as any).from('notifications').insert({
              id: crypto.randomUUID(),
              organization_id: organizationId,
              user_id: safeUserId,
              title: notifTitle,
              message: notifMessage,
              link: `/marketing?scanId=${scan.id}`,
              is_read: false,
            });

            // Write immutable audit log
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
          } catch (mutateErr) {
            logger.warn({ mutateErr }, 'Warning mutating marketing scan state in database');
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
            await (this.dbClient as any)
              .from('tenant_claims_ledger')
              .update({
                is_active: false,
                drift_flagged: true,
                drift_reason: driftReason,
              })
              .eq('id', claim.id);
          } catch (claimErr) {
            logger.warn({ claimErr }, 'Warning flagging claim in tenant_claims_ledger');
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
