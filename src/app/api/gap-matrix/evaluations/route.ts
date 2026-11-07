import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { MultiConcordanceService } from '@/modules/gap-matrix/services/multiConcordanceService';
import { AuditService } from '@/modules/audit/auditService';
import { logger } from '@/shared/logger';
import { ComplianceStatus, RegulatorCode } from '@/shared/types';
import { verifyEntitlement } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export interface GapAnalysisSummaryItem {
  id: string;
  analysisName: string;
  regulationTitle: string;
  regulationShortName: string;
  regulatorCode: RegulatorCode;
  benchmarkDocumentVersionId: string;
  policyId: string;
  policyTitle: string;
  department: string;
  versionTag: string;
  regulationIds: string[];
  policyIds: string[];
  scope: 'COMPLETE_REGULATORY_REVIEW' | 'POLICY_REGULATORY_REVIEW';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REVIEW_PENDING';
  overallCompliancePercentage: number;
  obligationsAssessedCount: number;
  reviewPendingCount: number;
  closedCount: number;
  adequateCount: number;
  partialCount: number;
  gapCount: number;
  totalPenaltyNaira: number;
  actionPlan: any[];
  auditLogs: any[];
  comments: any[];
  executiveBriefing?: any;
  createdByName: string;
  createdAt: string;
  lastModifiedAt: string;
}

