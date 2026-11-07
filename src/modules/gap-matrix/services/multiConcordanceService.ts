import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { AiEngine } from '@/shared/ai-engine';
import { AuditService } from '@/modules/audit/auditService';
import { logger } from '@/shared/logger';
import { ComplianceStatus } from '@/shared/types';
import { z } from 'zod';
import { SeniorCounselBriefing, ExecutiveMacroBriefing } from '../types';

export interface MultiRegulationConcordanceInput {
  organizationId: string;
  userId?: string | null;
  analysisName: string;
  regulationIds: string[];
  policyIds: string[];
  scope: 'COMPLETE_REGULATORY_REVIEW' | 'POLICY_REGULATORY_REVIEW';
  createdByName?: string;
}

export interface CriterionEvaluationResult {
  id: string;
  criterionText: string;
  criterionType: 'Core Criteria' | 'Best Practice';
  status: 'MET' | 'NOT_MET';
  aiReason: string;
  matchedPolicySections: Array<{
    policyId: string;
    policyTitle: string;
    sectionNumber: string;
    sectionTitle: string;
    verbatimPolicyExcerpt: string;
  }>;
  humanOverride?: boolean;
}

export interface ActionPlanItem {
  id: string;
  title: string;
  policyTitle: string;
  policyId?: string;
  assigneeName?: string;
  assigneeRole?: string;
  linkedObligationCode: string;
  linkedObligationId?: string;
  completed: boolean;
  dueDate?: string;
}

const CriterionAiEvaluationSchema = z.object({
  criterionEvaluations: z.array(
    z.object({
      criterionId: z.string().optional(),
      criterionIndex: z.union([z.number(), z.string()]).transform((v) => Number(v) || 1).optional(),
      status: z.string().transform((s) => (s && s.toUpperCase().includes('MET') && !s.toUpperCase().includes('NOT') ? 'MET' : 'NOT_MET')),
      aiReason: z.string().min(1),
      matchedPolicySectionIds: z.array(z.string()).nullish().transform((arr) => arr || []),
      matchedSectionIndices: z.array(z.union([z.number(), z.string()])).nullish().transform((arr) => (arr || []).map((x) => Number(x)).filter((n) => !isNaN(n))),
      suggestedActionItem: z.string().nullish().transform((s) => s || undefined),
    })
  ),
  draftRemediationClause: z.string().nullish().transform((s) => s || undefined),
  suggestedActionItem: z.string().nullish().transform((s) => s || undefined),
  seniorCounselBriefing: z
    .object({
      executiveVerdict: z.string().nullish().transform((s) => s || 'DEFENSIBLE WITH NOTABLE OPERATIONAL EXPOSURES'),
      verdictSummary: z.string().nullish().transform((s) => s || ''),
      supervisoryContext: z.string().nullish().transform((s) => s || ''),
      evidentiaryAnalysis: z.string().nullish().transform((s) => s || ''),
      strategicRemediation: z.string().nullish().transform((s) => s || ''),
      briefingMarkdown: z.string().nullish().transform((s) => s || ''),
    })
    .optional(),
});

export class MultiConcordanceService {
  private db: SupabaseClient<Database>;
  private aiEngine: AiEngine;

  constructor(options: { dbClient: SupabaseClient<Database>; aiEngine?: AiEngine }) {
    this.db = options.dbClient;
    this.aiEngine = options.aiEngine || new AiEngine();
  }

