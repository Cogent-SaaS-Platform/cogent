import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';
import { defaultCountdownCalculator } from '@/modules/radar/services/deadlineCountdownCalculator';
import { ApplicabilityEngine } from '@/modules/radar/services/applicabilityEngine';
import { RegulatorCode, RadarPriority, LicenseType, PaymentRail, LineageStatus } from '@/shared/types';
import { CircularTargetingContext } from '@/modules/radar/types';
import { DeterministicMetadataExtractor } from '@/modules/radar/services/deterministicMetadataExtractor';
import { RoleSynthesisService } from '@/modules/radar/services/roleSynthesisService';
import { computeInitials } from '@/modules/organization/services/teamService';

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const db = tenantCtx.dbClient;
    const organizationId = tenantCtx.organizationId;
    const { searchParams } = new URL(req.url);
    const regulator = searchParams.get('regulator');
    const priority = searchParams.get('priority');
    const applicableOnly = searchParams.get('applicableOnly') === 'true';
    const licenseFilter = searchParams.get('license');
    const relevantOnly = searchParams.get('relevantOnly') === 'true';
    const starredOnly = searchParams.get('starredOnly') === 'true';
    const statusFilter = searchParams.get('status');
    const docTypeFilter = searchParams.get('docType');
    const alertTypeFilter = searchParams.get('alertType');
    const searchQuery = searchParams.get('search')?.toLowerCase().trim();

    // 1. Fetch tenant operating profile (licenses & payment rails)
    const applicabilityEngine = new ApplicabilityEngine({ dbClient: db });
    const profile = await applicabilityEngine.fetchTenantProfile(organizationId);

    // 2. Fetch circular master records sorted by issuance_date desc, falling back to created_at
    let query: any = (db as any)
      .from('radar_circulars')
      .select('*, regulatory_document_versions(canonical_source_url, source_file_url, publication_date, effective_date)')
      .order('issuance_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (priority) {
      query = query.eq('priority', priority as RadarPriority);
    }

    const { data: circularsData, error: circularsError } = await query;

    if (circularsError) {
      logger.warn({ error: circularsError.message }, 'Failed to query radar_circulars; returning empty array');
      return NextResponse.json({ success: true, circulars: [] });
    }

    const rawCirculars: any[] = circularsData || [];
    const circularIds = rawCirculars.map((c) => c.id).filter(Boolean);

    // Fetch real audit logs for these circulars (Zero fabricated audit entries)
    const auditLogsMap = new Map<string, any[]>();
    if (circularIds.length > 0) {
      const { data: realAuditLogs } = await (db as any)
        .from('audit_logs')
        .select('*')
        .in('entity_id', circularIds)
        .order('created_at', { ascending: false });

      if (realAuditLogs) {
        for (const log of realAuditLogs) {
          const list = auditLogsMap.get(log.entity_id) || [];
          list.push({
            id: log.id,
            timestamp: new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 16) + ' WAT',
            action: log.action,
            author: (log.metadata as any)?.author || 'System Service',
          });
          auditLogsMap.set(log.entity_id, list);
        }
      }
    }

    // 3. Fetch existing tenant impacts for this organization
    const { data: impactsData } = await db
      .from('radar_tenant_impacts')
      .select('*, radar_action_items(*)')
      .eq('organization_id', organizationId);

    const impactsMap = new Map<string, any>();
    const assignedUserIds = new Set<string>();

    if (impactsData) {
      for (const impact of impactsData) {
        impactsMap.set(impact.circular_id, impact);
        if (impact.assigned_to_user_id) assignedUserIds.add(impact.assigned_to_user_id);
        if (impact.acknowledged_by) assignedUserIds.add(impact.acknowledged_by);
      }
    }

    const usersMap = new Map<string, any>();
    if (assignedUserIds.size > 0) {
      const { data: usersData } = await (db.from('users') as any)
        .select('id, full_name, email, avatar_url')
        .in('id', Array.from(assignedUserIds));
      if (usersData) {
        for (const u of usersData) {
          usersMap.set(u.id, u);
        }
      }
    }

    // 4. Instantiate RoleSynthesisService for executive-grade briefs
    const roleSynthService = new RoleSynthesisService({ dbClient: db });

    // 5. Enrich each circular with dynamic statutory countdowns and tenant applicability
    const enrichedCirculars = rawCirculars.map((c) => {
      let regulatorCode: RegulatorCode = 'CBN';
      const refPrefix = (c.circular_number || '').split('/')[0]?.toUpperCase();
      if (['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC'].includes(refPrefix)) {
        regulatorCode = refPrefix as RegulatorCode;
      }

      const countdown = defaultCountdownCalculator.calculateCountdown({
        statutoryDeadline: c.statutory_deadline,
        publicationDate: c.issuance_date || c.created_at,
        regulator: regulatorCode,
      });

      const circularTargeting: CircularTargetingContext = {
        regulator: regulatorCode,
        targetedLicenses: (c.targeted_license_types || []) as LicenseType[],
        affectedRails: (c.affected_payment_rails || []) as PaymentRail[],
        appliesUniversally: c.applies_universally || false,
      };

      const existingImpact = impactsMap.get(c.id);

      let isApplicable = false;
      let applicabilityReason = 'Not applicable to current operating licenses or payment rails.';
      let matchedLicenses: LicenseType[] = [];
      let matchedRails: PaymentRail[] = [];

      if (existingImpact) {
        isApplicable = existingImpact.is_applicable;
        applicabilityReason = existingImpact.applicability_reason;
        // Compute matched lists for presentation
        if (profile) {
          matchedLicenses = profile.activeLicenses.filter((lic) =>
            circularTargeting.targetedLicenses.includes(lic)
          );
          matchedRails = profile.activeRails.filter((rail) =>
            circularTargeting.affectedRails.includes(rail)
          );
        }
      } else if (profile) {
        const evalResult = ApplicabilityEngine.evaluatePure(profile, circularTargeting);
        isApplicable = evalResult.isApplicable;
        applicabilityReason = evalResult.reason;
        matchedLicenses = evalResult.matchedLicenses;
        matchedRails = evalResult.matchedRails;
      } else {
        isApplicable = c.applies_universally || false;
        applicabilityReason = c.applies_universally
          ? 'Universal statutory mandate applying to all regulated financial entities in Nigeria.'
          : 'Pending institutional license onboarding configuration.';
      }

      const pubDate = c.issuance_date || c.created_at?.slice(0, 10) || '2025-01-15';
      const effDate = c.effective_date || c.issuance_date || c.created_at?.slice(0, 10) || pubDate;

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

      const actionItems =
        existingImpact?.radar_action_items && existingImpact.radar_action_items.length > 0
          ? existingImpact.radar_action_items.map((act: any) => ({
              id: act.id,
              targetDepartment: act.target_department,
              actionTitle: act.action_title,
              actionDescription: act.action_description,
              suggestedDeadline: act.suggested_deadline,
              isCompleted: act.is_completed,
            }))
          : [];

      const isActionable = c.priority === 'CRITICAL_EMERGENCY' || c.priority === 'HIGH' || Boolean(c.statutory_deadline);
      const severityCode = c.priority === 'CRITICAL_EMERGENCY' ? 'P1' : c.priority === 'HIGH' ? 'P2' : c.priority === 'MEDIUM' ? 'P3' : 'P4';

      const importantDates = [
        { id: `dt-pub-${c.id}`, label: 'Publication Date', date: pubDate, description: 'Official notice gazetted by regulatory authority' },
        { id: `dt-eff-${c.id}`, label: 'Effective Date', date: effDate, description: 'Statutory provisions become operative across financial system' },
        ...(c.statutory_deadline ? [{ id: `dt-dl-${c.id}`, label: 'Compliance Deadline', date: c.statutory_deadline, description: 'Statutory deadline for institutional certification & audit proof' }] : [])
      ];

      const initialAuditLogs = auditLogsMap.get(c.id) || [];

      const topics = Array.from(new Set([
        regulatorCode,
        ...(c.targeted_license_types || []),
        ...(c.affected_payment_rails || []),
        c.applies_universally ? 'Universal Directive' : null,
      ])).filter(Boolean) as string[];

      const docVersions = c.regulatory_document_versions;
      const firstDocVersion = Array.isArray(docVersions) ? docVersions[0] : docVersions;
      const sourceUrl =
        firstDocVersion?.canonical_source_url ||
        (c as any).canonical_source_url ||
        firstDocVersion?.source_file_url ||
        (c as any).source_file_url ||
        '';

      let resolvedAssignee: { id: string; name: string; avatar?: string } | null = null;
      if (existingImpact?.assigned_to_user_id && usersMap.has(existingImpact.assigned_to_user_id)) {
        const u = usersMap.get(existingImpact.assigned_to_user_id);
        resolvedAssignee = {
          id: u.id,
          name: u.full_name,
          avatar: computeInitials(u.full_name),
        };
      } else if (existingImpact?.assigned_role) {
        resolvedAssignee = {
          id: existingImpact.assigned_role,
          name: existingImpact.assigned_role,
          avatar: computeInitials(existingImpact.assigned_role),
        };
      } else if (existingImpact?.acknowledged_by && usersMap.has(existingImpact.acknowledged_by)) {
        const u = usersMap.get(existingImpact.acknowledged_by);
        resolvedAssignee = {
          id: u.id,
          name: u.full_name,
          avatar: computeInitials(u.full_name),
        };
      }

      const resolvedWorkflowStatus =
        (existingImpact?.workflow_status as any) ||
        (existingImpact?.status === 'RESOLVED' ? 'Reviewed' : 'Pending Review');

      const executiveSummary =
        c.executive_summary ||
        (c.summary && c.summary.length > 250 ? c.summary : 'Authentic synthesis pending analysis by Horizon Engine.');
      const keyPoints = Array.isArray(c.key_points) && c.key_points.length > 0 ? c.key_points : [];
      const departments = Array.isArray(c.impacted_departments) && c.impacted_departments.length > 0 ? c.impacted_departments : [];
      const severityTier = c.severity_tier || 'G1';
      const severityScore = typeof c.severity_score === 'number' ? c.severity_score : (c.priority === 'CRITICAL_EMERGENCY' ? 88 : c.priority === 'HIGH' ? 62 : 18);
      const severityMatrixCode = `${severityTier} | ${severityScore}%`;
      const isStarred = Boolean(c.is_starred);
      const isRelevant = c.is_relevant !== false;
      const workflowStatus = c.workflow_status || resolvedWorkflowStatus;
      const comments = Array.isArray(c.comments) ? c.comments : [];
      const otherDates = Array.isArray(c.other_dates) ? c.other_dates : [];
      const topicsList = Array.isArray(c.topics) && c.topics.length > 0 ? c.topics : (topics.length > 0 ? topics : [regulatorCode, 'Regulatory Directive']);
      const impactedAreas = Array.isArray(c.impacted_areas) ? c.impacted_areas : [];
      const importantDatesList = Array.isArray(c.important_dates) && c.important_dates.length > 0 ? c.important_dates : importantDates;
      const auditLogs = Array.isArray(c.audit_logs) && c.audit_logs.length > 0 ? c.audit_logs : initialAuditLogs;

      return {
        id: c.id,
        circularNumber: c.circular_number,
        regulator: regulatorCode,
        subject: c.subject,
        summary: c.summary,
        executiveSummary,
        keyPoints,
        departments,
        docType,
        alertType,
        isStarred,
        isRelevant,
        severityTier,
        severityScore,
        severityMatrixCode,
        severityMatrix: c.severity_matrix || null,
        importantDates: importantDatesList,
        otherDates,
        comments,
        auditLogs,
        workflowStatus,
        assignee: resolvedAssignee,
        topics: topicsList,
        impactedAreas,
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
        penaltyEscalationProjection: countdown.penaltyEscalation,
        applicability: {
          isApplicable,
          reason: applicabilityReason,
          matchedLicenses,
          matchedRails,
        },
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
    });

    // 5. Apply filters
    let filteredCirculars = enrichedCirculars;

    if (relevantOnly) {
      filteredCirculars = filteredCirculars.filter((c) => c.isRelevant !== false);
    }

    if (starredOnly) {
      filteredCirculars = filteredCirculars.filter((c) => Boolean(c.isStarred));
    }

    if (statusFilter && statusFilter !== 'ALL') {
      filteredCirculars = filteredCirculars.filter((c) => c.workflowStatus?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (docTypeFilter && docTypeFilter !== 'ALL') {
      filteredCirculars = filteredCirculars.filter((c) => c.docType?.toLowerCase() === docTypeFilter.toLowerCase());
    }

    if (alertTypeFilter && alertTypeFilter !== 'ALL') {
      filteredCirculars = filteredCirculars.filter((c) => c.alertType?.toLowerCase() === alertTypeFilter.toLowerCase());
    }

    const sourceParam = searchParams.get('source') || regulator;
    if (sourceParam && sourceParam !== 'ALL') {
      const sourceList = sourceParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      if (sourceList.length > 0) {
        filteredCirculars = filteredCirculars.filter((c) => sourceList.includes(c.regulator.toUpperCase()));
      }
    }

    if (applicableOnly) {
      filteredCirculars = filteredCirculars.filter((c) => c.applicability.isApplicable);
    }

    if (licenseFilter && licenseFilter !== 'ALL') {
      filteredCirculars = filteredCirculars.filter(
        (c) => c.targetedLicenses.includes(licenseFilter as LicenseType) || c.appliesUniversally
      );
    }

    if (searchQuery) {
      filteredCirculars = filteredCirculars.filter(
        (c) =>
          c.subject.toLowerCase().includes(searchQuery) ||
          c.circularNumber.toLowerCase().includes(searchQuery) ||
          (c.executiveSummary && c.executiveSummary.toLowerCase().includes(searchQuery)) ||
          c.regulator.toLowerCase().includes(searchQuery)
      );
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSizeParam = searchParams.get('pageSize');
    const pageSize = pageSizeParam ? Math.max(1, parseInt(pageSizeParam, 10)) : 0;
    const total = filteredCirculars.length;
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
    const paginated = pageSize > 0 ? filteredCirculars.slice((page - 1) * pageSize, page * pageSize) : filteredCirculars;

    return NextResponse.json({
      success: true,
      circulars: paginated,
      alerts: paginated,
      pagination: {
        page,
        pageSize: pageSize || total,
        total,
        totalPages,
      },
      tenantProfile: {
        organizationId,
        organizationName: profile?.organizationName || 'Authorized Tenant',
        activeLicenses: profile?.activeLicenses || [],
        activeRails: profile?.activeRails || [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ error: message }, 'Error fetching radar circulars');
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
