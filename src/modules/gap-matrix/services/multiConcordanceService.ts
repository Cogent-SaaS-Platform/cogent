import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { AiEngine } from '@/shared/ai-engine';
import { AuditService } from '@/modules/audit/auditService';
import { logger } from '@/shared/logger';
import { ComplianceStatus } from '@/shared/types';
import { z } from 'zod';

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
      criterionIndex: z.union([z.number(), z.string()]).transform((v) => Number(v) || 1).optional(),
      status: z.string().transform((s) => (s && s.toUpperCase().includes('MET') && !s.toUpperCase().includes('NOT') ? 'MET' : 'NOT_MET')),
      aiReason: z.string().min(1),
      matchedSectionIndices: z.array(z.union([z.number(), z.string()])).nullish().transform((arr) => (arr || []).map((x) => Number(x)).filter((n) => !isNaN(n))),
      suggestedActionItem: z.string().nullish().transform((s) => s || undefined),
    })
  ),
  draftRemediationClause: z.string().nullish().transform((s) => s || undefined),
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
    const { data: policyClauses } = await (this.db.from('policy_clauses') as any)
      .select('id, policy_id, section_number, clause_text')
      .eq('organization_id', organizationId)
      .in('policy_id', verifiedPolicyIds);

    // Build structured policy sections list
    const parsedPolicySections: Array<{
      policyId: string;
      policyTitle: string;
      sectionNumber: string;
      sectionTitle: string;
      content: string;
    }> = [];

    for (const doc of policyDocs) {
      const docClauses = (policyClauses || []).filter((pc: any) => pc.policy_id === doc.id);
      if (docClauses.length > 0) {
        for (const pc of docClauses) {
          parsedPolicySections.push({
            policyId: doc.id,
            policyTitle: doc.title,
            sectionNumber: pc.section_number || 'Section 1.0',
            sectionTitle: pc.section_number ? `${pc.section_number}` : 'Policy Section',
            content: pc.clause_text || '',
          });
        }
      } else if (doc.raw_text) {
        const paras = doc.raw_text.split(/\n\s*\n/).filter((p: string) => p.trim().length > 20);
        paras.forEach((p: string, idx: number) => {
          parsedPolicySections.push({
            policyId: doc.id,
            policyTitle: doc.title,
            sectionNumber: `Section ${idx + 1}.0`,
            sectionTitle: `Section ${idx + 1}.0`,
            content: p.trim(),
          });
        });
      }
    }

    if (parsedPolicySections.length === 0) {
      throw new Error('Selected policy document(s) contain no extractable text clauses for evaluation');
    }

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

      if (criteriaList.length === 0) {
        const cleanTitle = obl.title || parentClause.section_heading || parentClause.section_reference || 'Statutory Obligation';
        const cleanQuote = obl.verbatim_quote || obl.summary || parentClause.clause_text || '';
        criteriaList = [
          {
            id: `crit-${obl.id}-1`,
            criterion_type: 'Core Criteria',
            criterion_text: `Internal policy explicitly incorporates the statutory mandate (${cleanTitle}): "${cleanQuote.slice(0, 140)}"`,
            evidence_required: 'Approved internal policy clause matching the statutory mandate',
          },
        ];
      }

      const policySummaryForAi = parsedPolicySections
        .slice(0, 20)
        .map(
          (s, idx) =>
            `[SECTION ${idx + 1} - ${s.policyTitle} | ${s.sectionNumber}]:\n${s.content.slice(0, 500)}`
        )
        .join('\n\n');

      const criteriaPrompt = criteriaList
        .map(
          (c, idx) =>
            `Criterion ${idx + 1} (${c.criterion_type || c.type || 'Core Criteria'}): ${c.criterion_text || c.text}`
        )
        .join('\n');

      const evaluationPrompt = `Evaluate the uploaded internal company policies strictly against the statutory obligation and its assessment criteria below.

STATUTORY OBLIGATION:
- Regulation: ${parentInst.title} (${parentInst.regulatory_bodies?.code || 'CBN'})
- Section Reference: ${parentClause.section_reference || obl.section_or_page_ref || 'Not explicitly specified in source text'}
- Code: ${obl.code || `OBL-${oIdx + 1}`}
- Title: ${obl.title || parentClause.section_heading || parentClause.section_reference}
- Description: ${obl.description || obl.summary || parentClause.clause_text}
- Verbatim Statutory Text: "${obl.verbatim_quote || parentClause.clause_text}"

ASSESSMENT CRITERIA TO EVALUATE:
${criteriaPrompt}

UPLOADED INTERNAL POLICY SECTIONS:
${policySummaryForAi}

STRICT STATUTORY GROUNDING RULES:
1. Evaluate each criterion as "MET" ONLY if the uploaded internal policy sections explicitly establish the required control, threshold, or timeline. Otherwise mark "NOT_MET".
2. aiReason: Quote or reference the exact uploaded policy section number/text when "MET", or state specifically what statutory requirement, control, or timeline is absent or divergent in the uploaded policy when "NOT_MET". Never fabricate laws, section numbers, or penalty figures.
3. matchedSectionIndices: 1-based indices [1, 2, ...] from UPLOADED INTERNAL POLICY SECTIONS that substantiate the finding (empty array [] when no section matches).
4. draftRemediationClause: Provide concrete, copy-pasteable policy clause wording grounded strictly in the Verbatim Statutory Text above to remediate any gap.`;

      let aiEvaluation: z.infer<typeof CriterionAiEvaluationSchema>;
      try {
        const result = await this.aiEngine.generateStructured({
          systemInstruction:
            'You are a Principal Financial Compliance Auditor performing deterministic criterion-level concordance verification. Ground every finding strictly in the provided statutory verbatim text and uploaded internal policy sections. Never invent laws, fines, or policy provisions.',
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
            const secContent = sec.content.toLowerCase();
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
              criterionIndex: cIdx + 1,
              status: 'MET' as const,
              aiReason: `Internal policy section ${matchedSec.sectionNumber} (${matchedSec.policyTitle}) explicitly incorporates required controls: "${matchedSec.content.slice(0, 120)}..."`,
              matchedSectionIndices: [bestSectionIdx + 1],
              suggestedActionItem: undefined,
            };
          } else {
            return {
              criterionIndex: cIdx + 1,
              status: 'NOT_MET' as const,
              aiReason: `Internal policy manual omits mandatory controls specified in statutory criteria: "${crit.criterion_text || crit.text}". Remediation required.`,
              matchedSectionIndices: [],
              suggestedActionItem: `Adopt policy amendment to establish ${crit.criterion_text || crit.text}`,
            };
          }
        });

        aiEvaluation = {
          criterionEvaluations: deterministicCrits,
          draftRemediationClause: `Section 4.1: The institution shall strictly adhere to supervisory directives regarding: "${obl.verbatim_quote || obl.description || obl.title}".`,
        };
      }

      const finalCriteriaEvaluations: CriterionEvaluationResult[] = [];
      let metCoreCount = 0;
      let totalCoreCount = 0;

      criteriaList.forEach((crit, cIdx) => {
        const aiCrit =
          aiEvaluation.criterionEvaluations.find((a) => a.criterionIndex === cIdx + 1) ||
          aiEvaluation.criterionEvaluations[cIdx];

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

        if (aiCrit.matchedSectionIndices && aiCrit.matchedSectionIndices.length > 0) {
          aiCrit.matchedSectionIndices.forEach((sIdx) => {
            const sec = parsedPolicySections[sIdx - 1];
            if (sec) {
              matchedSections.push({
                policyId: sec.policyId,
                policyTitle: sec.policyTitle,
                sectionNumber: sec.sectionNumber,
                sectionTitle: sec.sectionTitle,
                verbatimPolicyExcerpt: sec.content.slice(0, 350),
              });
            }
          });
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

      const cleanTitle =
        obl.title || parentClause.section_heading || parentClause.section_reference || 'Statutory Obligation';
      const obligationCode =
        obl.code || `OBL-${parentInst.regulatory_bodies?.code || 'CBN'}-${String(oIdx + 1).padStart(3, '0')}`;
      const draftClause =
        aiEvaluation.draftRemediationClause ||
        `Pursuant to ${parentClause.section_reference || obligationCode} of ${parentInst.title}: ${obl.verbatim_quote || obl.summary || cleanTitle}`;

      const explicitTimelineDays =
        typeof obl.statutory_timeline_days === 'number' && obl.statutory_timeline_days > 0
          ? obl.statutory_timeline_days
          : null;

      if (derivedStatus !== 'ADEQUATELY_MET') {
        const firstUnmetSuggestion = aiEvaluation.criterionEvaluations.find(
          (ce) => ce.status === 'NOT_MET' && ce.suggestedActionItem
        )?.suggestedActionItem;

        actionPlan.push({
          id: crypto.randomUUID(),
          title: firstUnmetSuggestion || `Remediate policy manual to satisfy ${obligationCode} (${cleanTitle})`,
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
        what_happened:
          derivedStatus === 'ADEQUATELY_MET'
            ? `Uploaded policy satisfies ${effectiveMetCore}/${effectiveTotalCore} core criteria for ${cleanTitle}.`
            : `Policy concordance evaluation fulfilled ${effectiveMetCore}/${effectiveTotalCore} core criteria for ${cleanTitle} under ${parentInst.title}.`,
        what_to_know:
          obl.risk_description ||
          `Binding requirement under ${parentInst.title} (${parentClause.section_reference || obligationCode}).`,
        what_has_changed: obl.verbatim_quote || obl.description || obl.summary || cleanTitle,
        what_to_do:
          finalCriteriaEvaluations
            .filter((c) => c.status === 'NOT_MET')
            .map((c) => c.aiReason)
            .join(' ') || 'Maintain documented controls and audit evidence.',
        draft_remediation_clause: draftClause,
        criteria_evaluations: finalCriteriaEvaluations,
        action_items: actionPlan.filter((a) => a.linkedObligationCode === obligationCode),
        suggested_action_item:
          actionPlan.find((a) => a.linkedObligationCode === obligationCode)?.title || null,
        regulation_title: parentInst.title,
        regulation_id: parentInst.id,
        source_section_ref:
          parentClause.section_reference || obl.section_or_page_ref || 'Not explicitly specified in source text',
        derived_insight: `Evaluated ${finalCriteriaEvaluations.length} criteria across ${policyDocs.length} uploaded policy document(s).`,
        created_at: new Date().toISOString(),
      });
    }

    const totalObligations = evaluatedItems.length;
    const overallCompliancePercentage = Math.round(
      ((adequateCount * 100 + partialCount * 50) / totalObligations)
    );

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
      metadata: {
        analysisName,
        scope,
        regulationIds: resolvedInstrumentIds,
        policyIds: verifiedPolicyIds,
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
}
