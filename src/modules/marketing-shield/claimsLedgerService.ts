/**
 * Phase 1 / Task 1.2 — Institutional Claims Ledger Service
 *
 * Responsibilities:
 * 1. Ingest tenant approved claims into memory / cache.
 * 2. Prior to calling LLM, evaluate input copy against `tenant_claims_ledger` for the selected `product_category`.
 * 3. Exact and fuzzy match detection against prohibited counterparts and approved claims.
 * 4. Yield `CLAIMS_LEDGER_MATCH` finding cards with CCO rationale and approved substitute phrasing.
 * 5. Persist CCO-approved phrasings via `addApprovedClaim` when the CCO signs off with "Save to Ledger".
 *
 * Source of Truth:
 * - docs/PILLAR_1_MARKETING_SHIELD.md Section 5
 * - docs/INTEGRATION_ROADMAP_AND_AGENT_WORKFLOWS.md Section 4 (Task 1.2)
 * - docs/DATA_MODEL.md Section 6
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import {
  ProductCategoryCode,
  RegulatorCode,
  SeverityLevel,
} from '@/shared/types';
import { FindingPresentationCard } from '@/shared/types/presentation';

export interface TenantClaimEntry {
  id: string;
  organizationId: string;
  productCategory: ProductCategoryCode;
  approvedText: string;
  prohibitedCounterpart: string | null;
  governingRegulator: RegulatorCode;
  statutoryCitation: string;
  ccoRationale: string;
  approvedByUserId: string | null;
  approvedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateClaimInput {
  organizationId: string;
  productCategory: ProductCategoryCode;
  approvedText: string;
  prohibitedCounterpart?: string | null;
  governingRegulator: RegulatorCode;
  statutoryCitation: string;
  ccoRationale: string;
  approvedByUserId?: string | null;
  expiresAt?: string | null;
}

export interface ClaimsLedgerMatchFinding {
  claimId: string;
  productCategory: ProductCategoryCode;
  regulatorCode: RegulatorCode;
  matchedType: 'EXACT' | 'FUZZY';
  flaggedExcerpt: string;
  startIndex?: number;
  endIndex?: number;
  similarityScore: number;
  approvedText: string;
  prohibitedCounterpart: string | null;
  statutoryCitation: string;
  ccoRationale: string;
}

export interface ClaimsLedgerEvaluationResult {
  hasMatches: boolean;
  matches: ClaimsLedgerMatchFinding[];
  presentationCards: FindingPresentationCard[];
  suggestedRewrite: string | null;
  executionLatencyMs: number;
}

/**
 * Baseline institutional claims catalog for Nigerian RegTech institutions.
 * Seeded in-memory so every tenant has active institutional memory out of the box.
 */
