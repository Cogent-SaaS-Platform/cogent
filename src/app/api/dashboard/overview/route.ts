import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { RegulatorCode } from '@/shared/types';
import {
  TOPIC_TAXONOMY,
  buildTopicClassificationText,
  classifyTopic,
} from '@/shared/taxonomy/regulatoryTopics';

export const dynamic = 'force-dynamic';

export interface DashboardDeadlineItem {
  id: string;
  sourceId: string;
  sourceModule: 'horizon' | 'library' | 'gap' | 'marketing';
  title: string;
  shortLabel: string;
  regulatorCode: RegulatorCode;
  dueDate: string;
  daysRemaining: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_EMERGENCY';
  summary: string;
  targetUrl: string;
  actionRequired?: string;
}

export interface DashboardTrendingTopicItem {
  topicKey: string;
  name: string;
  count: number;
  max: number;
  delta: string;
  filterUrl: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface DashboardImpactedPolicyItem {
  id: string;
  name: string;
  regulators: string[];
  alertCount: number;
  ownerInitials: string;
  targetUrl: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const queryOrgId = searchParams.get('organizationId');
    const organizationId =
      tenantCtx.isDevFallback && queryOrgId ? queryOrgId : tenantCtx.organizationId;
    const db = createAdminClient();

    // 1. Fetch Real Radar Circulars (Alerts)
    const { data: circularsData, count: totalCircularsCount } = await (
      db.from('radar_circulars') as any
    ).select(
      'id, circular_number, subject, summary, statutory_deadline, issuance_date, created_at, important_dates, other_dates, priority, doc_type, executive_summary, topics, raw_text',
      { count: 'exact' }
    );

    const circulars: any[] = circularsData || [];
    const totalAlertsCount = totalCircularsCount ?? circulars.length;

    // 2. Fetch Real Binding Regulatory Instruments (Global + Tenant Custom)
    const { data: instrumentsData } = await (db.from('regulatory_instruments') as any)
      .select(`
        id,
        title,
        short_name,
        domain,
        is_binding,
        organization_id,
        entry_into_force_date,
        publication_date,
        regulatory_bodies (
          code,
          name
        )
      `)
      .eq('is_binding', true)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`);

    const instruments = instrumentsData || [];

    // 3. Fetch Tenant Gap Evaluations (strictly tenant-scoped)
    const { data: gapEvalsData } = await (db.from('gap_evaluations') as any)
      .select(
        'id, organization_id, analysis_name, policy_ids, critical_gaps_count, partially_met_count, regulation_ids, action_plan, created_at'
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    const gapEvals: any[] = gapEvalsData || [];

    // 4. Fetch Tenant Custom Deadlines (strictly tenant-scoped)
    const { data: customDeadlinesData } = await (db.from('compliance_deadlines') as any)
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_completed', false)
      .order('due_date', { ascending: true });

    const customDeadlines: any[] = customDeadlinesData || [];

    // 5. Compute Real Trending Topics Partition using shared classifyTopic()
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86400000;
    const sixtyDaysAgo = now - 60 * 86400000;
    const ninetyDaysAgo = now - 90 * 86400000;
    const oneEightyDaysAgo = now - 180 * 86400000;

    const topicStats: Record<
      string,
      { count: number; recentCount: number; priorCount: number }
    > = {};
    for (const t of TOPIC_TAXONOMY) {
      topicStats[t.key] = { count: 0, recentCount: 0, priorCount: 0 };
    }

    let current90dCount = 0;
    let previous90dCount = 0;

    circulars.forEach((c) => {
      const classificationText = buildTopicClassificationText(c);
      const bestTopicKey = classifyTopic(classificationText);

      topicStats[bestTopicKey].count++;

      const createdTime = c.issuance_date
        ? new Date(c.issuance_date).getTime()
        : new Date(c.created_at).getTime();

      if (createdTime >= thirtyDaysAgo) {
        topicStats[bestTopicKey].recentCount++;
      } else if (createdTime >= sixtyDaysAgo) {
        topicStats[bestTopicKey].priorCount++;
      }

      if (createdTime >= ninetyDaysAgo) {
        current90dCount++;
      } else if (createdTime >= oneEightyDaysAgo) {
        previous90dCount++;
      }
    });

    let trendPercentage = '→ 0%';
    if (previous90dCount > 0) {
      const pct = Math.round(((current90dCount - previous90dCount) / previous90dCount) * 100);
      trendPercentage = pct > 0 ? `↑${pct}%` : pct < 0 ? `↓${Math.abs(pct)}%` : '→ 0%';
    } else if (current90dCount > 0) {
      trendPercentage = `↑${current90dCount} in 90d`;
    }

    const maxTopicCount = Math.max(
      ...Object.values(topicStats).map((s) => s.count),
      1
    );

    const trendingTopicsList: DashboardTrendingTopicItem[] = TOPIC_TAXONOMY.map((t) => {
      const s = topicStats[t.key];
      const diff = s.recentCount - s.priorCount;
      const delta = diff > 0 ? `↑${diff}` : diff < 0 ? `↓${Math.abs(diff)}` : '→';
      const trend: 'UP' | 'DOWN' | 'STABLE' =
        diff > 0 ? 'UP' : diff < 0 ? 'DOWN' : 'STABLE';

      return {
        topicKey: t.key,
        name: t.name,
        count: s.count,
        max: maxTopicCount,
        delta,
        trend,
        filterUrl: `/insight?topic=${encodeURIComponent(t.key)}`,
      };
    });

    // 6. Compute Real Upcoming Deadlines Timeline across Horizon, Library, Gap Action Items & Custom Deadlines
    const rawDeadlines: DashboardDeadlineItem[] = [];

    const extractRegulator = (refNum?: string, title?: string): RegulatorCode => {
      const prefix = (refNum || '').split('/')[0]?.toUpperCase();
      if (['CBN', 'SEC', 'NDPC', 'FCCPC', 'ARCON', 'NFIU', 'NDIC'].includes(prefix)) {
        return prefix as RegulatorCode;
      }
      const upperTitle = (title || '').toUpperCase();
      if (upperTitle.includes('SEC') || upperTitle.includes('SECURITIES AND EXCHANGE')) return 'SEC';
      if (upperTitle.includes('NDPC') || upperTitle.includes('NDPA')) return 'NDPC';
      if (upperTitle.includes('FCCPC')) return 'FCCPC';
      if (upperTitle.includes('ARCON')) return 'ARCON';
      if (upperTitle.includes('NFIU')) return 'NFIU';
      if (upperTitle.includes('NDIC')) return 'NDIC';
      return 'CBN';
    };

    const generateShortLabel = (
      regCode: RegulatorCode,
      title: string,
      customLabel?: string
    ): string => {
      if (customLabel) {
        const clean = customLabel.replace(new RegExp(`^${regCode}\\s*`, 'i'), '').trim();
        return `${regCode} • ${clean || 'Directive'}`;
      }
      const cleanTitle = title.replace(new RegExp(`^${regCode}\\s*`, 'i'), '').trim();
      const lower = cleanTitle.toLowerCase();

      if (lower.includes('aml') || lower.includes('kyc') || lower.includes('pep') || lower.includes('sanction')) {
        return `${regCode} • AML/CFT`;
      }
      if (lower.includes('cyber') || lower.includes('soc') || lower.includes('security') || lower.includes('csat')) {
        return `${regCode} • Cybersecurity`;
      }
      if (lower.includes('vasp') || lower.includes('virtual asset') || lower.includes('crypto')) {
        return `${regCode} • Virtual Assets`;
      }
      if (lower.includes('contactless') || lower.includes('payment') || lower.includes('rail') || lower.includes('pos')) {
        return `${regCode} • Payments`;
      }
      if (lower.includes('consumer') || lower.includes('credit') || lower.includes('apr') || lower.includes('fair lending')) {
        return `${regCode} • Consumer Protection`;
      }
      if (lower.includes('data') || lower.includes('privacy') || lower.includes('ndpa')) {
        return `${regCode} • Data Privacy`;
      }
      if (lower.includes('robo') || lower.includes('algorithmic')) {
        return `${regCode} • Robo-Advisory`;
      }
      if (lower.includes('prudential') || lower.includes('capital adequacy')) {
        return `${regCode} • Prudential`;
      }

      const words = cleanTitle.split(/\s+/).slice(0, 2).join(' ');
      return `${regCode} • ${words || 'Notice'}`;
    };

    // A. Horizon Scanning deadlines (statutory_deadline + important_dates) -> direct alertId link
    circulars.forEach((c) => {
      const regCode = extractRegulator(c.circular_number, c.subject);

      if (c.statutory_deadline) {
        const dueTime = new Date(c.statutory_deadline).getTime();
        const daysRemaining = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
        rawDeadlines.push({
          id: `circ_${c.id}`,
          sourceId: c.id,
          sourceModule: 'horizon',
          title: c.subject,
          shortLabel: generateShortLabel(regCode, c.subject),
          regulatorCode: regCode,
          dueDate: c.statutory_deadline,
          daysRemaining,
          priority: (c.priority as any) || 'HIGH',
          summary: c.summary || c.subject,
          targetUrl: `/insight?alertId=${c.id}`,
          actionRequired:
            c.executive_summary ||
            `Statutory compliance concordance required before ${c.statutory_deadline}.`,
        });
      }

      if (Array.isArray(c.important_dates)) {
        c.important_dates.forEach((d: any, idx: number) => {
          if (d.date && d.label && d.label !== 'Publication Date') {
            const dueTime = new Date(d.date).getTime();
            if (!isNaN(dueTime)) {
              const daysRemaining = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
              rawDeadlines.push({
                id: `circ_date_${c.id}_${d.id || idx}`,
                sourceId: c.id,
                sourceModule: 'horizon',
                title: `${c.subject} (${d.label})`,
                shortLabel: generateShortLabel(regCode, c.subject, d.label),
                regulatorCode: regCode,
                dueDate: d.date,
                daysRemaining,
                priority: (c.priority as any) || 'MEDIUM',
                summary: d.description || c.summary || c.subject,
                targetUrl: `/insight?alertId=${c.id}`,
                actionRequired: d.description || `Milestone review: ${d.label}.`,
              });
            }
          }
        });
      }
    });

    // B. Regulation Library entry_into_force_date -> direct instrumentId link
    instruments.forEach((inst: any) => {
      const regCode =
        (inst.regulatory_bodies?.code as RegulatorCode) ||
        extractRegulator(undefined, inst.title);
      if (inst.entry_into_force_date) {
        const dueTime = new Date(inst.entry_into_force_date).getTime();
        if (!isNaN(dueTime)) {
          const daysRemaining = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
          rawDeadlines.push({
            id: `inst_${inst.id}`,
            sourceId: inst.id,
            sourceModule: 'library',
            title: inst.title,
            shortLabel: generateShortLabel(regCode, inst.title, inst.short_name),
            regulatorCode: regCode,
            dueDate: inst.entry_into_force_date,
            daysRemaining,
            priority: 'MEDIUM',
            summary: `Statutory instrument entry into force date: ${inst.entry_into_force_date}.`,
            targetUrl: `/library?instrumentId=${inst.id}`,
            actionRequired: `Verify institutional concordance with ${inst.title}.`,
          });
        }
      }
    });

    // C. Gap Analysis Action Plan Items (dueDate) -> direct /gap/[gapAnalysisId] link
    gapEvals.forEach((evalRow: any) => {
      if (Array.isArray(evalRow.action_plan)) {
        evalRow.action_plan.forEach((act: any, idx: number) => {
          if (!act.completed && act.dueDate) {
            const dueTime = new Date(act.dueDate).getTime();
            if (!isNaN(dueTime)) {
              const daysRemaining = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
              const regCode = extractRegulator(act.linkedObligationCode, act.title || evalRow.analysis_name);
              rawDeadlines.push({
                id: `gap_act_${evalRow.id}_${act.id || idx}`,
                sourceId: evalRow.id,
                sourceModule: 'gap',
                title: act.title || `Policy Remediation (${evalRow.analysis_name || 'Gap Analysis'})`,
                shortLabel: generateShortLabel(regCode, act.title || 'Policy Remediation', act.linkedObligationCode),
                regulatorCode: regCode,
                dueDate: String(act.dueDate).slice(0, 10),
                daysRemaining,
                priority: daysRemaining <= 14 ? 'HIGH' : 'MEDIUM',
                summary: `${act.policyTitle ? `${act.policyTitle} — ` : ''}Assigned to ${act.assigneeName || act.assigneeRole || 'Compliance Officer'}.`,
                targetUrl: `/gap/${evalRow.id}`,
                actionRequired: act.title,
              });
            }
          }
        });
      }
    });

    // D. Tenant Custom Deadlines (compliance_deadlines table)
    customDeadlines.forEach((cd: any) => {
      const dueStr = String(cd.due_date).slice(0, 10);
      const dueTime = new Date(dueStr).getTime();
      if (!isNaN(dueTime)) {
        const daysRemaining = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
        const regCode = (cd.regulator_code as RegulatorCode) || 'CBN';
        const mod = (['horizon', 'library', 'gap', 'marketing'].includes(cd.source_module)
          ? cd.source_module
          : 'horizon') as DashboardDeadlineItem['sourceModule'];
        const defaultUrl =
          mod === 'library'
            ? '/library'
            : mod === 'gap'
            ? '/gap'
            : mod === 'marketing'
            ? '/marketing'
            : '/insight';

        rawDeadlines.push({
          id: `custom_${cd.id}`,
          sourceId: cd.source_id || cd.id,
          sourceModule: mod,
          title: cd.title,
          shortLabel: generateShortLabel(regCode, cd.title),
          regulatorCode: regCode,
          dueDate: dueStr,
          daysRemaining,
          priority: (cd.priority as any) || 'HIGH',
          summary: cd.summary || cd.title,
          targetUrl: cd.target_url || defaultUrl,
          actionRequired: cd.summary || cd.title,
        });
      }
    });

    // Deduplicate deadlines by sourceModule + sourceId + dueDate + title
    const seenDeadlineKeys = new Set<string>();
    const dedupedDeadlines = rawDeadlines.filter((d) => {
      const key = `${d.sourceModule}_${d.sourceId}_${d.dueDate}_${d.title}`;
      if (seenDeadlineKeys.has(key)) return false;
      seenDeadlineKeys.add(key);
      return true;
    });

    // Sort chronologically
    dedupedDeadlines.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    const futureDeadlines = dedupedDeadlines.filter((d) => d.daysRemaining >= 0);
    const pastDeadlines = dedupedDeadlines.filter((d) => d.daysRemaining < 0);

    let timelineDeadlines: DashboardDeadlineItem[] = [];
    if (futureDeadlines.length >= 6) {
      timelineDeadlines = futureDeadlines.slice(0, 8);
    } else {
      const recentPast = pastDeadlines.slice(-Math.max(0, 6 - futureDeadlines.length));
      timelineDeadlines = [...recentPast, ...futureDeadlines];
      timelineDeadlines.sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
    }

    // 7. Compute Real Most Impacted Policies Aggregation (strictly tenant-isolated)
    const { data: policiesData } = await db
      .from('policy_documents')
      .select('id, title, department, organization_id, created_at')
      .eq('organization_id', organizationId);

    const policies = policiesData || [];

    // Resolve regulators per instrument for accurate regulator attribution on evaluated policies
    const instRegulatorMap = new Map<string, string>();
    instruments.forEach((inst: any) => {
      if (inst.id && inst.regulatory_bodies?.code) {
        instRegulatorMap.set(inst.id, inst.regulatory_bodies.code);
      }
    });

    let totalImpactedSectionsCount = 0;
    const impactedPoliciesList: DashboardImpactedPolicyItem[] = [];

    policies.forEach((pol) => {
      const matchedEvals = gapEvals.filter(
        (e) =>
          (Array.isArray(e.policy_ids) && e.policy_ids.includes(pol.id)) ||
          e.policy_id === pol.id
      );

      // Use the most recent evaluation for this policy to avoid double-counting historical runs
      const latestPolicyEval = matchedEvals[0] || null;
      const policyGapCount = latestPolicyEval
        ? (Number(latestPolicyEval.critical_gaps_count) || 0) +
          (Number(latestPolicyEval.partially_met_count) || 0)
        : 0;

      totalImpactedSectionsCount += policyGapCount;

      let ownerInitials = 'CCO';
      const dept = (pol.department || '').toUpperCase();
      if (dept.includes('OPS') || dept.includes('OPERAT')) ownerInitials = 'COO';
      else if (dept.includes('FINANCE') || dept.includes('TREASURY')) ownerInitials = 'CFO';
      else if (dept.includes('TECH') || dept.includes('ENG')) ownerInitials = 'CTO';
      else if (dept.includes('LEGAL')) ownerInitials = 'GC';

      const evalRegs = new Set<string>();
      if (latestPolicyEval && Array.isArray(latestPolicyEval.regulation_ids)) {
        latestPolicyEval.regulation_ids.forEach((rid: string) => {
          const code = instRegulatorMap.get(rid);
          if (code) evalRegs.add(code);
        });
      }

      let regulators = Array.from(evalRegs);
      if (regulators.length === 0) {
        const lower = pol.title.toLowerCase();
        if (lower.includes('credit') || lower.includes('consumer') || lower.includes('loan')) {
          regulators = ['CBN', 'FCCPC'];
        } else if (lower.includes('aml') || lower.includes('sanction') || lower.includes('cft')) {
          regulators = ['CBN', 'NFIU'];
        } else if (lower.includes('data') || lower.includes('privacy')) {
          regulators = ['NDPC'];
        } else {
          regulators = ['CBN'];
        }
      }

      const targetUrl = latestPolicyEval ? `/gap/${latestPolicyEval.id}` : '/gap';

      impactedPoliciesList.push({
        id: pol.id,
        name: pol.title,
        regulators,
        alertCount: policyGapCount,
        ownerInitials,
        targetUrl,
      });
    });

    // Rank impacted policies by open Partial + Gap counts descending
    impactedPoliciesList.sort((a, b) => b.alertCount - a.alertCount);

    // 8. Resolve Organization Name
    const { data: orgData } = await db
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .maybeSingle();

    const organizationName = orgData?.name || 'Authorized Tenant';

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        organizationName,
        updatedAt: new Date().toISOString(),
        upcomingDeadlines: timelineDeadlines,
        allUpcomingDeadlines: dedupedDeadlines,
        trendingTopics: {
          totalAlerts90d: totalAlertsCount,
          trendPercentage,
          topics: trendingTopicsList,
        },
        mostImpactedPolicies: {
          totalImpactedSections: totalImpactedSectionsCount,
          policies: impactedPoliciesList,
        },
        liveTelemetry: {
          totalAlerts: totalAlertsCount,
          totalInstruments: instruments.length,
          totalPolicies: policies.length,
          totalEvaluations: gapEvals.length,
        },
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed to compute dashboard overview aggregation');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed fetching dashboard overview' },
      { status: 500 }
    );
  }
}