/**
 * GET /api/gap-matrix/evaluations
 * Returns live tenant-scoped evaluations from Supabase (zero fake seeds or invented penalties).
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;
    const { searchParams } = new URL(req.url);
    const evaluationId = searchParams.get('id');

    if (!dbClient) {
      return NextResponse.json(
        { success: false, error: 'Database client unavailable' },
        { status: 500 }
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Single Evaluation Detail by ID (strictly tenant-scoped)
    // ──────────────────────────────────────────────────────────────────────────
    if (evaluationId) {
      const { data: evalRow, error: evalErr } = await (dbClient.from('gap_evaluations') as any)
        .select(`
          id,
          organization_id,
          policy_id,
          benchmark_document_version_id,
          analysis_name,
          regulation_ids,
          policy_ids,
          scope,
          status,
          overall_compliance_percentage,
          critical_gaps_count,
          partially_met_count,
          adequately_met_count,
          action_plan,
          audit_logs,
          comments,
          created_by_name,
          created_at,
          metadata
        `)
        .eq('id', evaluationId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (evalErr) {
        logger.error({ error: evalErr.message, evaluationId }, 'Database error fetching gap evaluation');
        return NextResponse.json({ success: false, error: evalErr.message }, { status: 500 });
      }

      if (!evalRow) {
        return NextResponse.json(
          { success: false, error: 'Gap analysis not found' },
          { status: 404 }
        );
      }

      const { data: dbItems, error: itemsErr } = await (dbClient.from('gap_matrix_items') as any)
        .select('*')
        .eq('evaluation_id', evaluationId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (itemsErr) {
        logger.error({ error: itemsErr.message, evaluationId }, 'Database error fetching gap matrix items');
        return NextResponse.json({ success: false, error: itemsErr.message }, { status: 500 });
      }

      const regIds = Array.isArray(evalRow.regulation_ids) ? evalRow.regulation_ids : [];
      let regTitle = 'Statutory Regulatory Framework';
      let regShort = 'Regulations';
      let regulatorCode: RegulatorCode = 'CBN';

      if (regIds.length > 0) {
        const { data: regs } = await (dbClient.from('regulatory_instruments') as any)
          .select('id, title, short_name, regulatory_bodies(code)')
          .in('id', regIds);
        if (regs && regs.length > 0) {
          regTitle = regs.map((r: any) => r.title).join(', ');
          regShort = regs.map((r: any) => r.short_name || r.title).join(', ');
          regulatorCode = (regs[0].regulatory_bodies?.code || 'CBN') as RegulatorCode;
        }
      }

      const polIds = Array.isArray(evalRow.policy_ids) ? evalRow.policy_ids : [];
      let policyTitle = 'Internal Policy Manual';
      let policyDept = 'COMPLIANCE_LEGAL';
      let policyVersion = '1.0';

      if (polIds.length > 0) {
        const { data: pols } = await (dbClient.from('policy_documents') as any)
          .select('id, title, department, version_tag')
          .eq('organization_id', organizationId)
          .in('id', polIds);
        if (pols && pols.length > 0) {
          policyTitle = pols.map((p: any) => p.title).join(', ');
          policyDept = pols[0].department || 'COMPLIANCE_LEGAL';
          policyVersion = pols[0].version_tag || '1.0';
        }
      }

      const items = (dbItems || []).map((it: any) => ({
        id: it.id,
        evaluationId: it.evaluation_id,
        regulatoryClauseId: it.regulatory_clause_id,
        obligationId: it.obligation_id || null,
        obligationTitle: it.obligation_title || it.obligation_code || 'Statutory Compliance Directive',
        obligationCode: it.obligation_code || 'OBL',
        obligationDescription: it.obligation_description || it.what_has_changed || it.what_happened,
        regulatoryClauseReference: it.obligation_title || it.obligation_code || 'Statutory Compliance Directive',
        ruleType: it.rule_type || 'Prescriptive',
        policyApplicability: it.policy_applicability || 'Policy Applicable',
        statutoryLegalCitation: it.regulation_title || regShort,
        complianceStatus: it.compliance_status as ComplianceStatus,
        statutoryPenaltyNaira: Number(it.statutory_penalty_naira) || 0,
        matchedPolicySection: (() => {
          const firstMet = (it.criteria_evaluations || []).find(
            (c: any) => c.status === 'MET' && c.matchedPolicySections?.length > 0
          );
          return firstMet?.matchedPolicySections?.[0]?.sectionTitle || null;
        })(),
        matchedPolicyText: (() => {
          const firstMet = (it.criteria_evaluations || []).find(
            (c: any) => c.status === 'MET' && c.matchedPolicySections?.length > 0
          );
          return firstMet?.matchedPolicySections?.[0]?.verbatimPolicyExcerpt || null;
        })(),
        suggestedStatus: it.compliance_status as ComplianceStatus,
        whatHappened: it.what_happened,
        whatToKnow: it.what_to_know,
        whatHasChanged: it.what_has_changed,
        whatToDo: it.what_to_do,
        draftReplacementLanguage: it.draft_remediation_clause || it.draft_replacement_language,
        draftReplacementPolicyLanguage: it.draft_remediation_clause || it.draft_replacement_language,
        criteriaEvaluations: it.criteria_evaluations || [],
        actionItems: it.action_items || [],
        suggestedActionItem: it.suggested_action_item,
        regulationTitle: it.regulation_title || regTitle,
        sourceSectionRef: it.source_section_ref || 'Not explicitly specified in source text',
        responsibleRole: it.responsible_role || 'Chief Compliance Officer',
        statutoryRemediationTimelineDays:
          typeof it.remediation_timeline_days === 'number' ? it.remediation_timeline_days : undefined,
        seniorCounselBriefing: it.senior_counsel_briefing || (it.metadata as any)?.seniorCounselBriefing || null,
      }));

      const totalPenalty = items.reduce(
        (sum: number, item: any) => sum + (Number(item.statutoryPenaltyNaira) || 0),
        0
      );
      const adequateCount =
        evalRow.adequately_met_count ?? items.filter((i: any) => i.complianceStatus === 'ADEQUATELY_MET').length;
      const partialCount =
        evalRow.partially_met_count ?? items.filter((i: any) => i.complianceStatus === 'PARTIALLY_MET').length;
      const gapCount =
        evalRow.critical_gaps_count ?? items.filter((i: any) => i.complianceStatus === 'CRITICAL_GAP').length;

      const evaluationSummary = {
        id: evalRow.id,
        analysisName:
          evalRow.analysis_name ||
          (evalRow.metadata as any)?.analysisName ||
          `${regShort} vs ${policyTitle}`,
        regulationTitle: regTitle,
        regulationShortName: regShort,
        regulatorCode,
        benchmarkDocumentVersionId: evalRow.benchmark_document_version_id,
        policyId: evalRow.policy_id,
        policyTitle,
        department: policyDept,
        versionTag: policyVersion,
        regulationIds: regIds,
        policyIds: polIds,
        scope: evalRow.scope || (evalRow.metadata as any)?.scope || 'COMPLETE_REGULATORY_REVIEW',
        status: evalRow.status || 'IN_PROGRESS',
        overallCompliancePercentage: Number(evalRow.overall_compliance_percentage) || 0,
        obligationsAssessedCount: items.length,
        reviewPendingCount: partialCount + gapCount,
        closedCount: adequateCount,
        adequateCount,
        partialCount,
        gapCount,
        totalPenaltyNaira: totalPenalty,
        actionPlan: evalRow.action_plan || [],
        auditLogs: evalRow.audit_logs || [],
        comments: evalRow.comments || [],
        executiveBriefing: (evalRow.metadata as any)?.executiveBriefing || (evalRow as any).executive_briefing || null,
        createdByName: evalRow.created_by_name || 'Authorized Compliance Officer',
        createdAt: evalRow.created_at,
        lastModifiedAt: evalRow.created_at,
      };

      return NextResponse.json({
        success: true,
        data: {
          evaluation: evaluationSummary,
          summary: evaluationSummary,
          items,
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Full List of Real Gap Analyses for this Tenant
    // ──────────────────────────────────────────────────────────────────────────
    const { data: evalRows, error: rowsErr } = await (dbClient.from('gap_evaluations') as any)
      .select(`
        id,
        benchmark_document_version_id,
        policy_id,
        analysis_name,
        regulation_ids,
        policy_ids,
        scope,
        status,
        overall_compliance_percentage,
        critical_gaps_count,
        partially_met_count,
        adequately_met_count,
        action_plan,
        audit_logs,
        comments,
        created_by_name,
        created_at,
        metadata
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (rowsErr) {
      logger.error({ error: rowsErr.message }, 'Failed retrieving gap evaluations from DB');
      return NextResponse.json({ success: false, error: rowsErr.message }, { status: 500 });
    }

    const evalIds = (evalRows || []).map((r: any) => r.id);
    const penaltySumMap = new Map<string, number>();

    if (evalIds.length > 0) {
      const { data: itemPenalties } = await (dbClient.from('gap_matrix_items') as any)
        .select('evaluation_id, statutory_penalty_naira, compliance_status')
        .eq('organization_id', organizationId)
        .in('evaluation_id', evalIds);

      for (const ip of itemPenalties || []) {
        if (ip.compliance_status !== 'ADEQUATELY_MET') {
          const amt = Number(ip.statutory_penalty_naira) || 0;
          if (amt > 0) {
            penaltySumMap.set(ip.evaluation_id, (penaltySumMap.get(ip.evaluation_id) || 0) + amt);
          }
        }
      }
    }

    const allRegIds = new Set<string>();
    const allPolIds = new Set<string>();
    for (const row of evalRows || []) {
      if (Array.isArray(row.regulation_ids)) row.regulation_ids.forEach((id: string) => allRegIds.add(id));
      if (Array.isArray(row.policy_ids)) row.policy_ids.forEach((id: string) => allPolIds.add(id));
      if (row.policy_id) allPolIds.add(row.policy_id);
    }

    const regMap = new Map<string, { title: string; shortName: string; regulatorCode: RegulatorCode }>();
    if (allRegIds.size > 0) {
      const { data: regs } = await (dbClient.from('regulatory_instruments') as any)
        .select('id, title, short_name, regulatory_bodies(code)')
        .in('id', Array.from(allRegIds));
      for (const r of regs || []) {
        regMap.set(r.id, {
          title: r.title,
          shortName: r.short_name || r.title,
          regulatorCode: (r.regulatory_bodies?.code || 'CBN') as RegulatorCode,
        });
      }
    }

    const polMap = new Map<string, { title: string; department: string; versionTag: string }>();
    if (allPolIds.size > 0) {
      const { data: pols } = await (dbClient.from('policy_documents') as any)
        .select('id, title, department, version_tag')
        .eq('organization_id', organizationId)
        .in('id', Array.from(allPolIds));
      for (const p of pols || []) {
        polMap.set(p.id, {
          title: p.title,
          department: p.department || 'COMPLIANCE_LEGAL',
          versionTag: p.version_tag || '1.0',
        });
      }
    }

    const list: GapAnalysisSummaryItem[] = (evalRows || []).map((row: any) => {
      const rowRegIds = Array.isArray(row.regulation_ids) ? row.regulation_ids : [];
      const rowPolIds =
        Array.isArray(row.policy_ids) && row.policy_ids.length > 0
          ? row.policy_ids
          : row.policy_id
          ? [row.policy_id]
          : [];

      const firstReg = rowRegIds[0] ? regMap.get(rowRegIds[0]) : null;
      const firstPol = rowPolIds[0] ? polMap.get(rowPolIds[0]) : null;

      const regShort =
        rowRegIds.length > 1
          ? `${rowRegIds.length} Regulations (${firstReg?.shortName || 'Multiple'})`
          : firstReg?.shortName || 'Regulatory Instrument';

      const policyTitle =
        rowPolIds.length > 1
          ? `${rowPolIds.length} Policies (${firstPol?.title || 'Multiple'})`
          : firstPol?.title || 'Internal Policy';

      const adequate = Number(row.adequately_met_count) || 0;
      const partial = Number(row.partially_met_count) || 0;
      const gap = Number(row.critical_gaps_count) || 0;
      const total = adequate + partial + gap || 1;

      return {
        id: row.id,
        analysisName:
          row.analysis_name || (row.metadata as any)?.analysisName || `${regShort} vs ${policyTitle}`,
        regulationTitle: firstReg?.title || 'Statutory Regulation',
        regulationShortName: regShort,
        regulatorCode: firstReg?.regulatorCode || 'CBN',
        benchmarkDocumentVersionId: row.benchmark_document_version_id || '',
        policyId: rowPolIds[0] || '',
        policyTitle,
        department: firstPol?.department || 'COMPLIANCE_LEGAL',
        versionTag: firstPol?.versionTag || '1.0',
        regulationIds: rowRegIds,
        policyIds: rowPolIds,
        scope: row.scope || (row.metadata as any)?.scope || 'COMPLETE_REGULATORY_REVIEW',
        status: row.status || 'IN_PROGRESS',
        overallCompliancePercentage:
          row.overall_compliance_percentage !== null && row.overall_compliance_percentage !== undefined
            ? Number(row.overall_compliance_percentage)
            : Math.round(((adequate * 100 + partial * 50) / total)),
        obligationsAssessedCount: adequate + partial + gap,
        reviewPendingCount: partial + gap,
        closedCount: adequate,
        adequateCount: adequate,
        partialCount: partial,
        gapCount: gap,
        totalPenaltyNaira: penaltySumMap.get(row.id) || 0,
        actionPlan: row.action_plan || [],
        auditLogs: row.audit_logs || [],
        comments: row.comments || [],
        executiveBriefing: (row.metadata as any)?.executiveBriefing || (row as any).executive_briefing || null,
        createdByName: row.created_by_name || 'Authorized Compliance Officer',
        createdAt: row.created_at,
        lastModifiedAt: row.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed retrieving gap evaluations');
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gap-matrix/evaluations
 * Starts a real multi-regulation vs multi-policy gap analysis
 */