export const DEFAULT_INSTITUTIONAL_CLAIMS: Omit<TenantClaimEntry, 'id' | 'organizationId' | 'approvedByUserId' | 'createdAt'>[] = [
  {
    productCategory: 'WEALTHTECH_INVEST',
    approvedText: 'Earn up to 25% targeted annual yield on vetted assets. Capital at risk. Regulated by SEC.',
    prohibitedCounterpart: 'Guaranteed 25% returns on investment',
    governingRegulator: 'SEC',
    statutoryCitation: 'SEC Rule 198(2) & ISA 2007 s.67',
    ccoRationale: 'Capital protection promises without statutory trust fund backing violate SEC anti-guarantee rules. Explicit risk warning required.',
    approvedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    isActive: true,
  },
  {
    productCategory: 'DIGITAL_NANO_LOAN',
    approvedText: 'Flexible nano-loans with transparent interest rates and no hidden disbursement fees. Approved under FCCPC guidelines.',
    prohibitedCounterpart: 'Instant loan with zero interest',
    governingRegulator: 'FCCPC',
    statutoryCitation: 'FCCPC Limited Interim Regulatory Framework s.4(a)',
    ccoRationale: 'Zero interest marketing that masks origination fees or rollover charges violates FCCPC truth-in-lending regulations.',
    approvedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    isActive: true,
  },
  {
    productCategory: 'SAVINGS_DEPOSIT',
    approvedText: 'Deposits securely held and insured by NDIC up to statutory limits.',
    prohibitedCounterpart: 'Your deposits are 100% risk free',
    governingRegulator: 'CBN',
    statutoryCitation: 'NDIC Act 2023 s.21 & CBN Consumer Protection Framework s.4.2',
    ccoRationale: 'Private deposit-taking institutions cannot claim total risk elimination without referencing statutory NDIC insurance ceilings.',
    approvedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    isActive: true,
  },
  {
    productCategory: 'PAYMENTS_WALLET',
    approvedText: 'Tiered payment wallet compliant with CBN Tier-1 and Tier-2 KYC transaction ceilings.',
    prohibitedCounterpart: 'Unlimited wallet spending without verification',
    governingRegulator: 'CBN',
    statutoryCitation: 'CBN Tiered KYC Regulations 2021 s.3',
    ccoRationale: 'Uncapped transaction messaging without Tier KYC disclosures breaches CBN AML/CFT daily transaction limits.',
    approvedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    isActive: true,
  },
  {
    productCategory: 'REMITTANCE_FX',
    approvedText: 'Competitive real-time remittance with transparent exchange rates and regulatory FX reporting.',
    prohibitedCounterpart: 'Zero-fee international transfers guaranteed',
    governingRegulator: 'CBN',
    statutoryCitation: 'CBN Foreign Exchange Manual & IMTO Circular 2024',
    ccoRationale: 'Masking foreign exchange spread margin as "zero-fee" constitutes prohibited deceptive promotion under CBN regulations.',
    approvedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    isActive: true,
  },
];

/**
 * Calculates Jaccard token overlap between two phrases for fuzzy matching.
 */
