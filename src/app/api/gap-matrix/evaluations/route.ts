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
  createdByName: string;
  createdAt: string;
  lastModifiedAt: string;
}

/**
 * GET /api/gap-matrix/evaluations
 * Returns real evaluations for the authenticated tenant (Zero fake seeds).
 */
export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { organizationId, dbClient } = tenantCtx;
    const { searchParams } = new URL(req.url);
    const evaluationId = searchParams.get('id');

    if (!dbClient) {
      return NextResponse.json({ success: true, data: evaluationId ? null : [] });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Single Evaluation Detail by ID
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
        .maybeSingle();

      if (evalErr || !evalRow) {
        return NextResponse.json(
          { success: false, error: 'Gap analysis not found' },
          { status: 404 }
        );
      }

      // Fetch items for this evaluation
      const { data: dbItems } = await (dbClient.from('gap_matrix_items') as any)
        .select('*')
        .eq('evaluation_id', evaluationId)
        .order('created_at', { ascending: true });

      // Fetch regulation titles for display
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

      // Fetch policy titles for display
      const polIds = Array.isArray(evalRow.policy_ids) ? evalRow.policy_ids : [];
      let policyTitle = 'Internal Policy Manual';
      let policyDept = 'COMPLIANCE_LEGAL';
      let policyVersion = '1.0';

      if (polIds.length > 0) {
        const { data: pols } = await (dbClient.from('policy_documents') as any)
          .select('id, title, department, version_tag')
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
        obligationCode: it.obligation_code || 'OBL-CBN-001',
        obligationDescription: it.obligation_description || it.what_has_changed || it.what_happened,
        regulatoryClauseReference: it.obligation_title || it.obligation_code || 'Statutory Compliance Directive',
        ruleType: it.rule_type || 'Prescriptive',
        policyApplicability: it.policy_applicability || 'Policy Applicable',
        statutoryLegalCitation: it.regulation_title || regShort,
        complianceStatus: it.compliance_status as ComplianceStatus,
        statutoryPenaltyNaira: Number(it.statutory_penalty_naira) || 0,
        matchedPolicySection: (() => {
          const firstMet = (it.criteria_evaluations || []).find((c: any) => c.status === 'MET' && c.matchedPolicySections?.length > 0);
          return firstMet?.matchedPolicySections?.[0]?.sectionTitle || null;
        })(),
        matchedPolicyText: (() => {
          const firstMet = (it.criteria_evaluations || []).find((c: any) => c.status === 'MET' && c.matchedPolicySections?.length > 0);
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
        sourceSectionRef: it.source_section_ref || 'Section 1.0',
        responsibleRole: it.responsible_role || 'Chief Compliance Officer',
        statutoryRemediationTimelineDays: it.remediation_timeline_days || 14,
      }));

      const totalPenalty = items.reduce((sum: number, item: any) => sum + (Number(item.statutoryPenaltyNaira) || 0), 0);
      const adequateCount = evalRow.adequately_met_count ?? items.filter((i: any) => i.complianceStatus === 'ADEQUATELY_MET').length;
      const partialCount = evalRow.partially_met_count ?? items.filter((i: any) => i.complianceStatus === 'PARTIALLY_MET').length;
      const gapCount = evalRow.critical_gaps_count ?? items.filter((i: any) => i.complianceStatus === 'CRITICAL_GAP').length;

      return NextResponse.json({
        success: true,
        data: {
          evaluation: {
            id: evalRow.id,
            analysisName: evalRow.analysis_name || (evalRow.metadata as any)?.analysisName || `${regShort} vs ${policyTitle}`,
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
            createdByName: evalRow.created_by_name || 'Authorized Compliance Officer',
            createdAt: evalRow.created_at,
            lastModifiedAt: evalRow.created_at,
          },
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
        created_by_name,
        created_at,
        metadata
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (rowsErr) {
      logger.error({ error: rowsErr.message }, 'Failed retrieving gap evaluations from DB');
      return NextResponse.json({ success: true, data: [] });
    }

    // Collect all regulation and policy IDs to resolve titles in bulk
    const allRegIds = new Set<string>();
    const allPolIds = new Set<string>();
    for (const row of evalRows || []) {
      if (Array.isArray(row.regulation_ids)) row.regulation_ids.forEach((id: string) => allRegIds.add(id));
      if (Array.isArray(row.policy_ids)) row.policy_ids.forEach((id: string) => allPolIds.add(id));
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
      const rowPolIds = Array.isArray(row.policy_ids) ? row.policy_ids : [];

      const firstReg = rowRegIds[0] ? regMap.get(rowRegIds[0]) : null;
      const firstPol = rowPolIds[0] ? polMap.get(rowPolIds[0]) : null;

      const regShort = rowRegIds.length > 1
        ? `${rowRegIds.length} Regulations (${firstReg?.shortName || 'Multiple'})`
        : (firstReg?.shortName || 'Regulatory Instrument');

      const policyTitle = rowPolIds.length > 1
        ? `${rowPolIds.length} Policies (${firstPol?.title || 'Multiple'})`
        : (firstPol?.title || 'Internal Policy');

      const adequate = Number(row.adequately_met_count) || 0;
      const partial = Number(row.partially_met_count) || 0;
      const gap = Number(row.critical_gaps_count) || 0;
      const total = adequate + partial + gap || 1;

      return {
        id: row.id,
        analysisName: row.analysis_name || (row.metadata as any)?.analysisName || `${regShort} vs ${policyTitle}`,
        regulationTitle: firstReg?.title || 'Statutory Regulation',
        regulationShortName: regShort,
        regulatorCode: firstReg?.regulatorCode || 'CBN',
        benchmarkDocumentVersionId: '',
        policyId: rowPolIds[0] || '',
        policyTitle,
        department: firstPol?.department || 'COMPLIANCE_LEGAL',
        versionTag: firstPol?.versionTag || '1.0',
        regulationIds: rowRegIds,
        policyIds: rowPolIds,
        scope: row.scope || (row.metadata as any)?.scope || 'COMPLETE_REGULATORY_REVIEW',
        status: row.status || 'IN_PROGRESS',
        overallCompliancePercentage: Number(row.overall_compliance_percentage) || Math.round(((adequate * 100 + partial * 50) / total)),
        obligationsAssessedCount: total,
        reviewPendingCount: partial + gap,
        closedCount: adequate,
        adequateCount: adequate,
        partialCount: partial,
        gapCount: gap,
        totalPenaltyNaira: gap * 10000000 + partial * 5000000,
        actionPlan: row.action_plan || [],
        auditLogs: [],
        comments: [],
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

    // Support both multi-select array inputs and legacy single inputs
    let effectiveRegIds: string[] = [];
    if (Array.isArray(regulationIds) && regulationIds.length > 0) {
      effectiveRegIds = regulationIds;
    } else if (benchmarkDocumentVersionId) {
      // Find instrument id for this version
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

    // Enforce Gap Analysis quota and multi-regulation/policy entitlement (Pro or Enterprise)
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
      analysisName: analysisName?.trim() || 'Comprehensive Statutory Gap Analysis',
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
 * Records human reviewer overrides on criteria verdicts or action items
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
      reviewerNotes,
      matchedPolicySection,
      matchedPolicyText,
      draftReplacementLanguage,
      newActionItem,
      newComment,
    } = body;

    if (!itemId) {
      return NextResponse.json({ success: false, error: 'itemId is required' }, { status: 400 });
    }

    // 1. Fetch current item
    const { data: item, error: fetchErr } = await (dbClient.from('gap_matrix_items') as any)
      .select('*')
      .eq('id', itemId)
      .maybeSingle();

    if (fetchErr || !item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    let updatedCriteria = Array.isArray(item.criteria_evaluations) ? [...item.criteria_evaluations] : [];
    let updatedActionItems = Array.isArray(item.action_items) ? [...item.action_items] : [];

    // Handle Criterion Status Toggle (Human Override)
    if (criterionStatus && (criterionId || criterionIndex !== undefined)) {
      const idx = criterionIndex !== undefined ? criterionIndex : updatedCriteria.findIndex((c) => c.id === criterionId);
      if (idx >= 0 && updatedCriteria[idx]) {
        updatedCriteria[idx] = {
          ...updatedCriteria[idx],
          status: criterionStatus,
          humanOverride: true,
        };
      }
    }

    // Handle adding linked policy evidence to criterion
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
      }
    }

    // Recalculate Obligation Compliance Status from Criteria
    let derivedObligationStatus: ComplianceStatus = complianceStatus || item.compliance_status;
    const coreCriteria = updatedCriteria.filter((c: any) => c.criterionType === 'Core Criteria');
    const totalCore = coreCriteria.length || 1;
    const metCore = coreCriteria.filter((c: any) => c.status === 'MET').length;

    if (metCore === totalCore) {
      derivedObligationStatus = 'ADEQUATELY_MET';
    } else if (metCore > 0) {
      derivedObligationStatus = 'PARTIALLY_MET';
    } else {
      derivedObligationStatus = 'CRITICAL_GAP';
    }

    // Handle adding a new action item
    if (newActionItem) {
      updatedActionItems.push({
        id: crypto.randomUUID(),
        title: newActionItem.title || 'Remediation task',
        policyTitle: newActionItem.policyTitle || 'Internal Policy',
        policyId: newActionItem.policyId,
        assigneeName: newActionItem.assigneeName || 'Compliance Officer',
        assigneeRole: newActionItem.assigneeRole || 'Chief Compliance Officer',
        linkedObligationCode: item.obligation_code || 'OBL',
        linkedObligationId: item.obligation_id,
        completed: false,
        dueDate: newActionItem.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      });
    }

    // Update item in DB
    const itemUpdatePayload: any = {
      compliance_status: derivedObligationStatus,
      criteria_evaluations: updatedCriteria,
      action_items: updatedActionItems,
    };
    if (draftReplacementLanguage) {
      itemUpdatePayload.draft_remediation_clause = draftReplacementLanguage;
    }

    await (dbClient.from('gap_matrix_items') as any).update(itemUpdatePayload).eq('id', itemId);

    // Recalculate parent evaluation counts
    const evalId = evaluationId || item.evaluation_id;
    if (evalId) {
      const { data: allItems } = await (dbClient.from('gap_matrix_items') as any)
        .select('compliance_status, action_items')
        .eq('evaluation_id', evalId);

      if (allItems && allItems.length > 0) {
        const adequate = allItems.filter((i: any) => i.compliance_status === 'ADEQUATELY_MET').length;
        const partial = allItems.filter((i: any) => i.compliance_status === 'PARTIALLY_MET').length;
        const gap = allItems.filter((i: any) => i.compliance_status === 'CRITICAL_GAP').length;
        const total = allItems.length;
        const pct = Math.round(((adequate * 100 + partial * 50) / total));

        // Compile combined action plan
        const allActions: any[] = [];
        for (const it of allItems) {
          if (Array.isArray(it.action_items)) {
            allActions.push(...it.action_items);
          }
        }

        const auditEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          action: `Criterion status override on ${item.obligation_code || 'obligation'}: now ${criterionStatus || derivedObligationStatus}`,
          performedBy: 'Compliance Reviewer',
          details: {
            itemId,
            obligationCode: item.obligation_code,
            criterionStatus,
            derivedObligationStatus,
            coreCriteriaFulfilled: `${metCore}/${totalCore}`,
          },
        };

        const { data: currentEval } = await (dbClient.from('gap_evaluations') as any)
          .select('audit_logs, comments')
          .eq('id', evalId)
          .maybeSingle();

        const currentAuditLogs = Array.isArray(currentEval?.audit_logs) ? currentEval.audit_logs : [];
        currentAuditLogs.unshift(auditEntry);

        let currentComments = Array.isArray(currentEval?.comments) ? currentEval.comments : [];
        if (newComment && newComment.content) {
          currentComments.unshift({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            authorName: newComment.authorName || 'Compliance Officer',
            authorRole: newComment.authorRole || 'Reviewer',
            content: newComment.content,
          });
        }

        await (dbClient.from('gap_evaluations') as any).update({
          adequately_met_count: adequate,
          partially_met_count: partial,
          critical_gaps_count: gap,
          overall_compliance_percentage: pct,
          action_plan: allActions,
          audit_logs: currentAuditLogs,
          comments: currentComments,
          status: adequate === total ? 'COMPLETED' : 'IN_PROGRESS',
        }).eq('id', evalId);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Criterion override and evidence updated successfully',
      data: {
        itemId,
        complianceStatus: derivedObligationStatus,
        criteriaEvaluations: updatedCriteria,
        actionItems: updatedActionItems,
        coreCriteriaFulfilled: `${metCore}/${totalCore}`,
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
 * Deletes a gap analysis evaluation and all its child matrix items.
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

    // 1. Delete child matrix items
    await (dbClient.from('gap_matrix_items') as any).delete().eq('evaluation_id', evaluationId);

    // 2. Delete parent evaluation
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