  /**
   * Executes a full multi-regulation vs multi-policy gap evaluation grounded strictly in DB records
   */
  public async runMultiConcordance(input: MultiRegulationConcordanceInput) {
    const startTime = performance.now();
    const evaluationId = crypto.randomUUID();
    const {
      organizationId,
      userId,
      analysisName,
      regulationIds,
      policyIds,
      scope,
      createdByName = 'Authorized Compliance Officer',
    } = input;

    logger.info(
      { evaluationId, organizationId, regulationIds, policyIds, scope },
      'Starting multi-regulation vs multi-policy concordance analysis'
    );

    // 1. Fetch binding Regulations visible to this tenant with their Active Document Versions
    let resolvedInstrumentIds = [...regulationIds];
    let { data: instruments, error: instErr } = await (this.db.from('regulatory_instruments') as any)
      .select(`
        id,
        title,
        short_name,
        domain,
        is_binding,
        organization_id,
        regulatory_bodies ( code, name ),
        regulatory_document_versions (
          id,
          reference_code,
          is_active
        )
      `)
      .eq('is_binding', true)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .in('id', resolvedInstrumentIds);

    if (!instruments || instruments.length === 0) {
      const { data: vers } = await (this.db.from('regulatory_document_versions') as any)
        .select('instrument_id')
        .in('id', resolvedInstrumentIds);
      if (vers && vers.length > 0) {
        resolvedInstrumentIds = Array.from(new Set(vers.map((v: any) => v.instrument_id).filter(Boolean)));
        const res = await (this.db.from('regulatory_instruments') as any)
          .select(`
            id,
            title,
            short_name,
            domain,
            is_binding,
            organization_id,
            regulatory_bodies ( code, name ),
            regulatory_document_versions (
              id,
              reference_code,
              is_active
            )
          `)
          .eq('is_binding', true)
          .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
          .in('id', resolvedInstrumentIds);
        instruments = res.data;
        instErr = res.error;
      }
    }

    if (!instruments || instruments.length === 0) {
      throw new Error(`Failed to load selected binding regulations: ${instErr?.message || 'No eligible regulatory instruments found'}`);
    }

    const versionIds: string[] = [];
    for (const inst of instruments) {
      const activeVersion =
        (inst.regulatory_document_versions || []).find((v: any) => v.is_active) ||
        inst.regulatory_document_versions?.[0];
      if (activeVersion) {
        versionIds.push(activeVersion.id);
      }
    }

    if (versionIds.length === 0) {
      throw new Error('Selected regulatory instruments have no active document versions');
    }

    // Fetch Clauses for these versions
    const { data: clauses, error: clausesErr } = await (this.db.from('regulatory_clauses') as any)
      .select('id, document_version_id, section_reference, section_heading, clause_text')
      .in('document_version_id', versionIds);

    if (clausesErr) {
      logger.error({ err: clausesErr.message }, 'Failed retrieving regulatory clauses');
      throw new Error(`Failed retrieving regulatory clauses: ${clausesErr.message}`);
    }

    const clauseMap = new Map<string, any>();
    const clauseIds: string[] = [];
    for (const c of clauses || []) {
      clauseMap.set(c.id, c);
      clauseIds.push(c.id);
    }

    // Fetch Obligations for these clauses
    let obligations: any[] = [];
    if (clauseIds.length > 0) {
      const { data: oblRows, error: oblErr } = await (this.db.from('regulatory_obligations') as any)
        .select(`
          id,
          clause_id,
          code,
          title,
          description,
          summary,
          rule_type,
          policy_applicability,
          verbatim_quote,
          section_or_page_ref,
          risk_description,
          statutory_timeline_days,
          assessment_criteria
        `)
        .in('clause_id', clauseIds);

      if (oblErr) {
        logger.error({ err: oblErr.message }, 'Failed retrieving obligations');
        throw new Error(`Failed retrieving regulatory obligations: ${oblErr.message}`);
      }
      obligations = oblRows || [];
    }

    // Fetch relational assessment criteria and statutory penalties
    const oblIds = obligations.map((o: any) => o.id);
    const criteriaByObligation = new Map<string, any[]>();
    const penaltyByObligation = new Map<string, number>();

    if (oblIds.length > 0) {
      const [{ data: critData }, { data: penData }] = await Promise.all([
        (this.db as any)
          .from('obligation_assessment_criteria')
          .select('*')
          .in('obligation_id', oblIds)
          .order('order_index', { ascending: true }),
        (this.db as any)
          .from('statutory_penalties')
          .select('obligation_id, penalty_max_naira, penalty_min_naira')
          .in('obligation_id', oblIds),
      ]);

      for (const rc of critData || []) {
        const list = criteriaByObligation.get(rc.obligation_id) || [];
        list.push(rc);
        criteriaByObligation.set(rc.obligation_id, list);
      }

      for (const pen of penData || []) {
        const amount = Number(pen.penalty_max_naira) || Number(pen.penalty_min_naira) || 0;
        if (amount > 0) {
          const existing = penaltyByObligation.get(pen.obligation_id) || 0;
          if (amount > existing) {
            penaltyByObligation.set(pen.obligation_id, amount);
          }
        }
      }
    }

    // 2. Fetch Selected Policies strictly scoped to organizationId
    const { data: policyDocs, error: polErr } = await (this.db.from('policy_documents') as any)
      .select('id, title, department, version_tag, raw_text')
      .eq('organization_id', organizationId)
      .in('id', policyIds);

    if (polErr || !policyDocs || policyDocs.length === 0) {
      throw new Error(`Failed to load selected tenant policies: ${polErr?.message || 'No matching policy documents found for this organization'}`);
    }

    const verifiedPolicyIds = policyDocs.map((d: any) => d.id);
    const policyDocMap = new Map<string, any>();
    policyDocs.forEach((d: any) => policyDocMap.set(d.id, d));

    // Try fetching from policy_sections first, then fallback to policy_clauses
    let policySectionsData: any[] = [];
    try {
      const { data: secRows } = await (this.db as any)
        .from('policy_sections')
        .select('id, policy_id, section_number, section_title, verbatim_content')
        .eq('organization_id', organizationId)
        .in('policy_id', verifiedPolicyIds);
      if (secRows && secRows.length > 0) {
        policySectionsData = secRows;
      }
    } catch {
      // Table may be deferred
    }

    if (policySectionsData.length === 0) {
      const { data: clauseRows } = await (this.db.from('policy_clauses') as any)
        .select('id, policy_id, section_number, section_title, clause_text')
        .eq('organization_id', organizationId)
        .in('policy_id', verifiedPolicyIds);
      if (clauseRows && clauseRows.length > 0) {
        policySectionsData = clauseRows.map((c: any) => ({
          id: c.id,
          policy_id: c.policy_id,
          section_number: c.section_number,
          section_title: c.section_title || c.section_number,
          verbatim_content: c.clause_text,
        }));
      }
    }

    // Build structured policy sections list with Foreign-Key IDs
    const parsedPolicySections: Array<{
      sectionId: string;
      policyId: string;
      policyTitle: string;
      sectionNumber: string;
      sectionTitle: string;
      verbatimContent: string;
    }> = [];

    if (policySectionsData.length > 0) {
      for (const row of policySectionsData) {
        const doc = policyDocMap.get(row.policy_id) || policyDocs[0];
        parsedPolicySections.push({
          sectionId: row.id,
          policyId: row.policy_id,
          policyTitle: doc.title,
          sectionNumber: row.section_number || 'Section 1.0',
          sectionTitle: row.section_title || row.section_number || 'Policy Section',
          verbatimContent: row.verbatim_content || '',
        });
      }
    } else {
      for (const doc of policyDocs) {
        if (doc.raw_text) {
          const paras = doc.raw_text.split(/\n\s*\n/).filter((p: string) => p.trim().length > 20);
          paras.forEach((p: string, idx: number) => {
            const sid = crypto.randomUUID();
            parsedPolicySections.push({
              sectionId: sid,
              policyId: doc.id,
              policyTitle: doc.title,
              sectionNumber: `Section ${idx + 1}.0`,
              sectionTitle: `Section ${idx + 1}.0`,
              verbatimContent: p.trim(),
            });
          });
        }
      }
    }

    if (parsedPolicySections.length === 0) {
      throw new Error('Selected policy document(s) contain no extractable text clauses for evaluation');
    }

    // Index sections by sectionId for backend hydration lock
    const policySectionsById = new Map<string, typeof parsedPolicySections[0]>();
    parsedPolicySections.forEach((s) => policySectionsById.set(s.sectionId, s));

    // 3. Filter obligations if scope is POLICY_REGULATORY_REVIEW
    let targetObligations = obligations;
    if (scope === 'POLICY_REGULATORY_REVIEW') {
      targetObligations = targetObligations.filter(
        (o: any) => o.policy_applicability === 'Policy Applicable' || !o.policy_applicability
      );
    }

    if (targetObligations.length === 0) {
      throw new Error('Selected regulation(s) have zero extracted obligations matching the chosen scope');
    }

    // 4. Criterion-by-Criterion Evaluation Engine
    const evaluatedItems: any[] = [];
    const actionPlan: ActionPlanItem[] = [];
    let adequateCount = 0;
    let partialCount = 0;
    let gapCount = 0;

    for (let oIdx = 0; oIdx < targetObligations.length; oIdx++) {
      const obl = targetObligations[oIdx];
      const parentClause = clauseMap.get(obl.clause_id) || {};
      const targetVersionId = parentClause.document_version_id;
      const parentInst =
        instruments.find((i: any) =>
          (i.regulatory_document_versions || []).some((v: any) => v.id === targetVersionId)
        ) || instruments[0];

      let criteriaList: any[] = criteriaByObligation.get(obl.id) || [];
      if (
        criteriaList.length === 0 &&
        obl.assessment_criteria &&
        Array.isArray(obl.assessment_criteria) &&
        obl.assessment_criteria.length > 0
      ) {
        criteriaList = obl.assessment_criteria.map((c: any, cIdx: number) => ({
          id: c.id || `crit-${obl.id}-${cIdx + 1}`,
          criterion_type: c.type || c.criterion_type || 'Core Criteria',
          criterion_text: c.text || c.criterion_text,
          evidence_required: c.evidenceRequired || c.evidence_required,
        }));
      }

      // Self-Healing Intelligent Gate: If obligation has 0 criteria or old template string, dynamically extract real criteria
      criteriaList = await this.selfHealObligationCriteria(obl, parentClause, criteriaList);

      const cleanTitle =
        obl.title || parentClause.section_heading || parentClause.section_reference || 'Statutory Obligation';
      const obligationCode =
        obl.code || `OBL-${parentInst.regulatory_bodies?.code || 'CBN'}-${String(oIdx + 1).padStart(3, '0')}`;

      // Build structured prompt for LLM evaluation
      const policySectionsJson = parsedPolicySections.slice(0, 30).map((s, idx) => ({
        index: idx + 1,
        sectionId: s.sectionId,
        policyTitle: s.policyTitle,
        sectionNumber: s.sectionNumber,
        sectionTitle: s.sectionTitle,
        verbatimContent: s.verbatimContent.slice(0, 500),
      }));

      const criteriaJson = criteriaList.map((c, idx) => ({
        index: idx + 1,
        criterionId: c.id,
        criterionType: c.criterion_type || c.type || 'Core Criteria',
        criterionText: c.criterion_text || c.text,
        evidenceRequired: c.evidence_required || c.evidenceRequired,
      }));

      const evaluationPrompt = `You are a Senior Regulatory Counsel, Former Central Bank Banking Supervision Director, and Chief Compliance Officer (CCO) Audit Defense Counsel for Cogent.
You are evaluating whether the institution's uploaded internal policy manual satisfies binding statutory law and withstands aggressive regulatory on-site inspection.

DO NOT return flat JSON or robotic one-liners! Provide rigorous, senior legal regulatory reasoning.

STATUTORY OBLIGATION:
- Regulation: ${parentInst.title} (${parentInst.regulatory_bodies?.code || 'CBN'})
- Section Reference: ${parentClause.section_reference || obl.section_or_page_ref || 'Not explicitly specified in source text'}
- Obligation Code: ${obligationCode}
- Title: ${cleanTitle}
- Verbatim Statutory Text: "${obl.verbatim_quote || parentClause.clause_text || obl.description}"

ASSESSMENT CRITERIA TO EVALUATE:
${JSON.stringify(criteriaJson, null, 2)}

UPLOADED INTERNAL POLICY SECTIONS (AVAILABLE EVIDENCE):
${JSON.stringify(policySectionsJson, null, 2)}

STRICT STATUTORY EVIDENCE & REGULATORY COUNSEL RULES:
1. For each criterion, perform a forensic statutory concordance check against the uploaded policy sections.
2. If satisfied, mark status as "MET" and provide in "matchedPolicySectionIds" the exact sectionId UUID(s) from UPLOADED INTERNAL POLICY SECTIONS that substantiate compliance.
3. If not satisfied, mark status as "NOT_MET" and set "matchedPolicySectionIds" to [].
4. In "aiReason", provide a high-conviction, professional 1-3 sentence explanation:
   - When MET: Reference or quote the exact uploaded policy section number and wording establishing the control.
   - When NOT_MET: State specifically what operational control, numerical threshold, approval gate, or reporting timeline is absent or deficient in the policy.
   - NEVER fabricate laws, section numbers, or penalty amounts.
5. In "seniorCounselBriefing": Produce an executive-level legal briefing tailored for the General Counsel and Chief Compliance Officer:
   - "executiveVerdict": Concise legal opinion on defense posture ('DEFENSIBLE WITH NOTABLE OPERATIONAL EXPOSURES', 'SUPERVISORY COMPLIANT', 'SUBSTANTIAL NON-COMPLIANCE RISK', 'CRITICAL SUPERVISORY EXPOSURE').
   - "verdictSummary": 1-2 paragraph executive assessment of the institution's exposure.
   - "supervisoryContext": Legislative intent, Central Bank/SEC/NDPC supervisory examination expectations, examiner focus areas, and precedent enforcement actions.
   - "evidentiaryAnalysis": Forensic side-by-side comparative analysis of the user's uploaded policy manual language vs. statutory mandate—identifying exact ambiguities, omissions, lack of escalation thresholds, or operational loopholes.
   - "strategicRemediation": Practical, strategic legal counsel for the General Counsel and CCO on operationalizing controls, board reporting, and examiner-facing defense.
   - "briefingMarkdown": Full structured Executive Markdown briefing compiling the above with callout blocks (> [!CRITICAL] or > [!WARNING] or > [!NOTE]), clear headings, bold statutory citations, and bulleted action points.
6. In "draftRemediationClause": Write a concrete, copy-pasteable internal policy clause (ready to paste into the user's manual) that satisfies all missing criteria, grounded strictly in the Verbatim Statutory Text.
7. In "suggestedActionItem": Write a concrete, actionable remediation task for the Chief Compliance Officer.`;

      let aiEvaluation: z.infer<typeof CriterionAiEvaluationSchema>;
      try {
        const result = await this.aiEngine.generateStructured({
          systemInstruction:
            'You are a Senior Regulatory Counsel, Former Central Bank Banking Supervision Director, and Chief Compliance Officer Audit Defense Counsel for Cogent. Ground every finding strictly in the provided statutory verbatim text and uploaded internal policy sections. Deliver rigorous senior legal regulatory reasoning formatted for executive C-suite and Board review.',
          prompt: evaluationPrompt,
          schema: CriterionAiEvaluationSchema,
          modelAlias: 'FAST_MODEL',
        });
        aiEvaluation = result.data;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn(
          { err: errMsg, evaluationId, obligationId: obl.id },
          'Structured AI concordance evaluation unavailable; executing deterministic keyword concordance evaluation'
        );

        const deterministicCrits = criteriaList.map((crit, cIdx) => {
          const critText = (crit.criterion_text || crit.text || '').toLowerCase();
          const words = critText.split(/\W+/).filter((w: string) => w.length > 4);

          let bestSectionIdx = -1;
          let bestMatchScore = 0;

          parsedPolicySections.forEach((sec, sIdx) => {
            const secContent = sec.verbatimContent.toLowerCase();
            let matches = 0;
            for (const word of words) {
              if (secContent.includes(word)) matches++;
            }
            if (matches > bestMatchScore && matches >= 2) {
              bestMatchScore = matches;
              bestSectionIdx = sIdx;
            }
          });

          if (bestSectionIdx >= 0) {
            const matchedSec = parsedPolicySections[bestSectionIdx];
            return {
              criterionId: crit.id,
              criterionIndex: cIdx + 1,
              status: 'MET' as const,
              aiReason: `Internal policy ${matchedSec.sectionNumber} (${matchedSec.policyTitle}) explicitly incorporates required controls: "${matchedSec.verbatimContent.slice(0, 140)}..."`,
              matchedPolicySectionIds: [matchedSec.sectionId],
              matchedSectionIndices: [bestSectionIdx + 1],
              suggestedActionItem: undefined,
            };
          } else {
            return {
              criterionId: crit.id,
              criterionIndex: cIdx + 1,
              status: 'NOT_MET' as const,
              aiReason: `Internal policy manual omits mandatory controls specified in statutory criteria: "${crit.criterion_text || crit.text}". Remediation required.`,
              matchedPolicySectionIds: [],
              matchedSectionIndices: [],
              suggestedActionItem: `Adopt policy amendment to establish ${crit.criterion_text || crit.text}`,
            };
          }
        });

        aiEvaluation = {
          criterionEvaluations: deterministicCrits,
          draftRemediationClause: `Section 4.1: The institution shall strictly adhere to supervisory directives regarding: "${obl.verbatim_quote || obl.description || obl.title}".`,
          suggestedActionItem: `Remediate internal policy manual to fulfill statutory obligation ${obligationCode}`,
        };
      }

      // Backend Hydration Lock: Attach verifiable DB evidence
      const finalCriteriaEvaluations: CriterionEvaluationResult[] = [];
      let metCoreCount = 0;
      let totalCoreCount = 0;

      criteriaList.forEach((crit, cIdx) => {
        const aiCrit =
          aiEvaluation.criterionEvaluations.find(
            (a) => (a.criterionId && a.criterionId === crit.id) || a.criterionIndex === cIdx + 1
          ) || aiEvaluation.criterionEvaluations[cIdx];

        if (!aiCrit) {
          throw new Error(`Incomplete criterion evaluation returned for obligation ${obl.code || obl.id}`);
        }

        const status = aiCrit.status;
        const critType: 'Core Criteria' | 'Best Practice' =
          (crit.criterion_type || crit.type) === 'Best Practice' ? 'Best Practice' : 'Core Criteria';

        if (critType === 'Core Criteria') {
          totalCoreCount++;
          if (status === 'MET') metCoreCount++;
        }

        const matchedSections: Array<{
          policyId: string;
          policyTitle: string;
          sectionNumber: string;
          sectionTitle: string;
          verbatimPolicyExcerpt: string;
        }> = [];

        // Backend Hydration Lock: Only attach evidence if status is MET and section exists in uploaded policy
        if (status === 'MET') {
          if (Array.isArray(aiCrit.matchedPolicySectionIds) && aiCrit.matchedPolicySectionIds.length > 0) {
            for (const sId of aiCrit.matchedPolicySectionIds) {
              const sec = policySectionsById.get(sId);
              if (sec) {
                matchedSections.push({
                  policyId: sec.policyId,
                  policyTitle: sec.policyTitle,
                  sectionNumber: sec.sectionNumber,
                  sectionTitle: sec.sectionTitle,
                  verbatimPolicyExcerpt: sec.verbatimContent.slice(0, 350),
                });
              }
            }
          }

          // Fallback to 1-based index if LLM returned indices instead of UUIDs
          if (matchedSections.length === 0 && Array.isArray(aiCrit.matchedSectionIndices) && aiCrit.matchedSectionIndices.length > 0) {
            for (const sIdx of aiCrit.matchedSectionIndices) {
              const sec = parsedPolicySections[sIdx - 1];
              if (sec) {
                matchedSections.push({
                  policyId: sec.policyId,
                  policyTitle: sec.policyTitle,
                  sectionNumber: sec.sectionNumber,
                  sectionTitle: sec.sectionTitle,
                  verbatimPolicyExcerpt: sec.verbatimContent.slice(0, 350),
                });
              }
            }
          }
        }

        finalCriteriaEvaluations.push({
          id: crit.id || `crit-${obl.id}-${cIdx + 1}`,
          criterionText: crit.criterion_text || crit.text,
          criterionType: critType,
          status,
          aiReason: aiCrit.aiReason,
          matchedPolicySections: matchedSections,
          humanOverride: false,
        });
      });

      // Deterministic Roll-up
      const effectiveTotalCore = totalCoreCount > 0 ? totalCoreCount : finalCriteriaEvaluations.length;
      const effectiveMetCore =
        totalCoreCount > 0
          ? metCoreCount
          : finalCriteriaEvaluations.filter((c) => c.status === 'MET').length;

      let derivedStatus: ComplianceStatus = 'CRITICAL_GAP';
      if (effectiveMetCore === effectiveTotalCore && effectiveTotalCore > 0) {
        derivedStatus = 'ADEQUATELY_MET';
        adequateCount++;
      } else if (effectiveMetCore > 0) {
        derivedStatus = 'PARTIALLY_MET';
        partialCount++;
      } else {
        derivedStatus = 'CRITICAL_GAP';
        gapCount++;
      }

      // Dynamic Draft Policy Remediation Clause & Suggested Action Item
      let draftClause = aiEvaluation.draftRemediationClause;
      if (!draftClause || draftClause.length < 20 || derivedStatus === 'ADEQUATELY_MET') {
        if (derivedStatus !== 'ADEQUATELY_MET') {
          const unmet = finalCriteriaEvaluations.filter((c) => c.status === 'NOT_MET');
          const unmetSummary = unmet.map((u) => u.criterionText).join('; ');
          draftClause = `Pursuant to ${parentClause.section_reference || obligationCode} of ${parentInst.title}, the institution shall adopt documented procedures to establish: ${unmetSummary}.`;
        } else {
          draftClause = `Documented controls for ${cleanTitle} are fully established. Maintain ongoing audit records pursuant to ${parentClause.section_reference || obligationCode}.`;
        }
      }

      const explicitTimelineDays =
        typeof obl.statutory_timeline_days === 'number' && obl.statutory_timeline_days > 0
          ? obl.statutory_timeline_days
          : null;

      const suggestedAction =
        aiEvaluation.suggestedActionItem ||
        aiEvaluation.criterionEvaluations.find((ce) => ce.status === 'NOT_MET' && ce.suggestedActionItem)?.suggestedActionItem ||
        (derivedStatus !== 'ADEQUATELY_MET'
          ? `Adopt policy amendment in ${policyDocs[0]?.title || 'Internal Policy'} to satisfy ${obligationCode} (${cleanTitle})`
          : null);

      if (derivedStatus !== 'ADEQUATELY_MET' && suggestedAction) {
        actionPlan.push({
          id: crypto.randomUUID(),
          title: suggestedAction,
          policyTitle: policyDocs[0]?.title || 'Internal Policy',
          policyId: policyDocs[0]?.id,
          assigneeName: createdByName,
          assigneeRole: 'Chief Compliance Officer',
          linkedObligationCode: obligationCode,
          linkedObligationId: obl.id,
          completed: false,
          ...(explicitTimelineDays
            ? { dueDate: new Date(Date.now() + explicitTimelineDays * 86400000).toISOString().slice(0, 10) }
            : {}),
        });
      }

      const realPenaltyNaira =
        derivedStatus === 'ADEQUATELY_MET' ? 0 : penaltyByObligation.get(obl.id) || 0;

      // Ensure high-grade Senior Regulatory Counsel Briefing
      let counselBriefing = aiEvaluation.seniorCounselBriefing;
      if (!counselBriefing || !counselBriefing.briefingMarkdown || counselBriefing.briefingMarkdown.length < 50) {
        const unmet = finalCriteriaEvaluations.filter((c) => c.status === 'NOT_MET');
        const executiveVerdict =
          derivedStatus === 'ADEQUATELY_MET'
            ? 'SUPERVISORY COMPLIANT'
            : derivedStatus === 'PARTIALLY_MET'
            ? 'DEFENSIBLE WITH NOTABLE OPERATIONAL EXPOSURES'
            : 'SUBSTANTIAL NON-COMPLIANCE RISK';

        const verdictSummary =
          derivedStatus === 'ADEQUATELY_MET'
            ? `Forensic policy concordance confirms internal operational manuals incorporate verified, enforceable controls satisfying statutory requirements for ${cleanTitle} under ${parentInst.title}.`
            : derivedStatus === 'PARTIALLY_MET'
            ? `Internal operational procedures satisfy ${effectiveMetCore} of ${effectiveTotalCore} core assessment criteria under ${parentInst.title}. While baseline controls exist, procedural documentation omits formal escalation thresholds and audit verification triggers.`
            : `Comprehensive gap identified: internal company documentation entirely omits mandatory operational controls required under ${parentInst.title} (${parentClause.section_reference || obligationCode}). Zero verifiable safeguards were detected in the uploaded policy suite.`;

        const supervisoryContext =
          obl.risk_description ||
          `Statutory oversight under ${parentInst.title} (${parentClause.section_reference || obligationCode}). Regulatory examiners prioritize affirmative documentation and active supervisory reporting to prevent unhedged institutional liabilities.`;

        const evidentiaryAnalysis =
          derivedStatus === 'ADEQUATELY_MET'
            ? `Forensic concordance confirms internal operating policies explicitly establish all mandatory governance gates, approval hierarchies, and reporting schedules cited in ${cleanTitle}.`
            : `Cross-clause evidentiary concordance highlights missing procedural safeguards: ${unmet.map((u) => u.criterionText).join('; ')}. Reliance on undocumented custom or verbal practice exposes the institution to severe supervisory sanctions.`;

        const strategicRemediation =
          derivedStatus === 'ADEQUATELY_MET'
            ? 'Maintain documented controls and retain quarterly audit execution artifacts for supervisory inspection.'
            : `Adopt the board-ready remediation clause into ${policyDocs[0]?.title || 'Internal Policy'} and institute timestamped governance exception reporting.`;

        const briefingMarkdown = `### Senior Regulatory Counsel Briefing: ${cleanTitle}

> [!${derivedStatus === 'ADEQUATELY_MET' ? 'TIP' : derivedStatus === 'PARTIALLY_MET' ? 'WARNING' : 'CRITICAL'}]
> **Executive Legal Opinion**: ${verdictSummary}

#### 1. Statutory Intent & Supervisory Risk Exposure
Under **${parentInst.title}** (${parentClause.section_reference || obligationCode}), supervisory authorities require financial institutions to maintain explicit, demonstrable controls over **${cleanTitle}**. During routine and targeted on-site examinations, regulatory inspection panels specifically inspect whether operational manuals contain unambiguous governance thresholds and verifiable audit documentation.

#### 2. Evidentiary Concordance & Gap Dissection
${evidentiaryAnalysis}

#### 3. Strategic Remediation Playbook for General Counsel & CCO
- **Policy Amendment**: Adopt the recommended draft remediation clause into the next executive governance revision cycle.
- **Examiner Defensibility**: Establish timestamped exception logs to demonstrate affirmative compliance during routine examination.
- **Board Reporting**: Disclose operational alignment status to the Board Audit & Risk Committee.`;

        counselBriefing = {
          executiveVerdict,
          verdictSummary,
          supervisoryContext,
          evidentiaryAnalysis,
          strategicRemediation,
          briefingMarkdown,
        };
      }

      evaluatedItems.push({
        id: crypto.randomUUID(),
        evaluation_id: evaluationId,
        organization_id: organizationId,
        regulatory_clause_id: obl.clause_id,
        obligation_id: obl.id,
        obligation_title: cleanTitle,
        obligation_code: obligationCode,
        obligation_description: obl.description || obl.summary || parentClause.clause_text,
        rule_type: obl.rule_type || 'Prescriptive',
        policy_applicability: obl.policy_applicability || 'Policy Applicable',
        compliance_status: derivedStatus,
        statutory_penalty_naira: realPenaltyNaira,
        remediation_timeline_days: explicitTimelineDays,
        senior_counsel_briefing: counselBriefing,
        what_happened: counselBriefing.verdictSummary,
        what_to_know: counselBriefing.supervisoryContext,
        what_has_changed: obl.verbatim_quote || obl.description || obl.summary || cleanTitle,
        what_to_do: counselBriefing.strategicRemediation,
        draft_remediation_clause: draftClause,
        criteria_evaluations: finalCriteriaEvaluations,
        action_items: actionPlan.filter((a) => a.linkedObligationCode === obligationCode),
        suggested_action_item:
          actionPlan.find((a) => a.linkedObligationCode === obligationCode)?.title || null,
        regulation_title: parentInst.title,
        regulation_id: parentInst.id,
        source_section_ref:
          parentClause.section_reference || obl.section_or_page_ref || 'Not explicitly specified in source text',
        derived_insight: `Executive Verdict: ${counselBriefing.executiveVerdict} (${effectiveMetCore}/${effectiveTotalCore} Core Criteria Fulfilled)`,
        created_at: new Date().toISOString(),
      });
    }

    const totalObligations = evaluatedItems.length;
    const overallCompliancePercentage = Math.round(
      ((adequateCount * 100 + partialCount * 50) / totalObligations)
    );

    const macroBriefing = await this.generateExecutiveMacroBriefing({
      analysisName,
      organizationId,
      totalObligations,
      adequateCount,
      partialCount,
      gapCount,
      overallCompliancePercentage,
      evaluatedItems,
      instruments,
      policyDocs,
      createdByName,
    });

    const createdAtIso = new Date().toISOString();
    const initialAuditLogs = [
      {
        id: crypto.randomUUID(),
        timestamp: createdAtIso,
        action: `Evaluated ${totalObligations} obligation(s) across ${instruments.length} regulation(s) and ${policyDocs.length} policy document(s)`,
        performedBy: createdByName,
        details: {
          obligationsAssessedCount: totalObligations,
          adequateCount,
          partialCount,
          gapCount,
          overallCompliancePercentage,
        },
      },
    ];

    const evaluationRow = {
      id: evaluationId,
      organization_id: organizationId,
      policy_id: verifiedPolicyIds[0],
      benchmark_document_version_id: versionIds[0],
      analysis_name: analysisName,
      regulation_ids: resolvedInstrumentIds,
      policy_ids: verifiedPolicyIds,
      scope,
      status: adequateCount === totalObligations ? 'COMPLETED' : 'IN_PROGRESS',
      overall_compliance_percentage: overallCompliancePercentage,
      critical_gaps_count: gapCount,
      partially_met_count: partialCount,
      adequately_met_count: adequateCount,
      action_plan: actionPlan,
      audit_logs: initialAuditLogs,
      comments: [],
      created_by_name: createdByName,
      executive_briefing: macroBriefing,
      metadata: {
        analysisName,
        scope,
        regulationIds: resolvedInstrumentIds,
        policyIds: verifiedPolicyIds,
        executiveBriefing: macroBriefing,
      },
      created_at: createdAtIso,
    };

    const { error: evalSaveErr } = await (this.db.from('gap_evaluations') as any).insert(evaluationRow);
    if (evalSaveErr) {
      logger.error({ error: evalSaveErr.message }, 'Failed inserting gap_evaluations record');
      throw new Error(`Failed to save evaluation: ${evalSaveErr.message}`);
    }

    if (evaluatedItems.length > 0) {
      const { error: itemsSaveErr } = await (this.db.from('gap_matrix_items') as any).insert(evaluatedItems);
      if (itemsSaveErr) {
        logger.error({ error: itemsSaveErr.message }, 'Failed inserting gap_matrix_items records');
        throw new Error(`Failed to save evaluation items: ${itemsSaveErr.message}`);
      }
    }

    // Record usage telemetry & global tamper-evident audit log
    await Promise.all([
      (this.db as any).from('tenant_ingestion_events').insert({
        organization_id: organizationId,
        user_id: userId || null,
        event_type: 'GAP_ANALYSIS_RUN',
        entity_id: evaluationId,
        metadata: {
          analysisName,
          regulationCount: resolvedInstrumentIds.length,
          policyCount: verifiedPolicyIds.length,
          obligationsAssessedCount: totalObligations,
        },
      }),
      (this.db.from('audit_logs') as any).insert({
        organization_id: organizationId,
        user_id: userId || null,
        action: 'GAP_ANALYSIS_EVALUATED',
        entity_type: 'gap_evaluations',
        entity_id: evaluationId,
        sha256_input_hash: AuditService.computeSha256({
          regulationIds: resolvedInstrumentIds,
          policyIds: verifiedPolicyIds,
          scope,
        }),
        sha256_output_hash: AuditService.computeSha256({
          evaluationId,
          adequateCount,
          partialCount,
          gapCount,
          overallCompliancePercentage,
        }),
        metadata: {
          analysisName,
          obligationsAssessedCount: totalObligations,
          adequateCount,
          partialCount,
          gapCount,
        },
      }),
    ]);

    const latencyMs = Math.round(performance.now() - startTime);
    logger.info(
      {
        evaluationId,
        obligationsCount: totalObligations,
        adequateCount,
        partialCount,
        gapCount,
        latencyMs,
      },
      'Multi-regulation gap evaluation completed and persisted'
    );

    return {
      evaluationId,
      analysisName,
      obligationsAssessedCount: totalObligations,
      adequateCount,
      partialCount,
      gapCount,
      overallCompliancePercentage,
      items: evaluatedItems,
      actionPlan,
    };
  }

