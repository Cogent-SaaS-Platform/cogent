/**
 * Phase 1 / Task 1.4 — Post-Publish Live Asset & Drift Watcher Service
 *
 * Responsibilities:
 * 1. Given a live asset URL and original scan ID, fetch live HTML and extract text content.
 * 2. Fingerprint live content via SHA-256 and compare against original approved hash.
 * 3. On hash mismatch, perform deterministic and AI semantic drift analysis:
 *    - Detect omitted mandatory disclosures ("Licensed by CBN", NDIC, SEC).
 *    - Detect rate/yield changes and added exaggerated promises ("guaranteed returns").
 * 4. Update tenant `marketing_live_assets` state (`SYNCED`, `DRIFT_DETECTED`, `ERROR`).
 * 5. Return publication-ready `DriftReportViewModel`.
 *
 * Source of Truth:
 * - docs/PILLAR_1_MARKETING_SHIELD.md Section 6
 * - docs/INTEGRATION_ROADMAP_AND_AGENT_WORKFLOWS.md Section 4 (Task 1.4)
 * - docs/DATA_MODEL.md Section 6
 */

import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { AiEngine } from '@/shared/ai-engine';
import {
  DriftAnalysisOutput,
  DriftAnalysisOutputSchema,
} from '@/shared/ai-engine/schemas/driftAnalysisSchema';
import {
  DriftStatus,
  MarketingChannel,
  ProductCategoryCode,
  SeverityLevel,
} from '@/shared/types';

export interface DriftFindingItem {
  id: string;
  findingType:
    | 'OMITTED_MANDATORY_DISCLOSURE'
    | 'ALTERED_CLAIM'
    | 'UNAPPROVED_PROMISE'
    | 'YIELD_RATE_DISCREPANCY';
  severity: SeverityLevel;
  originalText?: string;
  liveText?: string;
  description: string;
  regulatoryRisk: string;
  statutoryCitation: string;
}

export interface DriftReportViewModel {
  assetId?: string;
  scanId?: string;
  liveUrl: string;
  channel: MarketingChannel;
  originalHash: string;
  liveHash: string;
  isDrifted: boolean;
  driftStatus: DriftStatus;
  lastCheckedAt: string;
  driftSeverity: SeverityLevel | 'NONE';
  omittedDisclosures: string[];
  modifiedClaims: string[];
  findings: DriftFindingItem[];
  liveTextExcerpt: string;
}

export interface RegisterLiveAssetInput {
  organizationId: string;
  scanId?: string;
  liveUrl: string;
  channel: MarketingChannel;
  originalApprovedHash: string;
  originalApprovedText?: string;
}

export interface LiveAssetRecord {
  id: string;
  organizationId: string;
  scanId: string | null;
  liveUrl: string;
  channel: MarketingChannel;
  originalApprovedHash: string;
  lastCheckedAt: string;
  driftStatus: DriftStatus;
  driftFindings: any;
  createdAt: string;
}

const STATUTORY_DISCLOSURE_PATTERNS = [
  {
    name: 'CBN License Disclosure',
    pattern: /licensed by (?:the )?(?:central bank of nigeria|cbn)/i,
    citation: 'CBN Consumer Protection Framework s.4.2',
    severity: 'CRITICAL' as SeverityLevel,
  },
  {
    name: 'NDIC Insurance Coverage',
    pattern: /(?:insured by|covered by|protected by) (?:the )?ndic/i,
    citation: 'NDIC Act 2023 s.21',
    severity: 'CRITICAL' as SeverityLevel,
  },
  {
    name: 'SEC Capital at Risk Warning',
    pattern: /(?:capital at risk|regulated by (?:the )?sec|investments? (?:may|can) fluctuate)/i,
    citation: 'SEC Rule 198(2) & ISA 2007 s.67',
    severity: 'HIGH' as SeverityLevel,
  },
  {
    name: 'FCCPC Truth-in-Lending Terms',
    pattern: /(?:fccpc|terms and conditions apply|apr)/i,
    citation: 'FCCPC Limited Interim Framework s.4(a)',
    severity: 'HIGH' as SeverityLevel,
  },
];

