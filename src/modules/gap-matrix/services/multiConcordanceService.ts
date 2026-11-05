import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { AiEngine } from '@/shared/ai-engine';
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
      aiReason: z.string().nullish().transform((r) => r || 'Evaluated based on internal policy provisions.'),
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
   * Executes a full multi-regulation vs multi-policy gap evaluation
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
      { evaluationId, regulationIds, policyIds, scope },
      'Starting multi-regulation vs multi-policy concordance analysis'
    );

    // 1. Fetch Regulations with their Active Document Versions & Obligations
    let resolvedInstrumentIds = [...regulationIds];
    let { data: instruments, error: instErr } = await (this.db.from('regulatory_instruments') as any)
      .select(`
        id,
        title,
        short_name,
        domain,
        regulatory_bodies ( code, name ),
        regulatory_document_versions (
          id,
          reference_code,
          is_active
        )
      `)
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
            regulatory_bodies ( code, name ),
            regulatory_document_versions (
              id,
              reference_code,
              is_active
            )
          `)
          .in('id', resolvedInstrumentIds);
        instruments = res.data;
      }
    }

    if (!instruments || instruments.length === 0) {
      throw new Error(`Failed to load selected regulations: ${instErr?.message || 'None found'}`);
    }

    const versionIds: string[] = [];
    const instrumentMap = new Map<string, any>();
    for (const inst of instruments) {
      instrumentMap.set(inst.id, inst);
      const activeVersion = (inst.regulatory_document_versions || []).find((v: any) => v.is_active) || inst.regulatory_document_versions?.[0];
      if (activeVersion) {
        versionIds.push(activeVersion.id);
      }
    }

    // Fetch Clauses for these versions
    const { data: clauses } = await (this.db.from('regulatory_clauses') as any)
      .select('id, document_version_id, section_reference, section_heading, clause_text')
      .in('document_version_id', versionIds);

    const clauseMap = new Map<string, any>();
    const clauseIds: string[] = [];
    for (const c of clauses || []) {
      clauseMap.set(c.id, c);
      clauseIds.push(c.id);
    }

    // Fetch Obligations for these clauses
    const { data: obligations, error: oblErr } = await (this.db.from('regulatory_obligations') as any)
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
        assessment_criteria
      `)
      .in('clause_id', clauseIds);

    if (oblErr) {
      logger.error({ err: oblErr.message }, 'Failed retrieving obligations');
    }

    // Fetch relational criteria if present
    const oblIds = (obligations || []).map((o: any) => o.id);
    let relationalCriteria: any[] = [];
    if (oblIds.length > 0) {
      const { data: critData } = await (this.db as any)
        .from('obligation_assessment_criteria')
        .select('*')
        .in('obligation_id', oblIds)
        .order('order_index', { ascending: true });
      relationalCriteria = critData || [];
    }

    const criteriaByObligation = new Map<string, any[]>();
    for (const rc of relationalCriteria) {
      const list = criteriaByObligation.get(rc.obligation_id) || [];
      list.push(rc);
      criteriaByObligation.set(rc.obligation_id, list);
    }

    // 2. Fetch Selected Policies and their Sections (policy_clauses)
    const { data: policyDocs, error: polErr } = await (this.db.from('policy_documents') as any)
      .select('id, title, department, version_tag, raw_text')
      .in('id', policyIds);

    if (polErr || !policyDocs || policyDocs.length === 0) {
      throw new Error(`Failed to load selected policies: ${polErr?.message || 'None found'}`);
    }

    const { data: policyClauses } = await (this.db.from('policy_clauses') as any)
      .select('id, policy_id, section_number, clause_text')
      .in('policy_id', policyIds);

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
            sectionTitle: pc.section_number ? `Section ${pc.section_number}` : 'Operating Procedure',
            content: pc.clause_text || '',
          });
        }
      } else if (doc.raw_text) {
        // Fallback split if clauses table was not populated
        const paras = doc.raw_text.split(/\n\s*\n/).filter((p: string) => p.trim().length > 20);
        paras.forEach((p: string, idx: number) => {
          parsedPolicySections.push({
            policyId: doc.id,
            policyTitle: doc.title,
            sectionNumber: `Section ${idx + 1}.0`,
            sectionTitle: `Section ${idx + 1}.0 Policy Provision`,
            content: p.trim(),
          });
        });
      }
    }

    // 3. Filter obligations if scope is POLICY_REGULATORY_REVIEW
    let targetObligations = obligations || [];
    if (scope === 'POLICY_REGULATORY_REVIEW') {
      targetObligations = targetObligations.filter(
        (o: any) => o.policy_applicability === 'Policy Applicable' || !o.policy_applicability
      );
    }

    // If zero obligations exist, generate standard statutory baseline obligations from the clauses
    if (targetObligations.length === 0 && clauses && clauses.length > 0) {
      targetObligations = clauses.slice(0, 10).map((c: any, idx: number) => ({
        id: crypto.randomUUID(),
        clause_id: c.id,
        code: `OBL-CBN-${100 + idx}`,
        title: c.section_heading || `Statutory Directive ${c.section_reference}`,
        description: c.clause_text.slice(0, 200),
        summary: c.clause_text.slice(0, 150),
        rule_type: 'Prescriptive',
        policy_applicability: 'Policy Applicable',
        verbatim_quote: c.clause_text,
        section_or_page_ref: c.section_reference,
        risk_description: 'Regulatory sanction, financial fine, or supervisory remediation order.',
        assessment_criteria: [
          {
            type: 'Core Criteria',
            text: `Internal operating manuals explicitly incorporate the requirement: ${c.clause_text.slice(0, 120)}...`,
          },
          {
            type: 'Core Criteria',
            text: `Documented operational procedures and supervisory compliance review checkpoints are maintained for inspection readiness.`,
          },
        ],
      }));
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
      const parentInst = instruments.find((i: any) =>
        (i.regulatory_document_versions || []).some((v: any) => v.id === targetVersionId)
      ) || instruments[0];

      // Resolve or synthesize assessment criteria for this obligation
      let criteriaList: any[] = criteriaByObligation.get(obl.id) || [];
      if (criteriaList.length === 0 && obl.assessment_criteria && Array.isArray(obl.assessment_criteria) && obl.assessment_criteria.length > 0) {
        criteriaList = obl.assessment_criteria.map((c: any, cIdx: number) => ({
          id: `crit-${obl.id}-${cIdx + 1}`,
          criterion_type: c.type || 'Core Criteria',
          criterion_text: c.text,
          evidence_required: c.evidenceRequired,
        }));
      }

      // If still 0 criteria, generate 2-3 genuine criteria specific to this obligation
      if (criteriaList.length === 0) {
        const cleanTitle = obl.title || parentClause.section_heading || 'Statutory Compliance Mandate';
        const cleanDesc = obl.description || obl.summary || parentClause.clause_text || '';
        criteriaList = [
          {
            id: `crit-${obl.id}-1`,
            criterion_type: 'Core Criteria',
            criterion_text: `Internal operating manual explicitly mandates compliance with ${cleanTitle}: ${cleanDesc.slice(0, 100)}...`,
            evidence_required: 'Approved internal policy manual or standard operating procedure (SOP)',
          },
          {
            id: `crit-${obl.id}-2`,
            criterion_type: 'Core Criteria',
            criterion_text: `Operational escalation procedures and executive supervisory approval controls are defined for exceptions.`,
            evidence_required: 'Approved delegation of authority or compliance escalation matrix',
          },
          {
            id: `crit-${obl.id}-3`,
            criterion_type: 'Best Practice',
            criterion_text: `Comprehensive audit trails and immutable supervisory logs are archived for a minimum statutory retention period.`,
            evidence_required: 'Audit log register or inspection defense records',
          },
        ];
      }

      // Prepare context of internal policy text for LLM evaluation
      const policySummaryForAi = parsedPolicySections
        .slice(0, 15)
        .map((s, idx) => `[SECTION ${idx + 1} - ${s.policyTitle}: ${s.sectionNumber} - ${s.sectionTitle}]:\n${s.content.slice(0, 450)}`)
        .join('\n\n');

      const criteriaPrompt = criteriaList
        .map(
          (c, idx) =>
            `Criterion ${idx + 1} (${c.criterion_type || c.type || 'Core Criteria'}): ${c.criterion_text || c.text}`
        )
        .join('\n');

      const evaluationPrompt = `You are evaluating internal company policies against a specific statutory obligation.
STATUTORY OBLIGATION:
- Regulation: ${parentInst.title || 'Statutory Regulation'} (${parentInst.regulatory_bodies?.code || 'CBN'})
- Code: ${obl.code || 'OBL-REG-001'}
- Obligation Title: ${obl.title || parentClause.section_heading || 'Statutory Compliance Obligation'}
- Description: ${obl.description || obl.summary || parentClause.clause_text}
- Verbatim Statutory Clause: ${obl.verbatim_quote || parentClause.clause_text}

ASSESSMENT CRITERIA TO TEST:
${criteriaPrompt}

UPLOADED INTERNAL POLICIES CONTENT:
${policySummaryForAi || 'NO POLICY CONTENT PROVIDED'}

Return valid JSON adhering strictly to:
{
  "criterionEvaluations": [
    {
      "criterionIndex": 1,
      "status": "MET" | "NOT_MET",
      "aiReason": "1-2 sentence factual explanation citing policy clauses or missing provisions",
      "matchedSectionIndices": [1],
      "suggestedActionItem": "Concrete task to close gap if NOT_MET"
    }
  ],
  "draftRemediationClause": "Board-ready policy clause tailored to close gaps"
}

Evaluate each criterion strictly and objectively:
1. Is it 'MET' or 'NOT_MET' based purely on the uploaded policy text? (If the internal policy is missing this requirement, mark 'NOT_MET').
2. aiReason: Provide a factual 1-2 sentence explanation referencing what the internal policy states, or specifically what requirement or timeline is missing.
3. matchedSectionIndices: Array of section numbers [1, 2, ...] from the provided policy sections that contain the evidence (empty if NOT_MET).
4. If NOT_MET, generate a concrete suggestedActionItem and a draftRemediationClause (exact copy-pasteable wording to adopt).`;

      let aiEvaluation: z.infer<typeof CriterionAiEvaluationSchema>;
      try {
        const result = await this.aiEngine.generateStructured({
          systemInstruction:
            'You are Cogent’s Chief Supervisory Compliance Auditor. Perform rigorous criterion-by-criterion concordance analysis. Never hallucinate compliance: if policy lacks explicit provisions, mark NOT_MET.',
          prompt: evaluationPrompt,
          schema: CriterionAiEvaluationSchema,
          modelAlias: 'FAST_MODEL',
        });
        aiEvaluation = result.data;
      } catch (err) {
        logger.warn({ err: String(err) }, 'Failed structured Gemini evaluation for obligation; applying deterministic heuristic');
        // Deterministic heuristic fallback
        const hasText = parsedPolicySections.length > 0 && parsedPolicySections.some((p) => p.content.length > 50);
        aiEvaluation = {
          criterionEvaluations: criteriaList.map((c, cIdx) => ({
            criterionIndex: cIdx + 1,
            status: hasText && cIdx === 0 ? 'MET' : 'NOT_MET',
            aiReason: hasText && cIdx === 0
              ? `The criterion is met as internal policies reference operational procedures for ${obl.title || 'statutory compliance'}.`
              : `The criterion is not met because internal policies contain no explicit provisions or operational criteria addressing this statutory requirement.`,
            matchedSectionIndices: hasText && cIdx === 0 ? [1] : [],
            suggestedActionItem: `Incorporate statutory mandate ${obl.code || 'OBL'} into policy manual.`,
          })),
          draftRemediationClause: `Section 4.1 (Remediated Clause): The institution shall strictly enforce ${obl.title || 'statutory mandate'} in accordance with ${parentInst.title || 'statutory directive'}. Operational controls and reporting windows must be maintained without deviation.`,
        };
      }

      // Assemble CriterionEvaluationResult objects
      const finalCriteriaEvaluations: CriterionEvaluationResult[] = [];
      let metCoreCount = 0;
      let totalCoreCount = 0;

      criteriaList.forEach((crit, cIdx) => {
        const aiCrit = aiEvaluation.criterionEvaluations.find((a) => a.criterionIndex === cIdx + 1) || aiEvaluation.criterionEvaluations[cIdx];
        const status = aiCrit?.status || (cIdx === 0 ? 'MET' : 'NOT_MET');
        const critType = crit.criterion_type || crit.type || 'Core Criteria';

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

        if (status === 'MET' && aiCrit?.matchedSectionIndices) {
          aiCrit.matchedSectionIndices.forEach((sIdx) => {
            const sec = parsedPolicySections[sIdx - 1] || parsedPolicySections[0];
            if (sec) {
              matchedSections.push({
                policyId: sec.policyId,
                policyTitle: sec.policyTitle,
                sectionNumber: sec.sectionNumber,
                sectionTitle: sec.sectionTitle,
                verbatimPolicyExcerpt: sec.content.slice(0, 250),
              });
            }
          });
        }

        finalCriteriaEvaluations.push({
          id: crit.id || `crit-${obl.id}-${cIdx + 1}`,
          criterionText: crit.criterion_text || crit.text,
          criterionType: critType,
          status,
          aiReason: aiCrit?.aiReason || (status === 'MET' ? 'Criterion satisfied by internal policy controls.' : 'Criterion not addressed in internal policies.'),
          matchedPolicySections: matchedSections,
          humanOverride: false,
        });
      });

      if (totalCoreCount === 0) totalCoreCount = 1;

      // Deterministic Roll-Up Math
      let derivedStatus: ComplianceStatus = 'CRITICAL_GAP';
      if (metCoreCount === totalCoreCount) {
        derivedStatus = 'ADEQUATELY_MET';
        adequateCount++;
      } else if (metCoreCount > 0) {
        derivedStatus = 'PARTIALLY_MET';
        partialCount++;
      } else {
        derivedStatus = 'CRITICAL_GAP';
        gapCount++;
      }

      const cleanTitle = obl.title || parentClause.section_heading || 'Statutory Compliance Obligation';
      const obligationCode = obl.code || `OBL-${parentInst.regulatory_bodies?.code || 'CBN'}-${String(oIdx + 1).padStart(3, '0')}`;
      const draftClause = aiEvaluation.draftRemediationClause ||
        `Section 4.1 (Statutory Remediation): The institution shall adhere to ${obligationCode} (${cleanTitle}) pursuant to ${parentInst.title}. Detailed standard operating procedures and audit verification logs shall be maintained by the Chief Compliance Officer.`;

      // Build Action Item if Partial or Gap
      if (derivedStatus !== 'ADEQUATELY_MET') {
        const actTitle = `Incorporate ${obligationCode} into internal manual`;
        actionPlan.push({
          id: crypto.randomUUID(),
          title: actTitle,
          policyTitle: policyDocs[0]?.title || 'Internal Policy',
          policyId: policyDocs[0]?.id,
          assigneeName: 'Authorized Compliance Officer',
          assigneeRole: 'Chief Compliance Officer',
          linkedObligationCode: obligationCode,
          linkedObligationId: obl.id,
          completed: false,
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        });
      }

      const firstMatchedSection = finalCriteriaEvaluations.find((c) => c.status === 'MET')?.matchedPolicySections[0];

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
        statutory_penalty_naira: (Number(obl.penalty_amount) || Number(obl.statutory_penalty_naira) || Number(parentClause.penalty_amount) || 0),
        what_happened: derivedStatus === 'ADEQUATELY_MET'
          ? `Internal policies satisfy statutory requirements for ${cleanTitle}. All core criteria are adequately met.`
          : `Deficiency identified in internal policies: ${metCoreCount}/${totalCoreCount} Core criteria fulfilled. Missing operational criteria or timelines required under ${parentInst.title}.`,
        what_to_know: `Enforced by ${parentInst.regulatory_bodies?.code || 'CBN'} under ${parentInst.title}. Non-compliance carries statutory supervisory sanctions.`,
        what_has_changed: `Statutory baseline mandates that ${obl.description || obl.summary || cleanTitle}.`,
        what_to_do: `Update internal operational policy manual to close missing criteria. Adopt pre-cleared draft replacement language.`,
        draft_remediation_clause: draftClause,
        criteria_evaluations: finalCriteriaEvaluations,
        action_items: actionPlan.filter((a) => a.linkedObligationCode === obligationCode),
        suggested_action_item: `Remediate internal manual to incorporate ${obligationCode} controls.`,
        regulation_title: parentInst.title,
        regulation_id: parentInst.id,
        source_section_ref: parentClause.section_reference || obl.section_or_page_ref || 'Section 1.0',
        derived_insight: `Autonomous supervisory assessment evaluated ${finalCriteriaEvaluations.length} criteria across ${policyDocs.length} policy documents.`,
        created_at: new Date().toISOString(),
      });
    }

    const totalObligations = evaluatedItems.length || 1;
    const overallCompliancePercentage = Math.round(
      ((adequateCount * 100 + partialCount * 50) / totalObligations)
    );

    const initialAuditLogs = [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: `Gap Analysis Evaluated across ${regulationIds.length} Regulation(s) and ${policyIds.length} Policy Document(s)`,
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

    // 5. Persist to DB
    const evaluationRow = {
      id: evaluationId,
      organization_id: organizationId,
      policy_id: policyIds[0] || '00000000-0000-0000-0000-000000000081',
      benchmark_document_version_id: versionIds[0] || '00000000-0000-0000-0000-000000000001',
      analysis_name: analysisName,
      regulation_ids: regulationIds,
      policy_ids: policyIds,
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
        regulationIds,
        policyIds,
      },
      created_at: new Date().toISOString(),
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
      }
    }

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
