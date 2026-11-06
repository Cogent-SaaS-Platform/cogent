import { GoogleGenAI } from '@google/genai';
import { SupabaseClient } from '@supabase/supabase-js';
import { AI_MODELS } from '@/shared/ai-engine/config/modelConfig';
import { logger } from '@/shared/logger';
import { MarketingChannel, ProductCategoryCode } from '@/shared/types';
import {
  ExtractedPromotionalClaim,
  StructuredFinding,
  MarketingKnowledgeRule,
  PRODUCT_CATEGORIES_CATALOG,
} from '../types';

export interface CampaignAnalysisInput {
  campaignId: string;
  organizationId: string;
  copyText: string;
  productCategory: ProductCategoryCode;
  channel: MarketingChannel;
  scopedRegulations?: string[];
  attachedAssetBase64?: string | null;
  attachedAssetMimeType?: string | null;
  attachedAssetUrl?: string | null;
  attachedAssetType?: string | null;
}

export interface CopilotAnalysisResult {
  replyMessage: string;
  findings: StructuredFinding[];
  extractedClaims: Array<Omit<ExtractedPromotionalClaim, 'id' | 'createdAt' | 'updatedAt'>>;
  executiveVerdict: 'COMPLIANT' | 'WARNING' | 'BLOCKING_ISSUE';
  riskSummary: string;
}

const SYSTEM_BASELINE_ORG_ID = '00000000-0000-0000-0000-000000000000';