const UNAPPROVED_PROMISE_PATTERNS = [
  {
    name: 'Guaranteed Returns',
    pattern: /guaranteed (?:returns?|yield|profit|interest)/i,
    citation: 'ISA 2007 s.67 & SEC Anti-Fraud Guidelines',
    severity: 'CRITICAL' as SeverityLevel,
  },
  {
    name: 'Zero-Risk Elimination Claim',
    pattern: /(?:100% risk[- ]free|zero risk|no risk at all)/i,
    citation: 'CBN Consumer Protection Regulations 2024 s.11',
    severity: 'CRITICAL' as SeverityLevel,
  },
  {
    name: 'Uncapped Nano-Loan Promise',
    pattern: /(?:instant approval with zero (?:interest|fees)|unlimited borrow)/i,
    citation: 'FCCPC Consumer Credit Protection Rules',
    severity: 'HIGH' as SeverityLevel,
  },
];

export class DriftWatcherService {
  private dbClient: SupabaseClient;
  private aiEngine: AiEngine;

  constructor(dbClient?: SupabaseClient, aiEngine?: AiEngine) {
    this.dbClient = dbClient || createClient();
    this.aiEngine = aiEngine || new AiEngine();
  }

  /**
   * Fetches the visible text from a live URL, safely stripping HTML and scripts.
   */
  public async fetchLiveText(url: string): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Cogent-Drift-Watcher/1.0 (RegTech Compliance Monitor)',
          Accept: 'text/html,application/xhtml+xml,text/plain',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP fetch returned status ${response.status}`);
      }

      const html = await response.text();
      return this.extractVisibleText(html);
    } catch (err: any) {
      logger.warn({ url, error: err.message }, 'Failed to fetch live URL text, using fallback');
      throw err;
    }
  }

  /**
   * Cleans raw HTML into normalized visible text.
   */
  public extractVisibleText(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Computes lowercase SHA-256 hex digest.
   */
  public static computeHash(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Core Post-Publish Drift Verification flow.
   * Compares live text against original scan record and returns comprehensive DriftReportViewModel.
   */
  public async verifyLiveUrl(params: {
    liveUrl: string;
    organizationId: string;
    originalScanId?: string;
    channel?: MarketingChannel;
    directLiveText?: string;
  }): Promise<DriftReportViewModel> {
    const {
      liveUrl,
      organizationId,
      originalScanId,
      channel = 'LANDING_PAGE_WEBSITE',
      directLiveText,
    } = params;
    const timestamp = new Date().toISOString();

    let liveText = directLiveText || '';
    if (!liveText) {
      try {
        liveText = await this.fetchLiveText(liveUrl);
      } catch (err: any) {
        logger.error({ liveUrl, err: err.message }, 'Drift verification failed to fetch live text');
        return {
          liveUrl,
          channel,
          originalHash: 'UNKNOWN',
          liveHash: 'FETCH_ERROR',
          isDrifted: true,
          driftStatus: 'ERROR',
          lastCheckedAt: timestamp,
          driftSeverity: 'HIGH',
          omittedDisclosures: [],
          modifiedClaims: [],
          findings: [
            {
              id: 'err_fetch_fail',
              findingType: 'ALTERED_CLAIM',
              severity: 'HIGH',
              description: `Live URL unreachable or timed out: ${err.message}`,
              regulatoryRisk: 'Inability to verify active promotional claims exposes institution to unmonitored publication penalties.',
              statutoryCitation: 'ARCON Advertising Standards Panel Guidelines',
            },
          ],
          liveTextExcerpt: '',
        };
      }
    }

    const liveHash = DriftWatcherService.computeHash(liveText);

    // Fetch original approved copy and hash
    let originalApprovedText = '';
    let originalHash = '';

    if (originalScanId) {
      try {
        const { data: scanRow } = await this.dbClient
          .from('marketing_scans')
          .select('compliant_rewrite_full, raw_copy')
          .eq('id', originalScanId)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (scanRow) {
          originalApprovedText = scanRow.compliant_rewrite_full || scanRow.raw_copy || '';
          originalHash = DriftWatcherService.computeHash(originalApprovedText);
        }
      } catch (scanErr) {
        logger.warn({ scanErr, originalScanId }, 'Could not load original scan row');
      }
    }

    // Also check if we have a registered live asset record for this URL
    let existingAssetId: string | undefined;
    try {
      const { data: assetRow } = await this.dbClient
        .from('marketing_live_assets')
        .select('id, original_approved_hash')
        .eq('organization_id', organizationId)
        .eq('live_url', liveUrl)
        .maybeSingle();

      if (assetRow) {
        existingAssetId = assetRow.id;
        if (!originalHash && assetRow.original_approved_hash) {
          originalHash = assetRow.original_approved_hash;
        }
      }
    } catch (assetErr) {
      logger.warn({ assetErr, liveUrl }, 'Could not query marketing_live_assets');
    }

    if (!originalHash) {
      originalHash = liveHash; // If no baseline exists, current hash becomes baseline
    }

    const isDrifted = liveHash !== originalHash;
    const omittedDisclosures: string[] = [];
    const modifiedClaims: string[] = [];
    const findings: DriftFindingItem[] = [];
    let highestSeverity: SeverityLevel | 'NONE' = 'NONE';

    if (isDrifted) {
      // ──────────────────────────────────────────────────────────────────────────
      // 1. Deterministic Checks for Omitted Mandatory Disclosures
      // ──────────────────────────────────────────────────────────────────────────
      for (const disclosure of STATUTORY_DISCLOSURE_PATTERNS) {
        const hadInOriginal =
          originalApprovedText.length > 0 && disclosure.pattern.test(originalApprovedText);
        const hasInLive = disclosure.pattern.test(liveText);

        // If disclosure was present originally (or is universally mandatory) and is missing in live
        if ((hadInOriginal || originalApprovedText.length === 0) && !hasInLive) {
          omittedDisclosures.push(disclosure.name);
          highestSeverity = 'CRITICAL';
          findings.push({
            id: `omitted_${disclosure.name.toLowerCase().replace(/\s+/g, '_')}`,
            findingType: 'OMITTED_MANDATORY_DISCLOSURE',
            severity: disclosure.severity,
            description: `Mandatory disclosure "${disclosure.name}" was omitted or stripped from the live asset.`,
            regulatoryRisk: `Publishing promotional material without statutory disclosure violates Nigerian advertising regulations.`,
            statutoryCitation: disclosure.citation,
          });
        }
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 2. Deterministic Checks for Unapproved High-Risk Promises
      // ──────────────────────────────────────────────────────────────────────────
      for (const promise of UNAPPROVED_PROMISE_PATTERNS) {
        if (promise.pattern.test(liveText)) {
          const hadInOriginal =
            originalApprovedText.length > 0 && promise.pattern.test(originalApprovedText);
          if (!hadInOriginal) {
            modifiedClaims.push(`Added unapproved claim: ${promise.name}`);
            if (highestSeverity !== 'CRITICAL') {
              highestSeverity = promise.severity;
            }
            findings.push({
              id: `unapproved_${promise.name.toLowerCase().replace(/\s+/g, '_')}`,
              findingType: 'UNAPPROVED_PROMISE',
              severity: promise.severity,
              liveText: liveText.match(promise.pattern)?.[0],
              description: `High-risk claim "${promise.name}" was added to live content without CCO sign-off.`,
              regulatoryRisk: 'Unvetted promotional claims expose institution to immediate enforcement queries.',
              statutoryCitation: promise.citation,
            });
          }
        }
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 3. AI Semantic Drift Analysis (FAST_MODEL)
      // ──────────────────────────────────────────────────────────────────────────
      if (originalApprovedText && originalApprovedText !== liveText) {
        try {
          const aiDriftResult = await this.aiEngine.generateStructured<DriftAnalysisOutput>({
            systemInstruction: `You are an expert regulatory compliance auditor for African financial institutions.
Compare the CCO-APPROVED COPY against the LIVE PUBLISHED COPY.
Detect if marketing or affiliates drifted from approved language:
1. Omitted mandatory disclosures (e.g. licensed by CBN, insured by NDIC).
2. Modified rates, yields, or guarantees.
3. Added unapproved promises.
DO NOT output currency penalties or fines.`,
            prompt: `CCO-APPROVED COPY:
"""
${originalApprovedText}
"""

LIVE PUBLISHED COPY:
"""
${liveText}
"""`,
            schema: DriftAnalysisOutputSchema,
            modelAlias: 'FAST_MODEL',
          });

          if (aiDriftResult.data) {
            const aiData = aiDriftResult.data;
            for (const f of aiData.findings || []) {
              const alreadyCovered = findings.some(
                (existing) =>
                  existing.description.toLowerCase().includes(f.description.toLowerCase()) ||
                  (f.liveExcerpt && existing.liveText?.includes(f.liveExcerpt))
              );
              if (!alreadyCovered) {
                findings.push({
                  id: `ai_drift_${findings.length + 1}`,
                  findingType: f.findingType,
                  severity: f.severity,
                  liveText: f.liveExcerpt,
                  originalText: f.originalExcerpt,
                  description: f.description,
                  regulatoryRisk: 'Unauthorized divergence from CCO approved promotional terms.',
                  statutoryCitation: 'ARCON & CBN Consumer Protection Regulations',
                });
                if (highestSeverity === 'NONE' || f.severity === 'CRITICAL') {
                  highestSeverity = f.severity;
                }
              }
            }
          }
        } catch (aiErr) {
          logger.warn({ aiErr }, 'AI drift evaluation failed, relying on deterministic findings');
        }
      }

      if (highestSeverity === 'NONE') {
        highestSeverity = 'HIGH';
      }
    }

    const driftStatus: DriftStatus = isDrifted ? 'DRIFT_DETECTED' : 'SYNCED';

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Update marketing_live_assets Table
    // ──────────────────────────────────────────────────────────────────────────
    try {
      if (existingAssetId) {
        await this.dbClient
          .from('marketing_live_assets')
          .update({
            drift_status: driftStatus,
            drift_findings: findings,
            last_checked_at: timestamp,
          })
          .eq('id', existingAssetId);
      } else if (organizationId) {
        await this.dbClient.from('marketing_live_assets').upsert(
          {
            organization_id: organizationId,
            scan_id: originalScanId || null,
            live_url: liveUrl,
            channel,
            original_approved_hash: originalHash,
            last_checked_at: timestamp,
            drift_status: driftStatus,
            drift_findings: findings,
          },
          { onConflict: 'organization_id,live_url' }
        );
      }
    } catch (dbErr) {
      logger.warn({ dbErr }, 'Could not persist drift status update to marketing_live_assets');
    }

    return {
      assetId: existingAssetId,
      scanId: originalScanId,
      liveUrl,
      channel,
      originalHash,
      liveHash,
      isDrifted,
      driftStatus,
      lastCheckedAt: timestamp,
      driftSeverity: highestSeverity,
      omittedDisclosures,
      modifiedClaims,
      findings,
      liveTextExcerpt: liveText.substring(0, 300),
    };
  }

  /**
   * Registers a new live asset to watch.
   */
  public async registerLiveAsset(input: RegisterLiveAssetInput): Promise<LiveAssetRecord> {
    const { data, error } = await this.dbClient
      .from('marketing_live_assets')
      .upsert(
        {
          organization_id: input.organizationId,
          scan_id: input.scanId || null,
          live_url: input.liveUrl,
          channel: input.channel,
          original_approved_hash: input.originalApprovedHash,
          drift_status: 'SYNCED',
          last_checked_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,live_url' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register live asset: ${error.message}`);
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      scanId: data.scan_id,
      liveUrl: data.live_url,
      channel: data.channel,
      originalApprovedHash: data.original_approved_hash,
      lastCheckedAt: data.last_checked_at,
      driftStatus: data.drift_status,
      driftFindings: data.drift_findings,
      createdAt: data.created_at,
    };
  }

  /**
   * Lists tracked live assets for a tenant organization.
   */
  public async listTrackedAssets(organizationId: string): Promise<LiveAssetRecord[]> {
    const { data, error } = await this.dbClient
      .from('marketing_live_assets')
      .select('*')
      .eq('organization_id', organizationId)
      .order('last_checked_at', { ascending: false });

    if (error) {
      logger.warn({ error, organizationId }, 'Failed to query marketing_live_assets');
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      organizationId: r.organization_id,
      scanId: r.scan_id,
      liveUrl: r.live_url,
      channel: r.channel,
      originalApprovedHash: r.original_approved_hash,
      lastCheckedAt: r.last_checked_at,
      driftStatus: r.drift_status,
      driftFindings: r.drift_findings,
      createdAt: r.created_at,
    }));
  }
}
