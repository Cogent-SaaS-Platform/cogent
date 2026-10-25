'use client';

import React, { useState } from 'react';
import { Clock, Calendar as CalendarIcon, ChevronRight, ExternalLink } from 'lucide-react';
import { UrgentComplianceGate } from '../types';

export interface UpcomingDeadlinesTimelineProps {
  gates?: UrgentComplianceGate[];
  onInspectGate?: (gate: UrgentComplianceGate) => void;
}

export function UpcomingDeadlinesTimeline({
  gates = [],
  onInspectGate,
}: UpcomingDeadlinesTimelineProps) {
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);

  // Default Nigerian financial statutory milestones if gates array is small or empty
  const defaultMilestones: UrgentComplianceGate[] = [
    {
      id: 'gate_arcon',
      title: 'ARCON Easter Micro-Credit Ad Campaign Pre-Clearance',
      regulatorCode: 'ARCON',
      sourcePillar: 'marketing',
      deadlineDate: '12 May',
      daysRemaining: 7,
      priority: 'HIGH',
      actionRequired: 'Submit ASP Form 01 with verified compliant APR and fee disclosures to ARCON Secretariat.',
      linkContext: { targetPillar: 'marketing', action: 'open_dossier' },
    },
    {
      id: 'gate_nfiu',
      title: 'NFIU Suspicious Transaction Reporting Window (72h Gate)',
      regulatorCode: 'NFIU',
      sourcePillar: 'gap-matrix',
      deadlineDate: '20 May',
      daysRemaining: 15,
      priority: 'CRITICAL_EMERGENCY',
      actionRequired: 'Board Risk Committee approval of Section 4.1 wording amendment on AML/CFT STR SLA.',
      linkContext: { targetPillar: 'gap-matrix', action: 'open_drawer' },
    },
    {
      id: 'gate_cbn_2fa',
      title: 'CBN Biometric 2FA Protocol on Interbank Transfers > ₦1M',
      regulatorCode: 'CBN',
      sourcePillar: 'radar',
      deadlineDate: '9 Jun',
      daysRemaining: 35,
      priority: 'HIGH',
      actionRequired: 'Engineering deployment of biometric token validation on interbank settlement rails.',
      linkContext: { targetPillar: 'radar', action: 'open_drawer' },
    },
    {
      id: 'gate_ndpc',
      title: 'NDPA 2023 Statutory Data Protection Compliance Audit',
      regulatorCode: 'NDPC',
      sourcePillar: 'radar',
      deadlineDate: '30 Jun',
      daysRemaining: 56,
      priority: 'MEDIUM',
      actionRequired: 'Filing of annual data controller audit report with Nigeria Data Protection Commission.',
      linkContext: { targetPillar: 'radar', action: 'open_drawer' },
    },
    {
      id: 'gate_sec',
      title: 'SEC Rules on Digital Sub-Brokers & VASP Capital Adequacy',
      regulatorCode: 'SEC',
      sourcePillar: 'gap-matrix',
      deadlineDate: '15 Jul',
      daysRemaining: 71,
      priority: 'MEDIUM',
      actionRequired: 'Capital buffer recalculation and CCO sign-off for digital asset brokerage operations.',
      linkContext: { targetPillar: 'gap-matrix', action: 'open_drawer' },
    },
    {
      id: 'gate_fccpc',
      title: 'FCCPC Digital Lending Consumer Interest Rate Transparency',
      regulatorCode: 'FCCPC',
      sourcePillar: 'marketing',
      deadlineDate: '28 Jul',
      daysRemaining: 84,
      priority: 'LOW',
      actionRequired: 'Verification of APR calculators and borrower complaint escalation protocols.',
      linkContext: { targetPillar: 'marketing', action: 'open_dossier' },
    },
  ];

  const milestones = gates.length >= 3 ? gates : defaultMilestones;
  const activeGate = milestones.find((m) => m.id === selectedGateId);

  // Calculate percentage positions across May - Aug timeline
  const getPositionPercent = (index: number, total: number) => {
    // Distribute nicely along timeline width: 14% to 92%
    if (total <= 1) return 50;
    return Math.round(14 + (index / (total - 1)) * 78);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      {/* 1. Header with Calendar link */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Upcoming Deadlines
        </h2>
        <a
          href="/insight"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span>Calendar</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 2. Horizontal Timeline Track Container */}
      <div className="relative pt-8 pb-10 px-2 overflow-x-auto min-w-[620px]">
        {/* Urgent Shaded Zone (e.g. from 0% to 38% representing immediate 30-day window) */}
        <div
          className="absolute top-2 bottom-8 left-4 w-[36%] bg-rose-50/70 border-r border-rose-200/80 rounded-l-md pointer-events-none"
          title="Imminent Enforcement Window (<30 days)"
        />

        {/* Month Axis Labels at bottom */}
        <div className="absolute bottom-1 left-4 right-4 flex justify-between text-[11px] font-semibold text-slate-400 select-none">
          <span className="w-16 text-left">May</span>
          <span className="w-16 text-center">Jun</span>
          <span className="w-16 text-center">Jul</span>
          <span className="w-16 text-right">Aug</span>
        </div>

        {/* Continuous Horizontal Axis Line */}
        <div className="relative h-0.5 bg-slate-200 w-full my-6">
          {/* Today Marker */}
          <div className="absolute -top-7 left-4 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Today
            </span>
            <div className="w-px h-8 bg-rose-400 border-l border-dashed border-rose-500" />
            <div className="w-2 h-2 rounded-full bg-rose-500 -mt-1 ring-2 ring-white" />
          </div>

          {/* Milestone Nodes */}
          {milestones.map((milestone, idx) => {
            const leftPercent = getPositionPercent(idx, milestones.length);
            const isImminent = (milestone.daysRemaining ?? 30) <= 20;
            const isSelected = selectedGateId === milestone.id;

            return (
              <div
                key={milestone.id}
                style={{ left: `${leftPercent}%` }}
                className="absolute -top-12 -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                onClick={() => setSelectedGateId(isSelected ? null : milestone.id)}
              >
                {/* Date Label */}
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap group-hover:text-slate-900 transition-colors">
                  {milestone.deadlineDate || `${milestone.daysRemaining}d`}
                </span>

                {/* Regulator / Statute Badge */}
                <span className="text-[10px] font-medium text-slate-500 truncate max-w-[95px] text-center mb-1 group-hover:text-slate-900 transition-colors">
                  {milestone.regulatorCode} {milestone.title.split(' ')[0]}
                </span>

                {/* Vertical Stem down to timeline */}
                <div
                  className={`w-px h-6 transition-colors ${
                    isImminent
                      ? 'bg-rose-400 group-hover:bg-rose-600'
                      : 'bg-slate-300 group-hover:bg-slate-500'
                  }`}
                />

                {/* Axis Node Pin Dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full ring-2 ring-white transition-all transform group-hover:scale-125 ${
                    isImminent ? 'bg-rose-500' : 'bg-slate-700'
                  } ${isSelected ? 'ring-4 ring-slate-900 scale-125' : ''}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Detail Popover / Inspection Bar when a milestone is clicked */}
      {activeGate && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                {activeGate.regulatorCode}
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {activeGate.title}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                Due: {activeGate.deadlineDate} ({activeGate.daysRemaining}d remaining)
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {activeGate.actionRequired}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onInspectGate?.(activeGate)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 font-medium text-xs shadow-xs transition-colors"
          >
            <span>Inspect in {activeGate.sourcePillar === 'radar' ? 'Insight' : activeGate.sourcePillar === 'gap-matrix' ? 'Gap' : 'Marketing'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