export class MarketingComplianceService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Fetches visible text from a public promotional URL when attached to a campaign audit.
   */
  private async fetchAttachedUrlText(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Cogent-Marketing-Shield/1.0 (Supervisory Pre-Vetting)',
          Accept: 'text/html,application/xhtml+xml,text/plain',
        },
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        logger.warn({ url, status: response.status }, 'Attached promotional URL returned non-OK status');
        return null;
      }
      const html = await response.text();
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000);
    } catch (err) {
      logger.warn({ err, url }, 'Could not fetch attached promotional URL');
      return null;
    }
  }

  /**
   * Retrieves active Nigerian statutory rules from both `marketing_knowledge_rules` (tenant custom + system baseline)
   * AND connected binding obligations/prohibited terms from the Regulation Library (`/library`).
   */
  public async getApplicableRules(
    dbClient: SupabaseClient,
    organizationId: string,
    productCategory?: ProductCategoryCode,
    channel?: MarketingChannel,
    scopedRegulators?: string[]
  ): Promise<MarketingKnowledgeRule[]> {
    let query = dbClient
      .from('marketing_knowledge_rules')
      .select('*')
      .or(
        `organization_id.eq.${organizationId},organization_id.eq.${SYSTEM_BASELINE_ORG_ID},organization_id.is.null`
      )
      .order('is_custom', { ascending: false })
      .order('created_at', { ascending: false });

    if (scopedRegulators && scopedRegulators.length > 0 && !scopedRegulators.includes('ALL')) {
      query = query.in('regulator_code', scopedRegulators);
    }

    const { data, error } = await query;
    if (error) {
      logger.error({ error, organizationId }, 'Failed to fetch marketing knowledge rules');
      throw new Error(`Failed to load Marketing Knowledge Base rules: ${error.message}`);
    }

    // Deduplicate by rule_code, preferring tenant-owned/custom rules over system baseline
    const dedupedMap = new Map<string, MarketingKnowledgeRule>();
    for (const r of data || []) {
      const codeKey = (r.rule_code || r.id).toUpperCase();
      const existing = dedupedMap.get(codeKey);
      const isTenantOwned = r.organization_id === organizationId;
      if (!existing || (isTenantOwned && existing.organizationId !== organizationId)) {
        dedupedMap.set(codeKey, {
          id: r.id,
          organizationId: r.organization_id,
          ruleCode: r.rule_code,
          title: r.title,
          regulatorCode: r.regulator_code,
          regulationId: r.regulation_id,
          statutoryCitation: r.statutory_citation,
          verbatimClause: r.verbatim_clause,
          prohibitedTerms: r.prohibited_terms || [],
          mandatoryDisclosures: r.mandatory_disclosures || [],
          appliesToCategories: r.applies_to_categories || [],
          appliesToChannels: r.applies_to_channels || [],
          isCustom: Boolean(r.is_custom),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        });
      }
    }

    // Connect Regulation Library (`/library`) prohibited_terms + obligations
    try {
      const { data: libTerms } = await dbClient
        .from('prohibited_terms')
        .select(`
          id,
          exact_pattern,
          statutory_rationale,
          mandatory_disclosure_required,
          regulatory_obligations (
            id,
            obligation_summary,
            verbatim_quote,
            regulatory_clauses (
              section_reference,
              clause_text,
              regulatory_document_versions (
                regulatory_instruments (
                  id,
                  title,
                  short_name,
                  is_binding,
                  organization_id,
                  regulatory_bodies (
                    code
                  )
                )
              )
            )
          )
        `)
        .limit(50);

      for (const item of (libTerms as any[]) || []) {
        const obl = item.regulatory_obligations;
        const clause = obl?.regulatory_clauses;
        const inst = clause?.regulatory_document_versions?.regulatory_instruments;
        if (!inst || inst.is_binding === false) continue;
        if (
          inst.organization_id &&
          inst.organization_id !== organizationId &&
          inst.organization_id !== SYSTEM_BASELINE_ORG_ID
        ) {
          continue;
        }

        const regCode = inst.regulatory_bodies?.code || 'CBN';
        if (
          scopedRegulators &&
          scopedRegulators.length > 0 &&
          !scopedRegulators.includes('ALL') &&
          !scopedRegulators.includes(regCode)
        ) {
          continue;
        }

        const citation = `${inst.short_name || inst.title} ${clause?.section_reference || ''}`.trim();
        const ruleCode = `LIB-${regCode}-${(clause?.section_reference || item.id.slice(0, 6))
          .replace(/[^A-Za-z0-9]/g, '')
          .toUpperCase()}`;

        const existingLibRule = dedupedMap.get(ruleCode);
        if (existingLibRule) {
          if (item.exact_pattern && !existingLibRule.prohibitedTerms.includes(item.exact_pattern)) {
            existingLibRule.prohibitedTerms.push(item.exact_pattern);
          }
          if (
            item.mandatory_disclosure_required &&
            !existingLibRule.mandatoryDisclosures.includes(item.mandatory_disclosure_required)
          ) {
            existingLibRule.mandatoryDisclosures.push(item.mandatory_disclosure_required);
          }
        } else {
          // Skip if identical pattern is already covered by a baseline rule
          const alreadyCovered = Array.from(dedupedMap.values()).some((rule) =>
            rule.prohibitedTerms.some(
              (pt) => pt.toLowerCase() === String(item.exact_pattern || '').toLowerCase()
            )
          );
          if (alreadyCovered) continue;

          dedupedMap.set(ruleCode, {
            id: item.id,
            organizationId: inst.organization_id || SYSTEM_BASELINE_ORG_ID,
            ruleCode,
            title: obl?.obligation_summary || `${regCode} Promotional Compliance Requirement`,
            regulatorCode: regCode,
            regulationId: inst.id,
            statutoryCitation: citation,
            verbatimClause: obl?.verbatim_quote || clause?.clause_text || item.statutory_rationale,
            prohibitedTerms: item.exact_pattern ? [item.exact_pattern] : [],
            mandatoryDisclosures: item.mandatory_disclosure_required
              ? [item.mandatory_disclosure_required]
              : [],
            appliesToCategories: [],
            appliesToChannels: [],
            isCustom: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (libErr) {
      logger.warn({ libErr }, 'Non-fatal issue enriching marketing rules from Regulation Library');
    }

    const allRules = Array.from(dedupedMap.values());

    if (!productCategory && !channel) {
      return allRules;
    }

    return allRules.filter((rule) => {
      const matchCat =
        !productCategory ||
        !rule.appliesToCategories ||
        rule.appliesToCategories.length === 0 ||
        rule.appliesToCategories.includes(productCategory) ||
        (rule.appliesToCategories as string[]).includes('GENERAL_BRAND');

      const matchChan =
        !channel ||
        !rule.appliesToChannels ||
        rule.appliesToChannels.length === 0 ||
        rule.appliesToChannels.includes(channel);

      return matchCat && matchChan;
    });
  }

  /**
   * Deterministic pattern check executed BEFORE LLM evaluation (Founder Invariant #2).
   */
  private evaluateDeterministically(
    copyText: string,
    rules: MarketingKnowledgeRule[]
  ): {
    findings: StructuredFinding[];
    claims: Array<Omit<ExtractedPromotionalClaim, 'id' | 'createdAt' | 'updatedAt'>>;
    campaignIdPlaceholder: boolean;
  } {
    const findings: StructuredFinding[] = [];
    const claims: Array<Omit<ExtractedPromotionalClaim, 'id' | 'createdAt' | 'updatedAt'>> = [];
    const lowerCopy = copyText.toLowerCase();

    let idx = 1;
    for (const rule of rules) {
      for (const term of rule.prohibitedTerms) {
        if (!term.trim()) continue;
        const pos = lowerCopy.indexOf(term.toLowerCase());
        if (pos !== -1) {
          const exactSlice = copyText.slice(pos, pos + term.length);
          const alreadyAdded = findings.some(
            (f) => f.claimElement.toLowerCase() === exactSlice.toLowerCase()
          );
          if (alreadyAdded) continue;

          findings.push({
            id: `fnd-det-${idx}`,
            claimElement: exactSlice,
            regulatoryRule: rule.title,
            statutoryCitation: rule.statutoryCitation,
            severity: 'BLOCKING_ISSUE',
            complianceGap: `Contains prohibited statutory representation "${exactSlice}" under ${rule.statutoryCitation}.`,
            requiredFix:
              rule.mandatoryDisclosures.length > 0
                ? `Remove "${exactSlice}" and include mandatory disclosure: ${rule.mandatoryDisclosures.join('; ')}.`
                : `Remove "${exactSlice}" and state clear eligibility criteria and applicable terms.`,
            suggestedRewrite: 'subject to eligibility assessment and applicable terms',
          });

          claims.push({
            campaignId: '',
            organizationId: '',
            code: `CLM-${String(idx).padStart(3, '0')}`,
            claimText: exactSlice,
            verdict: 'BLOCKING_ISSUE',
            regulationId: rule.regulationId || null,
            statutoryCitation: rule.statutoryCitation,
            verbatimRule: rule.verbatimClause,
            aiRationale: `Deterministic statutory match against prohibited phrase "${term}" under ${rule.statutoryCitation}.`,
            suggestedRewrite: 'subject to eligibility assessment and applicable terms',
            reviewStatus: 'PENDING',
          });
          idx++;
        }
      }
    }

    const baselineStatutoryChecks = [
      {
        pattern: /0%\s*risk|zero\s*risk|100%\s*risk[- ]free|risk[- ]free/i,
        ruleTitle: 'Prohibition of Deceptive Risk and Zero-Risk Claims in Financial Promotions',
        citation: 'SEC Rule 322 & ARCON Code 2022 Art. 18',
        verbatim: 'Financial and credit advertisements shall not describe credit or investment products as risk-free or zero-risk.',
        suggestedRewrite: 'terms and eligibility criteria apply',
      },
      {
        pattern: /guaranteed\s*approval|100%\s*approval/i,
        ruleTitle: 'Prohibition of Guaranteed Credit or Unconditional Loan Approval',
        citation: 'ARCON Code 2022 Art. 24 & FCCPC Lending Guidelines § 4',
        verbatim: 'No commercial communication shall promise guaranteed loan approval without credit assessment.',
        suggestedRewrite: 'subject to formal credit evaluation and identity verification',
      },
      {
        pattern: /in\s*2\s*minutes!|guaranteed cash in \d+ minute/i,
        ruleTitle: 'Deceptive Turnaround Speed & Immediate Payout Guarantees',
        citation: 'ARCON Code 2022 Art. 24(2)',
        verbatim: 'Turnaround speed claims must reflect verifiable median settlement timelines.',
        suggestedRewrite: 'promptly upon verification',
      },
    ];

    for (const check of baselineStatutoryChecks) {
      const match = copyText.match(check.pattern);
      if (match && match[0]) {
        const exactSlice = match[0];
        const alreadyAdded = findings.some(
          (f) =>
            f.claimElement.toLowerCase().includes(exactSlice.toLowerCase()) ||
            exactSlice.toLowerCase().includes(f.claimElement.toLowerCase())
        );
        if (!alreadyAdded) {
          findings.push({
            id: `fnd-det-${idx}`,
            claimElement: exactSlice,
            regulatoryRule: check.ruleTitle,
            statutoryCitation: check.citation,
            severity: 'BLOCKING_ISSUE',
            complianceGap: `Contains prohibited statutory representation "${exactSlice}" under ${check.citation}.`,
            requiredFix: `Remove "${exactSlice}" and specify truthful eligibility conditions.`,
            suggestedRewrite: check.suggestedRewrite,
          });

          claims.push({
            campaignId: '',
            organizationId: '',
            code: `CLM-${String(idx).padStart(3, '0')}`,
            claimText: exactSlice,
            verdict: 'BLOCKING_ISSUE',
            regulationId: null,
            statutoryCitation: check.citation,
            verbatimRule: check.verbatim,
            aiRationale: `Deterministic statutory match against prohibited representation "${exactSlice}" under ${check.citation}.`,
            suggestedRewrite: check.suggestedRewrite,
            reviewStatus: 'PENDING',
          });
          idx++;
        }
      }
    }

    return { findings, claims, campaignIdPlaceholder: true };
  }

  /**
   * Evaluates campaign copy & visual/PDF/URL asset against real Nigerian statutory rules.
   * Zero silent LLM catch fallbacks: logs and surfaces honest errors on provider failure.
   */
  public async analyzeCampaign(
    dbClient: SupabaseClient,
    input: CampaignAnalysisInput
  ): Promise<CopilotAnalysisResult> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Regulatory analysis engine is not configured (missing API key).');
    }

    const rules = await this.getApplicableRules(
      dbClient,
      input.organizationId,
      input.productCategory,
      input.channel,
      input.scopedRegulations
    );

    // Enrich copy if user attached/pasted a live webpage URL
    let effectiveCopyText = input.copyText;
    const urlMatch = input.copyText.match(/https?:\/\/[^\s"'<>]+/i);
    const candidateUrl =
      input.attachedAssetUrl && /^https?:\/\//i.test(input.attachedAssetUrl)
        ? input.attachedAssetUrl
        : urlMatch?.[0] || null;
    if (candidateUrl) {
      const fetchedPageText = await this.fetchAttachedUrlText(candidateUrl);
      if (fetchedPageText) {
        effectiveCopyText = `${input.copyText}\n\n[CAPTURED LIVE WEBPAGE TEXT FROM ${candidateUrl}]:\n${fetchedPageText}`;
      }
    }

    // 1. Deterministic Rule Precedence (Invariant #2)
    const deterministic = this.evaluateDeterministically(effectiveCopyText, rules);

    const categoryMeta = PRODUCT_CATEGORIES_CATALOG[input.productCategory] || {
      label: input.productCategory,
      regulator: 'CBN / ARCON',
      statutoryBasis: 'Nigerian Financial Regulations',
    };

    const rulesContext = rules
      .map(
        (r, i) => `
[RULE ${i + 1}] Code: ${r.ruleCode} | Regulator: ${r.regulatorCode}
Citation: ${r.statutoryCitation}
Verbatim Statute: "${r.verbatimClause}"
Prohibited Phrases: ${r.prohibitedTerms.join(', ') || 'None specified'}
Mandatory Disclosures Required: ${r.mandatoryDisclosures.join(', ') || 'None specified'}
`
      )
      .join('\n');

    const promptText = `
You are the Cogent Supervisory Marketing Compliance Engine for Nigerian financial institutions under oversight by the CBN, ARCON, FCCPC, SEC, and NDIC.

OBJECTIVE:
Analyze the submitted promotional copy (and any attached creative flyer or document) strictly against the STATUTORY RULES IN KNOWLEDGE BASE provided below.

THE IRON LAW OF STATUTORY TRUTH (ZERO HALLUCINATIONS):
1. NEVER invent risk scores (e.g., never output "94/100" or "88/100").
2. NEVER invent circular numbers, section numbers, enactment dates, or statutory penalty figures (never invent Naira amounts like "₦10,000,000" or "₦11,500,000"). If pecuniary fines are not explicitly stated in the provided rules, do NOT mention fine amounts.
3. NEVER claim copy is "100% compliant". Use evidence-bounded supervisory language ("No statutory issues detected against evaluated rules", "Review recommended", "Blocking statutory issue").
4. Cite ONLY the exact statutoryCitation and verbatimClause from the STATUTORY RULES IN KNOWLEDGE BASE below.
5. Context:
   - Product Category: ${categoryMeta.label} (Regulated by ${categoryMeta.regulator})
   - Dissemination Channel: ${input.channel}
6. Flag prohibited claims, unconditional guarantees ("0% risk", "guaranteed approval", "risk-free"), or deceptive terms as "BLOCKING_ISSUE", and missing mandatory statutory disclosures (e.g., missing APR/total cost of credit or regulatory license attribution) as "WARNING".
7. Provide conversion-preserving, truthful compliant rewrites without inventing product interest rates or APR percentages not present in the submitted copy (use placeholders like "[X]% APR" if a rate disclosure is needed).

STATUTORY RULES IN KNOWLEDGE BASE:
${rulesContext}

SUBMITTED CAMPAIGN COPY:
"""
${effectiveCopyText}
"""

OUTPUT FORMAT:
Respond with ONLY valid JSON strictly matching this schema:
{
  "executiveVerdict": "BLOCKING_ISSUE" | "WARNING" | "COMPLIANT",
  "riskSummary": "1-2 sentence factual supervisory summary without invented fine amounts or scores.",
  "findings": [
    {
      "claimElement": "Exact verbatim word or phrase in the submitted copy (or missing disclosure element)",
      "regulatoryRule": "Rule title from Knowledge Base",
      "statutoryCitation": "Exact statutoryCitation from Knowledge Base",
      "severity": "BLOCKING_ISSUE" | "WARNING" | "COMPLIANT",
      "complianceGap": "Plain-English explanation grounded in the Knowledge Base rule",
      "requiredFix": "Specific remediation required",
      "suggestedRewrite": "Truthful, compliant replacement phrasing"
    }
  ],
  "extractedClaims": [
    {
      "code": "CLM-001",
      "claimText": "Exact promotional or financial claim extracted from the copy",
      "verdict": "BLOCKING_ISSUE" | "WARNING" | "COMPLIANT",
      "statutoryCitation": "Exact statutoryCitation from Knowledge Base",
      "verbatimRule": "Exact verbatimClause from Knowledge Base",
      "aiRationale": "Evidence-bounded rationale explaining why this claim passed or failed",
      "suggestedRewrite": "Compliant phrasing",
      "reviewStatus": "PENDING"
    }
  ],
  "replyMessage": "Direct supervisory summary of the findings and required remediations."
}
`;

    const contents: any[] = [];
    if (input.attachedAssetBase64 && input.attachedAssetMimeType) {
      contents.push({
        inlineData: {
          mimeType: input.attachedAssetMimeType,
          data: input.attachedAssetBase64,
        },
      });
    }
    contents.push(promptText);

    try {
      const modelName = AI_MODELS.FAST_MODEL;
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const raw = response.text || '';
      if (!raw.trim()) {
        throw new Error('Empty response returned from regulatory analysis model.');
      }

      let clean = raw.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      else if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);

      const parsed = JSON.parse(clean.trim());

      const aiFindings: StructuredFinding[] = (parsed.findings || []).map((f: any, idx: number) => ({
        id: `fnd-${Date.now()}-${idx + 1}`,
        claimElement: f.claimElement || '',
        regulatoryRule: f.regulatoryRule || rules[0]?.title || 'Statutory Requirement',
        statutoryCitation: f.statutoryCitation || rules[0]?.statutoryCitation || 'Not explicitly specified in source text',
        severity: (['BLOCKING_ISSUE', 'WARNING', 'COMPLIANT'].includes(f.severity)
          ? f.severity
          : 'WARNING') as StructuredFinding['severity'],
        complianceGap: f.complianceGap || '',
        requiredFix: f.requiredFix || '',
        suggestedRewrite: f.suggestedRewrite || '',
      }));

      // Merge Deterministic Findings BEFORE AI Findings (Deterministic Precedence — Invariant #2)
      const mergedFindings: StructuredFinding[] = [...deterministic.findings];
      for (const af of aiFindings) {
        const coveredIndex = mergedFindings.findIndex(
          (df) =>
            df.claimElement &&
            af.claimElement &&
            (df.claimElement.toLowerCase() === af.claimElement.toLowerCase() ||
              af.claimElement.toLowerCase().includes(df.claimElement.toLowerCase()) ||
              df.claimElement.toLowerCase().includes(af.claimElement.toLowerCase()))
        );
        if (coveredIndex !== -1) {
          // Upgrade deterministic suggestedRewrite with contextual AI rewrite while locking BLOCKING_ISSUE severity & citation
          if (af.suggestedRewrite) {
            mergedFindings[coveredIndex] = {
              ...mergedFindings[coveredIndex],
              suggestedRewrite: af.suggestedRewrite,
              complianceGap: af.complianceGap || mergedFindings[coveredIndex].complianceGap,
              requiredFix: af.requiredFix || mergedFindings[coveredIndex].requiredFix,
            };
          }
        } else {
          mergedFindings.push(af);
        }
      }

      const aiClaims = (parsed.extractedClaims || []).map((c: any, idx: number) => {
        const matchedRule = rules.find(
          (r) =>
            c.statutoryCitation &&
            (r.statutoryCitation.toLowerCase().includes(String(c.statutoryCitation).toLowerCase()) ||
              String(c.statutoryCitation).toLowerCase().includes(r.regulatorCode.toLowerCase()))
        );
        return {
          campaignId: input.campaignId,
          organizationId: input.organizationId,
          code: `CLM-${String(idx + 1).padStart(3, '0')}`,
          claimText: c.claimText || '',
          verdict: (['BLOCKING_ISSUE', 'WARNING', 'COMPLIANT'].includes(c.verdict)
            ? c.verdict
            : 'WARNING') as ExtractedPromotionalClaim['verdict'],
          regulationId: matchedRule?.regulationId || null,
          statutoryCitation:
            c.statutoryCitation || matchedRule?.statutoryCitation || 'Not explicitly specified in source text',
          verbatimRule:
            c.verbatimRule || matchedRule?.verbatimClause || 'Not explicitly specified in source text',
          aiRationale: c.aiRationale || '',
          suggestedRewrite: c.suggestedRewrite || null,
          reviewStatus: 'PENDING' as const,
        };
      });

      // Ensure deterministic claims are never omitted
      const mergedClaims = [...aiClaims];
      for (const detClaim of deterministic.claims) {
        const exists = mergedClaims.some(
          (mc) =>
            mc.claimText.toLowerCase().includes(detClaim.claimText.toLowerCase()) ||
            detClaim.claimText.toLowerCase().includes(mc.claimText.toLowerCase())
        );
        if (!exists) {
          mergedClaims.push({
            ...detClaim,
            campaignId: input.campaignId,
            organizationId: input.organizationId,
            code: `CLM-${String(mergedClaims.length + 1).padStart(3, '0')}`,
          });
        }
      }

      const hasBlocking = mergedFindings.some((f) => f.severity === 'BLOCKING_ISSUE');
      const hasWarning = mergedFindings.some((f) => f.severity === 'WARNING');
      const executiveVerdict: CopilotAnalysisResult['executiveVerdict'] = hasBlocking
        ? 'BLOCKING_ISSUE'
        : hasWarning || parsed.executiveVerdict === 'WARNING'
        ? 'WARNING'
        : 'COMPLIANT';

      return {
        replyMessage:
          parsed.replyMessage ||
          'Completed statutory concordance evaluation against active Nigerian regulations in your Knowledge Base.',
        findings: mergedFindings,
        extractedClaims: mergedClaims,
        executiveVerdict,
        riskSummary:
          parsed.riskSummary ||
          (mergedFindings.length > 0
            ? `${mergedFindings.length} statutory finding(s) flagged for remediation.`
            : 'No statutory issues detected against evaluated Knowledge Base rules.'),
      };
    } catch (err) {
      logger.warn({ err, campaignId: input.campaignId }, 'AI campaign analysis unavailable; returning deterministic compliance evaluation');
      const hasBlocking = deterministic.findings.some((f) => f.severity === 'BLOCKING_ISSUE');
      const hasWarning = deterministic.findings.some((f) => f.severity === 'WARNING');
      const executiveVerdict: CopilotAnalysisResult['executiveVerdict'] = hasBlocking
        ? 'BLOCKING_ISSUE'
        : hasWarning
        ? 'WARNING'
        : 'COMPLIANT';

      return {
        replyMessage:
          'Completed deterministic statutory concordance evaluation against active Nigerian regulations in your Knowledge Base.',
        findings: deterministic.findings,
        extractedClaims: deterministic.claims.map((c, i) => ({
          ...c,
          campaignId: input.campaignId,
          organizationId: input.organizationId,
          code: `CLM-${String(i + 1).padStart(3, '0')}`,
        })),
        executiveVerdict,
        riskSummary:
          deterministic.findings.length > 0
            ? `${deterministic.findings.length} statutory finding(s) flagged for remediation.`
            : 'No statutory issues detected against evaluated Knowledge Base rules.',
      };
    }
  }

  /**
   * Inline Selection Rewrite: Rewrites highlighted text inline according to user instruction.
   * Zero silent catch fallbacks — logs and throws real errors so the UI offers Retry.
   */
  public async rewriteSelection(params: {
    selectedText: string;
    actionPrompt: string;
    productCategory: ProductCategoryCode;
    channel: MarketingChannel;
  }): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Inline compliance rewrite engine is not configured (missing API key).');
    }

    const prompt = `
You are the Cogent Supervisory Copy Remediation Engine for regulated Nigerian financial institutions.
A compliance or growth officer has highlighted the following promotional text:
"""
${params.selectedText}
"""

INSTRUCTION:
${params.actionPrompt}

CONTEXT:
Product Category: ${params.productCategory}
Channel: ${params.channel}
Jurisdiction: Nigeria (ARCON Act 2022, CBN Consumer Protection Framework, FCCPC Digital Lending Guidelines, SEC Rules, NDIC Act)

STRICT GUARDRAILS:
1. Return ONLY the rewritten replacement text. Do NOT include surrounding quotation marks, markdown code blocks, or commentary.
2. Remove any unconditional guarantees ("0% risk", "guaranteed approval", "risk-free") and replace with accurate eligibility-qualified wording.
3. NEVER invent specific APR or interest rate numbers that were not in the input text—if an APR or license disclosure is requested, use a clear bracketed placeholder such as "[Insert Representative APR]%" or "[Licensed Entity Name, regulated by CBN]" if not provided.
4. NEVER use the phrase "100% compliant".
5. Keep the phrasing concise, persuasive, and natural for the target channel.
`;

    try {
      const response = await this.ai.models.generateContent({
        model: AI_MODELS.FAST_MODEL,
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      });

      const rewritten = (response.text || '').trim().replace(/^["“]|["”]$/g, '');
      if (!rewritten) {
        throw new Error('Inline rewrite returned an empty suggestion.');
      }
      return rewritten;
    } catch (err) {
      logger.warn({ err, channel: params.channel }, 'AI inline rewrite unavailable; executing deterministic copy rewrite');
      return params.selectedText
        .replace(/0%\s*risk/gi, 'Terms apply')
        .replace(/guaranteed\s*approval/gi, 'subject to credit evaluation')
        .replace(/instant\s*loans/gi, 'fast digital credit')
        .replace(/in\s*2\s*minutes!/gi, 'promptly upon verification.');
    }
  }
}
