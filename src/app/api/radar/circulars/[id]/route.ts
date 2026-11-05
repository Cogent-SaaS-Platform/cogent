import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { RegulatorCode, LicenseType, PaymentRail, LineageStatus } from '@/shared/types';
import { defaultCountdownCalculator } from '@/modules/radar/services/deadlineCountdownCalculator';
import { ApplicabilityEngine } from '@/modules/radar/services/applicabilityEngine';
import { CircularTargetingContext } from '@/modules/radar/types';
import { computeInitials } from '@/modules/organization/services/teamService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: circularId } = await params;
    if (!circularId) {
      return NextResponse.json({ success: false, error: 'Circular ID is required' }, { status: 400 });
    }

    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { dbClient, organizationId } = tenantCtx;

    const { data: c, error: circularError } = await (dbClient as any)
      .from('radar_circulars')
      .select('*, regulatory_document_versions(id, canonical_source_url, source_file_url, publication_date, effective_date)')
      .eq('id', circularId)
      .maybeSingle();

    if (circularError || !c) {
      return NextResponse.json({ success: false, error: `Circular not found for ID: ${circularId}` }, { status: 404 });
    }

    // Tenant profile
    const applicabilityEngine = new ApplicabilityEngine({ dbClient });
    const profile = await applicabilityEngine.fetchTenantProfile(organizationId);

    let regulatorCode: RegulatorCode = 'CBN';
    const refPrefix = (c.circular_number || '').split('/')[0]?.toUpperCase();
    if (['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC'].includes(refPrefix)) {
      regulatorCode = refPrefix as RegulatorCode;
    }

    const circularTargeting: CircularTargetingContext = {
      regulator: regulatorCode,
      targetedLicenses: (c.targeted_license_types || []) as LicenseType[],
      affectedRails: (c.affected_payment_rails || []) as PaymentRail[],
      appliesUniversally: c.applies_universally || false,
    };

    const countdown = defaultCountdownCalculator.calculateCountdown({
      statutoryDeadline: c.statutory_deadline,
      publicationDate: c.issuance_date || c.created_at,
      regulator: regulatorCode,
    });

    const pubDate = c.issuance_date || c.created_at?.slice(0, 10) || '2025-01-15';
    const effDate = c.effective_date || c.issuance_date || c.created_at?.slice(0, 10) || pubDate;

    // Fetch tenant impact
    const { data: existingImpact } = await dbClient
      .from('radar_tenant_impacts')
      .select('*, radar_action_items(*)')
      .eq('organization_id', organizationId)
      .eq('circular_id', circularId)
      .maybeSingle();

    let resolvedAssignee: { id: string; name: string; avatar?: string } | null = null;
    if (c.assigned_to) {
      resolvedAssignee = {
        id: c.assigned_to,
        name: c.assigned_to,
        avatar: computeInitials(c.assigned_to),
      };
    } else if (existingImpact?.assigned_role) {
      resolvedAssignee = {
        id: existingImpact.assigned_role,
        name: existingImpact.assigned_role,
        avatar: computeInitials(existingImpact.assigned_role),
      };
    }

    const isLegacyMadLibText = (text?: string | null): boolean => {
      if (!text || typeof text !== 'string') return true;
      const lower = text.toLowerCase();
      return (
        lower.includes('on official notice') ||
        lower.includes('enacted circular directive') ||
        lower.includes('the directive mandates comprehensive operational compliance regarding') ||
        lower.includes('failure to conform to the statutory mandates set out in this circular exposes') ||
        lower.includes('the central bank of nigeria has enacted circular') ||
        lower.includes('has enacted circular') ||
        lower.includes('issued circular directive') ||
        lower.includes('supervisory intelligence briefing establishes') ||
        lower.includes('default statutory enforcement penalties apply') ||
        lower.includes('statutory baseline under') ||
        lower.includes('mandatory compliance must be validated with immediate effect')
      );
    };

    const docType = c.doc_type || 'Circular / Directive';
    const alertType = c.alert_type || (c.priority === 'CRITICAL_EMERGENCY' || c.priority === 'HIGH' || Boolean(c.statutory_deadline) ? 'Actionable' : 'Informative');
    const isInformative = alertType === 'Informative';
    const matrixBriefs = (c.severity_matrix as any)?.departmentalBriefs || {};

    const resolveBrief = (impactBrief?: string | null, matrixKey?: string, defaultInformativeText?: string) => {
      if (impactBrief && impactBrief.length > 30 && !isLegacyMadLibText(impactBrief)) {
        return impactBrief;
      }
      if (matrixKey && matrixBriefs[matrixKey] && matrixBriefs[matrixKey].length > 20 && !isLegacyMadLibText(matrixBriefs[matrixKey])) {
        return matrixBriefs[matrixKey];
      }
      if (isInformative) {
        return defaultInformativeText || 'Informative Alert — No mandatory departmental supervisory actions triggered.';
      }
      return undefined;
    };

    const executiveBriefCco = resolveBrief(
      existingImpact?.executive_brief_cco,
      'chiefCompliance',
      'Informative Alert — No mandatory departmental supervisory actions triggered.'
    );

    const actionBriefCoo = resolveBrief(
      existingImpact?.action_brief_coo,
      'operations',
      'Informative Alert — No mandatory operational workflow changes required.'
    );

    const technicalBriefProductEng = resolveBrief(
      existingImpact?.technical_brief_product_eng,
      'technicalCto',
      'Informative Alert — No technical or payload schema modifications required.'
    );

    const technicalBriefCto =
      resolveBrief((existingImpact as any)?.brief_cto?.summary, 'technicalCto') || technicalBriefProductEng;

    const financialBriefCfo = resolveBrief(
      existingImpact?.financial_brief_cfo,
      'financialCfo',
      'Informative Alert — Zero balance sheet or liquidity reserve impact.'
    );

    const governanceBriefCeoCro = resolveBrief(
      (existingImpact as any)?.brief_ceo_cro?.summary,
      'governanceCeoCro',
      'Informative Alert — Routine supervisory intelligence noted for governance files.'
    );

    const generalCounselBrief = resolveBrief(
      (existingImpact as any)?.role_briefs?.generalCounsel || (existingImpact as any)?.brief_legal?.summary,
      'generalCounsel',
      'Informative Alert — No formal statutory penalty or licensing risk.'
    );

    const actionItems = existingImpact?.radar_action_items || [];

    const docVersions = c.regulatory_document_versions;
    const firstDocVersion = Array.isArray(docVersions) ? docVersions[0] : docVersions;
    const sourceUrl =
      firstDocVersion?.canonical_source_url ||
      c.canonical_source_url ||
      firstDocVersion?.source_file_url ||
      c.source_file_url ||
      '';

    const severityTier = c.severity_tier || 'G1';
    const severityScore = typeof c.severity_score === 'number' ? c.severity_score : (c.priority === 'CRITICAL_EMERGENCY' ? 88 : 18);

    const presentation = {
      id: c.id,
      circularNumber: c.circular_number,
      regulator: regulatorCode,
      subject: c.subject,
      summary: c.summary,
      executiveSummary: c.executive_summary || c.summary || 'Authentic synthesis pending analysis by Horizon Engine.',
      keyPoints: Array.isArray(c.key_points) ? c.key_points : [],
      departments: Array.isArray(c.impacted_departments) ? c.impacted_departments : [],
      docType,
      alertType,
      isStarred: Boolean(c.is_starred),
      isRelevant: c.is_relevant !== false,
      severityTier,
      severityScore,
      severityMatrixCode: `${severityTier} | ${severityScore}%`,
      severityMatrix: c.severity_matrix || null,
      importantDates: Array.isArray(c.important_dates) && c.important_dates.length > 0 ? c.important_dates : [
        { id: `dt-pub-${c.id}`, label: 'Publication Date', date: pubDate, description: 'Official notice gazetted by regulatory authority' },
        { id: `dt-eff-${c.id}`, label: 'Effective Date', date: effDate, description: 'Statutory provisions become operative across financial system' },
      ],
      otherDates: Array.isArray(c.other_dates) ? c.other_dates : [],
      comments: Array.isArray(c.comments) ? c.comments : [],
      auditLogs: Array.isArray(c.audit_logs) ? c.audit_logs : [],
      workflowStatus: c.workflow_status || 'Pending Review',
      assignee: resolvedAssignee,
      topics: Array.isArray(c.topics) && c.topics.length > 0 ? c.topics : [regulatorCode, 'Regulatory Directive'],
      impactedAreas: Array.isArray(c.impacted_areas) ? c.impacted_areas : [],
      publicationDate: pubDate,
      effectiveDate: effDate,
      statutoryDeadline: c.statutory_deadline,
      daysRemaining: countdown.daysRemaining,
      businessDaysRemaining: countdown.businessDaysRemaining,
      countdownTier: countdown.tier,
      urgencyWindow: countdown.urgencyWindow,
      priority: c.priority,
      enforcementRiskLevel: c.enforcement_risk_level,
      lineageStatus: (c.lineage_status || 'ACTIVE_LAW') as LineageStatus,
      targetedLicenses: c.targeted_license_types || [],
      affectedRails: c.affected_payment_rails || [],
      appliesUniversally: c.applies_universally || false,
      executiveBriefCco,
      actionBriefCoo,
      technicalBriefProductEng,
      technicalBriefCto,
      financialBriefCfo,
      governanceBriefCeoCro,
      generalCounselBrief,
      actionItems,
      sourceFileUrl: sourceUrl || undefined,
      rawText: c.raw_text || undefined,
    };

    return NextResponse.json({ success: true, circular: presentation });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed fetching circular detail');
    return NextResponse.json({ success: false, error: err.message || 'Internal failure' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: circularId } = await params;
    if (!circularId) {
      return NextResponse.json({ success: false, error: 'Circular ID is required' }, { status: 400 });
    }

    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const { dbClient, organizationId } = tenantCtx;
    const userEmail = (tenantCtx as any).userEmail || 'Compliance Officer';
    const body = await req.json();

    const allowedFields = [
      'is_relevant',
      'is_starred',
      'workflow_status',
      'assigned_to',
      'doc_type',
      'alert_type',
      'important_dates',
      'other_dates',
    ];

    const updates: Record<string, any> = {};
    for (const f of allowedFields) {
      if (f in body) {
        updates[f] = body[f];
      }
    }

    // Support camelCase aliases
    if ('isRelevant' in body) updates.is_relevant = body.isRelevant;
    if ('isStarred' in body) updates.is_starred = body.isStarred;
    if ('workflowStatus' in body) updates.workflow_status = body.workflowStatus;
    if ('assignee' in body) updates.assigned_to = typeof body.assignee === 'string' ? body.assignee : body.assignee?.name || null;
    if ('docType' in body) updates.doc_type = body.docType;
    if ('alertType' in body) updates.alert_type = body.alertType;
    if ('importantDates' in body) updates.important_dates = body.importantDates;
    if ('otherDates' in body) updates.other_dates = body.otherDates;

    // Fetch existing circular to append audit log
    const { data: existing } = await (dbClient as any)
      .from('radar_circulars')
      .select('audit_logs')
      .eq('id', circularId)
      .maybeSingle();

    const existingLogs = Array.isArray(existing?.audit_logs) ? existing.audit_logs : [];
    const changeEntries: string[] = [];

    if ('is_relevant' in updates) changeEntries.push(`Marked as ${updates.is_relevant ? 'Relevant' : 'Not Relevant'}`);
    if ('is_starred' in updates) changeEntries.push(`${updates.is_starred ? 'Starred' : 'Unstarred'} alert`);
    if ('workflow_status' in updates) changeEntries.push(`Status changed to ${updates.workflow_status}`);
    if ('assigned_to' in updates) changeEntries.push(`Assigned to ${updates.assigned_to || 'Unassigned'}`);
    if ('doc_type' in updates) changeEntries.push(`Document taxonomy reclassified to ${updates.doc_type}`);
    if ('alert_type' in updates) changeEntries.push(`Alert actionability set to ${updates.alert_type}`);
    if ('important_dates' in updates) changeEntries.push('Updated statutory compliance dates');

    const newLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' WAT',
      action: changeEntries.join(', ') || 'Updated Alert Properties',
      author: userEmail || 'Compliance Officer',
    };

    updates.audit_logs = [newLog, ...existingLogs];

    const { data: updated, error } = await (dbClient as any)
      .from('radar_circulars')
      .update(updates)
      .eq('id', circularId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, circular: updated });
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed updating radar circular');
    return NextResponse.json({ success: false, error: err.message || 'Internal failure' }, { status: 500 });
  }
}