function calculateWordOverlap(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const tokensA = new Set(normalize(a));
  const tokensB = new Set(normalize(b));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

export class ClaimsLedgerService {
  private dbClient: SupabaseClient;
  private cache = new Map<string, { claims: TenantClaimEntry[]; cachedAt: number }>();
  private readonly CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

  constructor(dbClient?: SupabaseClient) {
    this.dbClient = dbClient || createClient();
  }

  /**
   * Fetches active claims for the tenant and product category, with memory caching.
   */
  public async getActiveClaims(
    organizationId: string,
    productCategory?: ProductCategoryCode
  ): Promise<TenantClaimEntry[]> {
    const cacheKey = `${organizationId}:${productCategory || 'ALL'}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.claims;
    }

    let claims: TenantClaimEntry[] = [];

    try {
      let query = this.dbClient
        .from('tenant_claims_ledger')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (productCategory) {
        query = query.eq('product_category', productCategory);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.warn({ error, organizationId }, 'Failed to query tenant_claims_ledger table');
      } else if (data && data.length > 0) {
        claims = data.map((r: any) => ({
          id: r.id,
          organizationId: r.organization_id,
          productCategory: r.product_category as ProductCategoryCode,
          approvedText: r.approved_text,
          prohibitedCounterpart: r.prohibited_counterpart,
          governingRegulator: r.governing_regulator as RegulatorCode,
          statutoryCitation: r.statutory_citation,
          ccoRationale: r.cco_rationale,
          approvedByUserId: r.approved_by_user_id,
          approvedAt: r.approved_at,
          expiresAt: r.expires_at,
          isActive: r.is_active,
          createdAt: r.created_at,
        }));
      }
    } catch (err) {
      logger.warn({ err, organizationId }, 'Exception querying tenant_claims_ledger');
    }

    // Augment with baseline institutional defaults for categories not yet customized
    const existingApprovedTexts = new Set(claims.map((c) => c.approvedText.toLowerCase()));
    for (const [idx, defaultClaim] of DEFAULT_INSTITUTIONAL_CLAIMS.entries()) {
      if (
        (!productCategory || defaultClaim.productCategory === productCategory) &&
        !existingApprovedTexts.has(defaultClaim.approvedText.toLowerCase())
      ) {
        claims.push({
          id: `default_claim_${defaultClaim.productCategory}_${idx + 1}`,
          organizationId,
          ...defaultClaim,
          approvedByUserId: null,
          createdAt: defaultClaim.approvedAt,
        });
      }
    }

    this.cache.set(cacheKey, { claims, cachedAt: now });
    return claims;
  }

  /**
   * Evaluates marketing copy against tenant claims ledger before LLM invocation.
   * Target execution latency: < 20ms
   */
  public async matchClaims(
    rawCopy: string,
    organizationId: string,
    productCategory?: ProductCategoryCode
  ): Promise<ClaimsLedgerEvaluationResult> {
    const startTime = performance.now();
    const activeClaims = await this.getActiveClaims(organizationId, productCategory);

    const matches: ClaimsLedgerMatchFinding[] = [];
    const presentationCards: FindingPresentationCard[] = [];
    const normalizedCopy = rawCopy.toLowerCase();
    let updatedCopy = rawCopy;

    for (const claim of activeClaims) {
      if (!claim.prohibitedCounterpart) continue;

      const counterpart = claim.prohibitedCounterpart.trim();
      const lowerCounterpart = counterpart.toLowerCase();

      // 1. Exact substring check
      const exactIndex = normalizedCopy.indexOf(lowerCounterpart);
      if (exactIndex !== -1) {
        const flaggedExcerpt = rawCopy.substring(exactIndex, exactIndex + counterpart.length);
        const match: ClaimsLedgerMatchFinding = {
          claimId: claim.id,
          productCategory: claim.productCategory,
          regulatorCode: claim.governingRegulator,
          matchedType: 'EXACT',
          flaggedExcerpt,
          startIndex: exactIndex,
          endIndex: exactIndex + counterpart.length,
          similarityScore: 1.0,
          approvedText: claim.approvedText,
          prohibitedCounterpart: claim.prohibitedCounterpart,
          statutoryCitation: claim.statutoryCitation,
          ccoRationale: claim.ccoRationale,
        };
        matches.push(match);

        // Replace matched substring in suggested rewrite
        const regex = new RegExp(counterpart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        updatedCopy = updatedCopy.replace(regex, claim.approvedText);

        presentationCards.push(this.toPresentationCard(match, presentationCards.length + 1));
        continue;
      }

      // 2. Fuzzy similarity check for phrases >= 3 words
      const words = lowerCounterpart.split(/\s+/).filter((w) => w.length > 2);
      if (words.length >= 3) {
        const score = calculateWordOverlap(rawCopy, counterpart);
        if (score >= 0.7) {
          // Find approximate sentence or clause in raw copy
          const sentences = rawCopy.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
          let bestSentence = counterpart;
          let bestSentenceScore = 0;

          for (const s of sentences) {
            const sScore = calculateWordOverlap(s, counterpart);
            if (sScore > bestSentenceScore) {
              bestSentenceScore = sScore;
              bestSentence = s;
            }
          }

          const match: ClaimsLedgerMatchFinding = {
            claimId: claim.id,
            productCategory: claim.productCategory,
            regulatorCode: claim.governingRegulator,
            matchedType: 'FUZZY',
            flaggedExcerpt: bestSentence,
            similarityScore: Math.round(score * 100) / 100,
            approvedText: claim.approvedText,
            prohibitedCounterpart: claim.prohibitedCounterpart,
            statutoryCitation: claim.statutoryCitation,
            ccoRationale: claim.ccoRationale,
          };
          matches.push(match);
          presentationCards.push(this.toPresentationCard(match, presentationCards.length + 1));
        }
      }
    }

    const executionLatencyMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      hasMatches: matches.length > 0,
      matches,
      presentationCards,
      suggestedRewrite: matches.length > 0 && updatedCopy !== rawCopy ? updatedCopy : null,
      executionLatencyMs,
    };
  }

  /**
   * Converts a claims ledger match into a FindingPresentationCard with institutional styling.
   */
  private toPresentationCard(
    match: ClaimsLedgerMatchFinding,
    index: number
  ): FindingPresentationCard {
    const severity: SeverityLevel = match.matchedType === 'EXACT' ? 'HIGH' : 'MEDIUM';

    return {
      id: `finding_claims_${index}`,
      ruleCode: `CLM_${match.regulatorCode}_${match.productCategory}`,
      regulatorCode: match.regulatorCode,
      severity,
      findingType: 'CLAIMS_LEDGER_MATCH',
      flaggedExcerpt: match.flaggedExcerpt,
      startIndex: match.startIndex,
      endIndex: match.endIndex,
      whyItMatters: `Institutional Memory Match (${match.matchedType}): Previously reviewed and remediated by the CCO. ${match.ccoRationale}`,
      statutoryCitation: match.statutoryCitation,
      statutoryPenaltyNaira: 0,
      recommendedAction: `Apply CCO-Approved Replacement: "${match.approvedText}"`,
      mandatoryDisclosureRequired: null,
    };
  }

  /**
   * Adds an approved claim to the institutional memory ledger.
   * Invoked when CCO signs off with "Save to Claims Ledger".
   */
  public async addApprovedClaim(entry: CreateClaimInput): Promise<TenantClaimEntry> {
    if (!entry.approvedText || entry.approvedText.trim().length === 0) {
      throw new Error('Approved text cannot be empty');
    }
    if (!entry.ccoRationale || entry.ccoRationale.trim().length === 0) {
      throw new Error('CCO rationale cannot be empty');
    }

    const payload = {
      organization_id: entry.organizationId,
      product_category: entry.productCategory,
      approved_text: entry.approvedText.trim(),
      prohibited_counterpart: entry.prohibitedCounterpart ? entry.prohibitedCounterpart.trim() : null,
      governing_regulator: entry.governingRegulator,
      statutory_citation: entry.statutoryCitation.trim(),
      cco_rationale: entry.ccoRationale.trim(),
      approved_by_user_id: entry.approvedByUserId || null,
      expires_at: entry.expiresAt || null,
      is_active: true,
    };

    let { data, error } = await this.dbClient
      .from('tenant_claims_ledger')
      .insert(payload)
      .select()
      .single();

    // If foreign key constraint failed on approved_by_user_id, retry with null
    if (error && error.code === '23503' && payload.approved_by_user_id) {
      logger.warn({ error, userId: payload.approved_by_user_id }, 'FK constraint failed for approved_by_user_id, retrying with null');
      payload.approved_by_user_id = null;
      const retry = await this.dbClient
        .from('tenant_claims_ledger')
        .insert(payload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      logger.error({ error, entry }, 'Failed to persist claim to tenant_claims_ledger');
      throw new Error(`Failed to save claim to ledger: ${error?.message || 'Unknown database error'}`);
    }

    // Invalidate tenant cache
    this.cache.delete(`${entry.organizationId}:${entry.productCategory}`);
    this.cache.delete(`${entry.organizationId}:ALL`);

    logger.info(
      {
        claimId: data.id,
        organizationId: entry.organizationId,
        productCategory: entry.productCategory,
        approvedText: entry.approvedText,
      },
      'Institutional claim persisted to tenant_claims_ledger'
    );

    return {
      id: data.id,
      organizationId: data.organization_id,
      productCategory: data.product_category as ProductCategoryCode,
      approvedText: data.approved_text,
      prohibitedCounterpart: data.prohibited_counterpart,
      governingRegulator: data.governing_regulator as RegulatorCode,
      statutoryCitation: data.statutory_citation,
      ccoRationale: data.cco_rationale,
      approvedByUserId: data.approved_by_user_id,
      approvedAt: data.approved_at,
      expiresAt: data.expires_at,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  }

  /**
   * Toggles the active status of a claim in the ledger.
   */
  public async setClaimActive(
    claimId: string,
    organizationId: string,
    isActive: boolean
  ): Promise<void> {
    const { error } = await this.dbClient
      .from('tenant_claims_ledger')
      .update({ is_active: isActive })
      .eq('id', claimId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to update claim status: ${error.message}`);
    }

    // Invalidate caches
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${organizationId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}