export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, userId, dbClient } = tenantCtx;
    const body = await req.json();

    const {
      analysisName,
      regulationIds,
      policyIds,
      benchmarkDocumentVersionId,
      policyId,
      scope = 'COMPLETE_REGULATORY_REVIEW',
      createdByName,
    } = body;

    let effectiveRegIds: string[] = [];
    if (Array.isArray(regulationIds) && regulationIds.length > 0) {
      effectiveRegIds = regulationIds;
    } else if (benchmarkDocumentVersionId) {
      const { data: ver } = await (dbClient.from('regulatory_document_versions') as any)
        .select('instrument_id')
        .eq('id', benchmarkDocumentVersionId)
        .maybeSingle();
      if (ver?.instrument_id) {
        effectiveRegIds = [ver.instrument_id];
      }
    }

    let effectivePolicyIds: string[] = [];
    if (Array.isArray(policyIds) && policyIds.length > 0) {
      effectivePolicyIds = policyIds;
    } else if (policyId) {
      effectivePolicyIds = [policyId];
    }

    if (effectiveRegIds.length === 0 || effectivePolicyIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one regulation and one internal policy must be selected' },
        { status: 400 }
      );
    }

    const isMulti = effectiveRegIds.length > 1 || effectivePolicyIds.length > 1;
    const entitlement = await verifyEntitlement(dbClient, organizationId, 'GAP_ANALYSIS_RUN', {
      regulationCount: effectiveRegIds.length,
      policyCount: effectivePolicyIds.length,
      isMultiRegOrPolicy: isMulti,
    });
    if (!entitlement.allowed) {
      return NextResponse.json(entitlement.errorPayload, { status: entitlement.statusCode });
    }

    const multiService = new MultiConcordanceService({ dbClient });
    const result = await multiService.runMultiConcordance({
      organizationId,
      userId,
      analysisName: analysisName?.trim() || 'Statutory Gap Concordance Analysis',
      regulationIds: effectiveRegIds,
      policyIds: effectivePolicyIds,
      scope,
      createdByName: createdByName || 'Authorized Compliance Officer',
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed creating gap evaluation');
    return NextResponse.json(
      { success: false, error: err.message || 'Evaluation error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/gap-matrix/evaluations
 * Records human reviewer overrides on criteria verdicts, action items, or analysis-level comments/status
 */
export async function PATCH(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, userId, dbClient } = tenantCtx;
    const body = await req.json();

    const {
      evaluationId,
      itemId,
      criterionId,
      criterionIndex,
      criterionStatus,
      complianceStatus,
      matchedPolicySection,
      matchedPolicyText,
      draftReplacementLanguage,
      newActionItem,
      toggleActionItemId,
      newComment,
      status: evaluationWorkflowStatus,
    } = body;

    // ──────────────────────────────────────────────────────────────────────────
    // A. Analysis-level update (comment, workflow status, or action plan toggle without itemId)
    // ──────────────────────────────────────────────────────────────────────────
    if (!itemId && evaluationId) {
      const { data: currentEval, error: evalFetchErr } = await (dbClient.from('gap_evaluations') as any)
        .select('id, status, action_plan, audit_logs, comments')
        .eq('id', evaluationId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (evalFetchErr || !currentEval) {
        return NextResponse.json({ success: false, error: 'Evaluation not found' }, { status: 404 });
      }

      const currentComments = Array.isArray(currentEval.comments) ? [...currentEval.comments] : [];
      const currentAuditLogs = Array.isArray(currentEval.audit_logs) ? [...currentEval.audit_logs] : [];
      let currentActionPlan = Array.isArray(currentEval.action_plan) ? [...currentEval.action_plan] : [];
      let nextStatus = currentEval.status;

      if (newComment && newComment.content) {
        currentComments.unshift({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          authorName: newComment.authorName || 'Authorized Compliance Officer',
          authorRole: newComment.authorRole || 'Reviewer',
          content: newComment.content,
        });
      }

      if (evaluationWorkflowStatus) {
        nextStatus = evaluationWorkflowStatus;
        currentAuditLogs.unshift({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          action: `Analysis workflow status updated to ${evaluationWorkflowStatus}`,
          performedBy: 'Authorized Compliance Officer',
        });
      }

      if (toggleActionItemId) {
        currentActionPlan = currentActionPlan.map((act: any) =>
          act.id === toggleActionItemId ? { ...act, completed: !act.completed } : act
        );
      }

      const { error: evalUpdErr } = await (dbClient.from('gap_evaluations') as any)
        .update({
          status: nextStatus,
          comments: currentComments,
          audit_logs: currentAuditLogs,
          action_plan: currentActionPlan,
        })
        .eq('id', evaluationId)
        .eq('organization_id', organizationId);

      if (evalUpdErr) {
        logger.error({ error: evalUpdErr.message }, 'Failed updating gap evaluation metadata');
        return NextResponse.json({ success: false, error: evalUpdErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          evaluationId,
          status: nextStatus,
          comments: currentComments,
          auditLogs: currentAuditLogs,
          actionPlan: currentActionPlan,
        },
      });
    }

    if (!itemId) {
      return NextResponse.json({ success: false, error: 'itemId or evaluationId is required' }, { status: 400 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // B. Item-level criterion override, evidence link, or action item update
    // ──────────────────────────────────────────────────────────────────────────
    const { data: item, error: fetchErr } = await (dbClient.from('gap_matrix_items') as any)
      .select('*')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (fetchErr || !item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    const updatedCriteria = Array.isArray(item.criteria_evaluations) ? [...item.criteria_evaluations] : [];
    let updatedActionItems = Array.isArray(item.action_items) ? [...item.action_items] : [];
    let didMutateCriteria = false;

    if (criterionStatus && (criterionId || criterionIndex !== undefined)) {
      const idx = criterionIndex !== undefined ? criterionIndex : updatedCriteria.findIndex((c) => c.id === criterionId);
      if (idx >= 0 && updatedCriteria[idx]) {
        updatedCriteria[idx] = {
          ...updatedCriteria[idx],
          status: criterionStatus,
          humanOverride: true,
        };
        didMutateCriteria = true;
      }
    }

    if (matchedPolicySection && (criterionIndex !== undefined || criterionId)) {
      const idx = criterionIndex !== undefined ? criterionIndex : updatedCriteria.findIndex((c) => c.id === criterionId);
      if (idx >= 0 && updatedCriteria[idx]) {
        const sections = updatedCriteria[idx].matchedPolicySections || [];
        sections.push({
          policyId: item.policy_id || '',
          policyTitle: 'Internal Policy',
          sectionNumber: matchedPolicySection,
          sectionTitle: matchedPolicySection,
          verbatimPolicyExcerpt: matchedPolicyText || 'Evidence verified by compliance reviewer.',
        });
        updatedCriteria[idx] = {
          ...updatedCriteria[idx],
          matchedPolicySections: sections,
          status: 'MET',
          humanOverride: true,
        };
        didMutateCriteria = true;
      }
    }

    const coreCriteria = updatedCriteria.filter((c: any) => c.criterionType === 'Core Criteria');
    const rollupBasis = coreCriteria.length > 0 ? coreCriteria : updatedCriteria;
    const totalCore = rollupBasis.length || 1;
    const metCore = rollupBasis.filter((c: any) => c.status === 'MET').length;

    let derivedObligationStatus: ComplianceStatus = item.compliance_status;
    if (didMutateCriteria && rollupBasis.length > 0) {
      if (metCore === totalCore) {
        derivedObligationStatus = 'ADEQUATELY_MET';
      } else if (metCore > 0) {
        derivedObligationStatus = 'PARTIALLY_MET';
      } else {
        derivedObligationStatus = 'CRITICAL_GAP';
      }
    } else if (complianceStatus) {
      derivedObligationStatus = complianceStatus;
    }

    if (newActionItem) {
      updatedActionItems.push({
        id: crypto.randomUUID(),
        title: newActionItem.title || 'Remediation task',
        policyTitle: newActionItem.policyTitle || 'Internal Policy',
        policyId: newActionItem.policyId,
        assigneeName: newActionItem.assigneeName || 'Authorized Compliance Officer',
        assigneeRole: newActionItem.assigneeRole || 'Chief Compliance Officer',
        linkedObligationCode: item.obligation_code || 'OBL',
        linkedObligationId: item.obligation_id,
        completed: false,
        ...(newActionItem.dueDate ? { dueDate: newActionItem.dueDate } : {}),
      });
    }

    if (toggleActionItemId) {
      updatedActionItems = updatedActionItems.map((act: any) =>
        act.id === toggleActionItemId ? { ...act, completed: !act.completed } : act
      );
    }

    const itemUpdatePayload: any = {
      compliance_status: derivedObligationStatus,
      criteria_evaluations: updatedCriteria,
      action_items: updatedActionItems,
    };
    if (draftReplacementLanguage) {
      itemUpdatePayload.draft_remediation_clause = draftReplacementLanguage;
    }

    const { error: itemUpdErr } = await (dbClient.from('gap_matrix_items') as any)
      .update(itemUpdatePayload)
      .eq('id', itemId)
      .eq('organization_id', organizationId);

    if (itemUpdErr) {
      logger.error({ error: itemUpdErr.message }, 'Failed updating gap_matrix_items row');
      return NextResponse.json({ success: false, error: itemUpdErr.message }, { status: 500 });
    }

    const evalId = evaluationId || item.evaluation_id;
    let currentAuditLogs: any[] = [];
    let currentComments: any[] = [];

    if (evalId) {
      const { data: allItems } = await (dbClient.from('gap_matrix_items') as any)
        .select('compliance_status, action_items')
        .eq('evaluation_id', evalId)
        .eq('organization_id', organizationId);

      if (allItems && allItems.length > 0) {
        const adequate = allItems.filter((i: any) => i.compliance_status === 'ADEQUATELY_MET').length;
        const partial = allItems.filter((i: any) => i.compliance_status === 'PARTIALLY_MET').length;
        const gap = allItems.filter((i: any) => i.compliance_status === 'CRITICAL_GAP').length;
        const total = allItems.length;
        const pct = Math.round(((adequate * 100 + partial * 50) / total));

        const allActions: any[] = [];
        for (const it of allItems) {
          if (Array.isArray(it.action_items)) {
            allActions.push(...it.action_items);
          }
        }

        const auditEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          action: criterionStatus
            ? `Criterion override on ${item.obligation_code || 'obligation'}: marked ${criterionStatus} (${metCore}/${totalCore} Core fulfilled -> ${derivedObligationStatus})`
            : newActionItem
            ? `Added remediation action item on ${item.obligation_code || 'obligation'}: "${newActionItem.title}"`
            : `Updated obligation ${item.obligation_code || 'obligation'} status to ${derivedObligationStatus}`,
          performedBy: 'Authorized Compliance Officer',
          details: {
            itemId,
            obligationCode: item.obligation_code,
            criterionStatus: criterionStatus || null,
            derivedObligationStatus,
            coreCriteriaFulfilled: `${metCore}/${totalCore}`,
          },
        };

        const { data: currentEval } = await (dbClient.from('gap_evaluations') as any)
          .select('audit_logs, comments')
          .eq('id', evalId)
          .eq('organization_id', organizationId)
          .maybeSingle();

        currentAuditLogs = Array.isArray(currentEval?.audit_logs) ? [...currentEval.audit_logs] : [];
        currentAuditLogs.unshift(auditEntry);

        currentComments = Array.isArray(currentEval?.comments) ? [...currentEval.comments] : [];
        if (newComment && newComment.content) {
          currentComments.unshift({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            authorName: newComment.authorName || 'Authorized Compliance Officer',
            authorRole: newComment.authorRole || 'Reviewer',
            content: newComment.content,
            itemId,
          });
        }

        await (dbClient.from('gap_evaluations') as any)
          .update({
            adequately_met_count: adequate,
            partially_met_count: partial,
            critical_gaps_count: gap,
            overall_compliance_percentage: pct,
            action_plan: allActions,
            audit_logs: currentAuditLogs,
            comments: currentComments,
            status: adequate === total ? 'COMPLETED' : 'IN_PROGRESS',
          })
          .eq('id', evalId)
          .eq('organization_id', organizationId);
      }
    }

    // Record tamper-evident entry in global audit_logs table
    await (dbClient.from('audit_logs') as any).insert({
      organization_id: organizationId,
      user_id: userId || null,
      action: 'GAP_CRITERION_OVERRIDE',
      entity_type: 'gap_matrix_items',
      entity_id: itemId,
      sha256_input_hash: AuditService.computeSha256({
        evaluationId: evalId,
        itemId,
        criterionIndex,
        criterionStatus,
        previousStatus: item.compliance_status,
      }),
      sha256_output_hash: AuditService.computeSha256({
        itemId,
        derivedObligationStatus,
        coreCriteriaFulfilled: `${metCore}/${totalCore}`,
      }),
      metadata: {
        evaluationId: evalId,
        obligationCode: item.obligation_code,
        criterionStatus: criterionStatus || null,
        derivedObligationStatus,
        coreCriteriaFulfilled: `${metCore}/${totalCore}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Criterion override and evidence updated successfully',
      data: {
        itemId,
        complianceStatus: derivedObligationStatus,
        criteriaEvaluations: updatedCriteria,
        actionItems: updatedActionItems,
        coreCriteriaFulfilled: `${metCore}/${totalCore}`,
        auditLogs: currentAuditLogs,
        comments: currentComments,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed updating criterion evaluation');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/gap-matrix/evaluations?id=<id>
 * Deletes a tenant-owned gap analysis evaluation and its child matrix items.
 */
export async function DELETE(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;
    const { searchParams } = new URL(req.url);
    const evaluationId = searchParams.get('id');

    if (!evaluationId) {
      return NextResponse.json({ success: false, error: 'Missing evaluation id' }, { status: 400 });
    }

    if (!dbClient) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { data: existing } = await (dbClient.from('gap_evaluations') as any)
      .select('id')
      .eq('id', evaluationId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Evaluation not found' }, { status: 404 });
    }

    await (dbClient.from('gap_matrix_items') as any)
      .delete()
      .eq('evaluation_id', evaluationId)
      .eq('organization_id', organizationId);

    const { error: delErr } = await (dbClient.from('gap_evaluations') as any)
      .delete()
      .eq('id', evaluationId)
      .eq('organization_id', organizationId);

    if (delErr) {
      logger.error({ error: delErr.message }, 'Failed deleting gap evaluation record');
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Gap evaluation deleted successfully',
      deletedId: evaluationId,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed deleting gap evaluation');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
