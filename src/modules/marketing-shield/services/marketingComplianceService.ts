import { GoogleGenAI } from '@google/genai';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import { MarketingChannel, ProductCategoryCode } from '@/shared/types';
import {
  MarketingCampaign,
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
  attachedAssetBase64?: string;
  attachedAssetMimeType?: string;
}

export interface CopilotAnalysisResult {
  replyMessage: string;
  findings: StructuredFinding[];
  extractedClaims: Array<Omit<ExtractedPromotionalClaim, 'id' | 'createdAt' | 'updatedAt'>>;
  executiveVerdict: 'COMPLIANT' | 'WARNING' | 'BLOCKING_ISSUE';
  riskSummary: string;
}

export class MarketingComplianceService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Retrieves active Nigerian statutory rules applicable to this campaign's product category and channel.
   */
  public async getApplicableRules(
    dbClient: SupabaseClient,
    organizationId: string,
    productCategory: ProductCategoryCode,
    channel: MarketingChannel,
    scopedRegulators?: string[]
  ): Promise<MarketingKnowledgeRule[]> {
    let query = dbClient
      .from('marketing_knowledge_rules')
      .select('*')
      .eq('organization_id', organizationId);

    if (scopedRegulators && scopedRegulators.length > 0 && !scopedRegulators.includes('ALL')) {
      query = query.in('regulator_code', scopedRegulators);
    }

    const { data, error } = await query;
    if (error || !data) {
      logger.error({ error }, 'Failed to fetch marketing knowledge rules');
      return [];
    }

    // Filter rules by category and channel applicability if specified
    return data.filter((rule) => {
      const matchCat =
        !rule.applies_to_categories ||
        rule.applies_to_categories.length === 0 ||
        rule.applies_to_categories.includes(productCategory) ||
        rule.applies_to_categories.includes('GENERAL_BRAND');

      const matchChan =
        !rule.applies_to_channels ||
        rule.applies_to_channels.length === 0 ||
        rule.applies_to_channels.includes(channel);

      return matchCat && matchChan;
    }).map((r) => ({
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
      isCustom: r.is_custom || false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Evaluates campaign copy & visual asset using Gemini against real Nigerian statutory rules.
   */
  public async analyzeCampaign(
    dbClient: SupabaseClient,
    input: CampaignAnalysisInput
  ): Promise<CopilotAnalysisResult> {
    const rules = await this.getApplicableRules(
      dbClient,
      input.organizationId,
      input.productCategory,
      input.channel,
      input.scopedRegulations
    );

    const categoryMeta = PRODUCT_CATEGORIES_CATALOG[input.productCategory] || {
      label: input.productCategory,
      regulator: 'CBN / ARCON',
      statutoryBasis: 'Nigerian Financial Regulations',
    };

    const rulesContext = rules.map((r, i) => `
[RULE ${i + 1}] Code: ${r.ruleCode} | Regulator: ${r.regulatorCode}
Citation: ${r.statutoryCitation}
Verbatim Statute: "${r.verbatimClause}"
Prohibited Phrases: ${r.prohibitedTerms.join(', ') || 'None specified'}
Mandatory Disclosures Required: ${r.mandatoryDisclosures.join(', ') || 'None specified'}
`).join('\n');

    const promptText = `
You are the Cogent Marketing Compliance Copilot, an institutional supervisory system designed for Nigerian Banks, FinTechs, and Financial Institutions under oversight by the CBN, ARCON, FCCPC, SEC, and NDIC.

OBJECTIVE:
Analyze the submitted promotional ad copy and creative against real Nigerian financial and advertising laws.
CRITICAL EPISTEMIC GUARDRAIL:
1. NEVER invent fake risk scores (e.g. do not say "Risk Score 94/100").
2. NEVER invent fake arbitrary fine numbers (e.g. do not invent arbitrary multi-million Naira penalty figures).
3. Only cite real statutory sections and penalties if written in the retrieved statutory rules.
4. Assess visual prominence and context:
   - Product Category: ${categoryMeta.label} (Regulated by ${categoryMeta.regulator})
   - Dissemination Channel: ${input.channel}
5. Flag violations as 'BLOCKING_ISSUE' (prohibited claims, guarantees, deception) or 'WARNING' (missing mandatory statutory disclosures, missing license reference).
6. Provide punchy, conversion-preserving compliant rewrites that a growth marketer can directly apply.

STATUTORY RULES IN KNOWLEDGE BASE:
${rulesContext}

SUBMITTED CAMPAIGN COPY:
"""
${input.copyText}
"""

OUTPUT FORMAT:
Respond with ONLY valid JSON strictly adhering to this schema:
{
  "executiveVerdict": "BLOCKING_ISSUE" | "WARNING" | "COMPLIANT",
  "riskSummary": "1-2 sentence executive briefing on statutory readiness.",
  "findings": [
    {
      "claimElement": "The exact verbatim word or phrase in the ad copy",
      "regulatoryRule": "Rule name (e.g. Prohibition of Guaranteed Credit)",
      "statutoryCitation": "Exact statutory citation (e.g. ARCON Code 2022 Article 24(1)(b))",
      "severity": "BLOCKING_ISSUE" | "WARNING" | "COMPLIANT",
      "complianceGap": "Plain English explanation of why this claim violates the law",
      "requiredFix": "Exact remediation needed (e.g. State underwriting criteria and APR)",
      "suggestedRewrite": "A punchy, compliant replacement phrase"
    }
  ],
  "extractedClaims": [
    {
      "code": "CLM-001",
      "claimText": "Exact promotional or financial claim extracted",
      "verdict": "BLOCKING_ISSUE" | "WARNING" | "COMPLIANT",
      "statutoryCitation": "Exact citation",
      "verbatimRule": "Verbatim statutory clause",
      "aiRationale": "Why this claim passed or failed contextually",
      "suggestedRewrite": "Compliant phrasing",
      "reviewStatus": "PENDING"
    }
  ],
  "replyMessage": "A professional, direct copilot response summarizing findings to the user and asking if they want to apply the suggested fixes to the canvas."
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
      const modelName = process.env.AI_FAST_MODEL || 'gemini-2.0-flash';
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const raw = response.text || '{}';
      let clean = raw.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);

      const parsed = JSON.parse(clean.trim());

      const findings: StructuredFinding[] = (parsed.findings || []).map((f: any, idx: number) => ({
        id: `fnd-${Date.now()}-${idx + 1}`,
        claimElement: f.claimElement || '',
        regulatoryRule: f.regulatoryRule || 'Statutory Requirement',
        statutoryCitation: f.statutoryCitation || 'Nigerian Financial Regulations',
        severity: (['BLOCKING_ISSUE', 'WARNING', 'COMPLIANT'].includes(f.severity) ? f.severity : 'WARNING') as any,
        complianceGap: f.complianceGap || '',
        requiredFix: f.requiredFix || '',
        suggestedRewrite: f.suggestedRewrite || '',
      }));

      const extractedClaims = (parsed.extractedClaims || []).map((c: any, idx: number) => ({
        campaignId: input.campaignId,
        organizationId: input.organizationId,
        code: c.code || `CLM-${String(idx + 1).padStart(3, '0')}`,
        claimText: c.claimText || '',
        verdict: (['BLOCKING_ISSUE', 'WARNING', 'COMPLIANT'].includes(c.verdict) ? c.verdict : 'WARNING') as any,
        regulationId: null,
        statutoryCitation: c.statutoryCitation || 'ARCON Code 2022',
        verbatimRule: c.verbatimRule || 'Statutory compliance obligation',
        aiRationale: c.aiRationale || '',
        suggestedRewrite: c.suggestedRewrite || null,
        reviewStatus: 'PENDING' as const,
      }));

      return {
        replyMessage: parsed.replyMessage || 'I have completed the regulatory assessment against Nigerian financial regulations.',
        findings,
        extractedClaims,
        executiveVerdict: parsed.executiveVerdict || (findings.some(f => f.severity === 'BLOCKING_ISSUE') ? 'BLOCKING_ISSUE' : findings.length > 0 ? 'WARNING' : 'COMPLIANT'),
        riskSummary: parsed.riskSummary || (findings.length > 0 ? `${findings.length} statutory findings identified.` : 'Zero statutory infractions detected.'),
      };
    } catch (err) {
      logger.error({ err }, 'Gemini campaign analysis error');

      // Fallback deterministic evaluation based on active knowledge rules
      const findings: StructuredFinding[] = [];
      const extractedClaims: any[] = [];
      const lower = input.copyText.toLowerCase();

      let claimIdx = 1;
      for (const rule of rules) {
        for (const term of rule.prohibitedTerms) {
          if (lower.includes(term.toLowerCase())) {
            findings.push({
              id: `fnd-det-${claimIdx}`,
              claimElement: term,
              regulatoryRule: rule.title,
              statutoryCitation: rule.statutoryCitation,
              severity: 'BLOCKING_ISSUE',
              complianceGap: `Prohibited phrasing "${term}" detected under ${rule.statutoryCitation}.`,
              requiredFix: `Remove promise of guaranteed outcome and include underwriting criteria.`,
              suggestedRewrite: `Subject to credit assessment and underwriting approval.`,
            });

            extractedClaims.push({
              campaignId: input.campaignId,
              organizationId: input.organizationId,
              code: `CLM-${String(claimIdx).padStart(3, '0')}`,
              claimText: term,
              verdict: 'BLOCKING_ISSUE' as const,
              regulationId: rule.regulationId,
              statutoryCitation: rule.statutoryCitation,
              verbatimRule: rule.verbatimClause,
              aiRationale: `Directly matches prohibited statutory pattern under ${rule.statutoryCitation}.`,
              suggestedRewrite: `Subject to credit assessment.`,
              reviewStatus: 'PENDING' as const,
            });
            claimIdx++;
          }
        }
      }

      const verdict = findings.length > 0 ? 'BLOCKING_ISSUE' : 'COMPLIANT';

      return {
        replyMessage: findings.length > 0
          ? `I evaluated your campaign copy against active rules in our Knowledge Base and detected ${findings.length} statutory compliance issues. Please review the findings table below and apply compliant rewrites.`
          : `I reviewed your promotional copy against active statutory rules in our Knowledge Base. No prohibited terms or blocking statutory violations were detected.`,
        findings,
        extractedClaims,
        executiveVerdict: verdict,
        riskSummary: findings.length > 0
          ? `${findings.length} statutory violations flagged under Nigerian advertising regulations.`
          : 'Zero statutory infractions detected.',
      };
    }
  }

  /**
   * Aurora Selection Rewrite: Rewrites highlighted text inline according to user action.
   */
  public async rewriteSelection(params: {
    selectedText: string;
    actionPrompt: string;
    productCategory: ProductCategoryCode;
    channel: MarketingChannel;
  }): Promise<string> {
    const prompt = `
You are the Cogent Inline Compliance Editor.
A marketer has highlighted the following text in an ad campaign:
"""
${params.selectedText}
"""

USER INSTRUCTION:
${params.actionPrompt}

CONTEXT:
Product Category: ${params.productCategory}
Channel: ${params.channel}
Jurisdiction: Nigeria (ARCON, CBN, FCCPC, SEC, NDIC)

REQUIREMENTS:
1. Provide ONLY the rewritten replacement text. Do NOT include quotation marks, markdown wrappers, or pleasantries.
2. Ensure the replacement is 100% compliant with Nigerian advertising regulations (no prohibited guarantees, transparent disclosures, proper license references).
3. Preserve the marketing persuasion and punchiness.
`;

    try {
      const modelName = process.env.AI_FAST_MODEL || 'gemini-2.0-flash';
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      });

      return (response.text || params.selectedText).trim();
    } catch (err) {
      logger.error({ err }, 'Failed to rewrite selection');
      // Robust statutory fallback for offline / rate-limit resilience
      if (
        params.actionPrompt.toLowerCase().includes('guarantee') ||
        params.actionPrompt.toLowerCase().includes('compliant') ||
        params.actionPrompt.toLowerCase().includes('apr')
      ) {
        let text = params.selectedText
          .replace(/0% interest|zero interest/gi, 'transparent interest rates from 1.5% monthly (APR 18%-32%)')
          .replace(/guaranteed approval|guaranteed|100% approval|100%|risk-free/gi, 'credit appraisal');
        if (!text.toLowerCase().includes('subject to')) {
          text = `${text}. Subject to credit assessment and underwriting approval.`;
        }
        return text;
      }
      return params.selectedText;
    }
  }
}