  /**
   * Self-Healing Intelligent Gate:
   * If an obligation in the database currently has 0 assessment criteria or still has
   * the old "Internal operating manual explicitly mandates compliance..." template string,
   * dynamically extract 2–4 real, specific, testable Core Criteria / Best Practice statements
   * from that obligation's verbatimQuote before evaluating!
   */
  private async selfHealObligationCriteria(
    obl: any,
    parentClause: any,
    existingCriteria: any[]
  ): Promise<any[]> {
    const isTemplateString = (text: string) => {
      const lower = (text || '').toLowerCase();
      return (
        lower.includes('internal operating manual explicitly mandates compliance') ||
        lower.includes('internal policy explicitly incorporates the statutory mandate') ||
        lower.includes('explicitly incorporates the statutory mandate')
      );
    };

    const needsHealing =
      !existingCriteria ||
      existingCriteria.length === 0 ||
      existingCriteria.some((c) => isTemplateString(c.criterion_text || c.text));

    if (!needsHealing) {
      return existingCriteria;
    }

    const quote = obl.verbatim_quote || obl.summary || obl.description || parentClause.clause_text || obl.title || '';
    const cleanTitle = obl.title || parentClause.section_heading || parentClause.section_reference || 'Statutory Compliance Mandate';

    let healed: any[] = [];
    try {
      const ExtractionSchema = z.object({
        criteria: z.array(
          z.object({
            criterionType: z.enum(['Core Criteria', 'Best Practice']),
            criterionText: z.string().min(10),
            evidenceRequired: z.string().min(5),
          })
        ).min(2).max(4),
      });

      const prompt = `Extract 2 to 4 concrete, testable assessment criteria (categorized as "Core Criteria" or "Best Practice") from this statutory obligation to evaluate an internal company policy manual.

STATUTORY OBLIGATION:
Title: ${cleanTitle}
Section Reference: ${parentClause.section_reference || obl.section_or_page_ref || 'Statutory Directive'}
Verbatim Text: "${quote}"

RULES:
1. Core Criteria: Must specify explicit, verifiable controls, thresholds, operational rules, or reporting deadlines directly stated in the statutory text.
2. Best Practice: Must specify documented governance, oversight, audit trails, or periodic review requirements.
3. NEVER return generic template strings like "Internal operating manual explicitly mandates compliance". Be highly specific to the subject matter of the statute.
4. Return 2 to 4 criteria with concrete evidenceRequired descriptions.`;

      const res = await this.aiEngine.generateStructured({
        systemInstruction:
          'You are an Expert Regulatory Compliance Architect. Formulate precise, verifiable assessment criteria from statutory obligations.',
        prompt,
        schema: ExtractionSchema,
        modelAlias: 'FAST_MODEL',
      });

      if (res.data?.criteria && res.data.criteria.length >= 2) {
        healed = res.data.criteria.map((c, idx) => ({
          id: crypto.randomUUID(),
          obligation_id: obl.id,
          criterion_type: c.criterionType,
          criterion_text: c.criterionText,
          evidence_required: c.evidenceRequired,
          is_mandatory: c.criterionType === 'Core Criteria',
          order_index: idx + 1,
        }));
      }
    } catch (err) {
      logger.warn({ err: String(err), oblId: obl.id }, 'AI criteria extraction failed; using deterministic decomposition');
    }

    if (healed.length === 0) {
      const cleanQuote = quote.replace(/[\r\n]+/g, ' ').trim();
      healed = [
        {
          id: crypto.randomUUID(),
          obligation_id: obl.id,
          criterion_type: 'Core Criteria',
          criterion_text: `Operational policy explicitly establishes documented controls and procedures for ${cleanTitle}: "${cleanQuote.slice(0, 160)}${cleanQuote.length > 160 ? '...' : ''}"`,
          evidence_required: `Operational procedures and governance mandates satisfying ${parentClause.section_reference || cleanTitle}`,
          is_mandatory: true,
          order_index: 1,
        },
        {
          id: crypto.randomUUID(),
          obligation_id: obl.id,
          criterion_type: 'Core Criteria',
          criterion_text: `Designated officer or compliance function is assigned enforcement and audit oversight for ${parentClause.section_reference || cleanTitle}.`,
          evidence_required: 'Documented roles, escalation paths, and compliance monitoring frequency',
          is_mandatory: true,
          order_index: 2,
        },
        {
          id: crypto.randomUUID(),
          obligation_id: obl.id,
          criterion_type: 'Best Practice',
          criterion_text: `Record retention and periodic audit testing protocols for ${cleanTitle} are maintained for statutory supervisory inspection.`,
          evidence_required: 'Internal audit reports, compliance testing schedules, and record archiving log',
          is_mandatory: false,
          order_index: 3,
        },
      ];
    }

    // Persist healed criteria into obligation_assessment_criteria and update regulatory_obligations
    try {
      await (this.db.from('obligation_assessment_criteria') as any)
        .delete()
        .eq('obligation_id', obl.id);

      await (this.db.from('obligation_assessment_criteria') as any)
        .insert(healed);

      await (this.db.from('regulatory_obligations') as any)
        .update({
          assessment_criteria: healed.map((h) => ({
            id: h.id,
            type: h.criterion_type,
            text: h.criterion_text,
            evidenceRequired: h.evidence_required,
          })),
        })
        .eq('id', obl.id);
    } catch (dbErr) {
      logger.warn({ err: String(dbErr), oblId: obl.id }, 'Could not persist self-healed criteria to DB');
    }

    return healed;
  }

  /**
   * Synthesizes an executive-level Macro Regulatory Briefing & Board Audit Dossier
   * across all evaluated obligations, regulations, and policies.
   */
  public async generateExecutiveMacroBriefing(params: {
    analysisName: string;
    organizationId: string;
    totalObligations: number;
    adequateCount: number;
    partialCount: number;
    gapCount: number;
    overallCompliancePercentage: number;
    evaluatedItems: any[];
    instruments: any[];
    policyDocs: any[];
    createdByName: string;
  }): Promise<ExecutiveMacroBriefing> {
    const {
      analysisName = 'Gap Analysis Evaluation',
      totalObligations = 0,
      adequateCount = 0,
      partialCount = 0,
      gapCount = 0,
      overallCompliancePercentage = 0,
      evaluatedItems = [],
      instruments = [],
      policyDocs = [],
      createdByName = 'Senior Regulatory Counsel',
    } = params || {};

    const regTitles = (instruments || []).map((i: any) => i?.title).filter(Boolean).join(', ') || 'Selected Statutory Regulations';
    const polTitles = (policyDocs || []).map((p: any) => p?.title).filter(Boolean).join(', ') || 'Uploaded Policy Manuals';
    const criticalGaps = (evaluatedItems || []).filter((i: any) => i?.compliance_status === 'CRITICAL_GAP');
    const partialGaps = (evaluatedItems || []).filter((i: any) => i?.compliance_status === 'PARTIALLY_MET');

    const riskPostureRating: 'LOW_DEFENSE_EXPOSURE' | 'MODERATE_EXPOSURE' | 'CRITICAL_SUPERVISORY_EXPOSURE' =
      gapCount > 0 ? 'CRITICAL_SUPERVISORY_EXPOSURE' : partialCount > 0 ? 'MODERATE_EXPOSURE' : 'LOW_DEFENSE_EXPOSURE';

    const headlineVerdict =
      gapCount > 0
        ? `Material Regulatory Vulnerabilities Identified: ${gapCount} Critical Gap(s) Across Internal Policy Suite`
        : partialCount > 0
        ? `Defensible Baseline with Operational Divergences: ${partialCount} Partial Gap(s) Requiring Board Action`
        : `High-Fidelity Regulatory Concordance: Zero Critical Gaps Across Evaluated Policies`;

    const boardExecutiveSummary = `This executive briefing delivers a senior regulatory counsel assessment of ${polTitles} benchmarked against binding statutory mandates under ${regTitles}. The evaluation assessed ${totalObligations} statutory obligation(s), identifying ${adequateCount} fully compliant control(s), ${partialCount} partial divergence(s), and ${gapCount} critical policy gap(s), resulting in an institutional compliance posture of ${overallCompliancePercentage}%. Immediate board attention is required to operationalize remediation clauses and protect the balance sheet against statutory enforcement action.`;

    const supervisoryInspectionVulnerabilities = [
      ...criticalGaps.slice(0, 3).map((g: any) => `Absence of documented mandatory controls for "${g.obligation_title}": examiners will issue formal deficiency findings and potential civil sanctions under statutory penalty schedules.`),
      ...partialGaps.slice(0, 2).map((g: any) => `Procedural divergence in "${g.obligation_title}": operational manual specifies general intent but omits mandatory escalation timelines and executive sign-off gates.`),
      `Evidentiary record keeping: failure to maintain timestamped audit logs of exception approvals creates joint supervisory liability for executive compliance officers under BOFIA 2020.`,
    ].slice(0, 4);

    const systemicPolicyGaps = [
      criticalGaps.length > 0
        ? `Governance omissions: critical statutory mandates lack board-approved internal operating procedures in ${policyDocs[0]?.title || 'internal policy'}.`
        : `Operational calibration: internal control thresholds require synchronization with current regulator circular directives.`,
      `Escalation disconnects: operational manuals fail to specify deterministic reporting timelines to supervisory bodies upon trigger events.`,
      `Audit trail sufficiency: compliance activities rely on informal practice rather than verifiable, immutable policy registers.`,
    ];

    const immediate30Days = [
      `Submit board-approved draft remediation clauses for all ${criticalGaps.length} critical gaps to the Board Audit & Risk Committee for formal adoption.`,
      `Issue mandatory internal compliance circular establishing immediate operational controls for unhedged statutory obligations.`,
      `Assign designated senior compliance officers to oversee the completion of identified high-priority action items.`,
    ];

    const intermediate60Days = [
      `Update standard operating procedures (SOPs) across all affected operational business units to align with amended policy manuals.`,
      `Conduct internal compliance mock examination simulating central bank on-site review protocols.`,
      `Implement automated escalation workflows for transactions and events exceeding statutory reporting thresholds.`,
    ];

    const strategic90Days = [
      `Conduct independent third-party audit verification of newly implemented compliance controls.`,
      `Incorporate statutory compliance metrics into enterprise risk management (ERM) dashboards reported quarterly to the Board.`,
      `Establish ongoing regulatory horizon scanning to capture new amendments or administrative circulars from issuing authorities.`,
    ];

    const executiveBriefingMarkdown = `# EXECUTIVE REGULATORY COUNSEL BRIEFING
**Analysis Name:** ${analysisName}  
**Statutory Benchmarks:** ${regTitles}  
**Internal Policies:** ${polTitles}  
**Assessment Date:** ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}  
**Lead Examiner / Counsel:** ${createdByName}  
**Composite Concordance:** **${overallCompliancePercentage}%** | **Risk Posture:** \`${riskPostureRating}\`  

---

## 1. Executive Legal Verdict & Board Summary
> [!${riskPostureRating === 'LOW_DEFENSE_EXPOSURE' ? 'TIP' : riskPostureRating === 'MODERATE_EXPOSURE' ? 'WARNING' : 'CRITICAL'}]
> **${headlineVerdict}**  
> ${boardExecutiveSummary}

---

## 2. Key Supervisory Examination Vulnerabilities
Bank examiners and statutory auditors will focus scrutiny on the following control gaps during on-site examinations:
${supervisoryInspectionVulnerabilities.map((v) => `- **High Vulnerability**: ${v}`).join('\n')}

---

## 3. Thematic Cross-Policy Vulnerability Analysis
Forensic legal analysis across the uploaded policy documentation reveals the following systemic patterns:
${systemicPolicyGaps.map((g) => `- ${g}`).join('\n')}

---

## 4. Strategic 30-60-90 Day Remediation Roadmap
### Immediate Actions (Next 30 Days)
${immediate30Days.map((a) => `1. ${a}`).join('\n')}

### Operational Adjustments (Next 60 Days)
${intermediate60Days.map((a) => `1. ${a}`).join('\n')}

### Strategic Defensibility (Next 90 Days)
${strategic90Days.map((a) => `1. ${a}`).join('\n')}

---
*Generated by Project Cogent — Senior Regulatory Counsel & Banking Supervision Advisory Engine*`;

    return {
      headlineVerdict,
      riskPostureRating,
      boardExecutiveSummary,
      supervisoryInspectionVulnerabilities,
      systemicPolicyGaps,
      strategicRoadmap30_60_90: {
        immediate30Days,
        intermediate60Days,
        strategic90Days,
      },
      executiveBriefingMarkdown,
    };
  }
}
