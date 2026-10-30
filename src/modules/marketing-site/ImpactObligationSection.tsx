'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, FileSpreadsheet, Clock, CheckCircle2, ArrowRight, ShieldCheck, Terminal, DollarSign, Cpu } from 'lucide-react';

interface MenuFeature {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const menuItems: MenuFeature[] = [
  {
    id: 'exco-synthesis',
    title: '4-Way ExCo impact synthesis',
    desc: 'Automated generation of distinct departmental action briefs for CCO, COO, CTO, and CFO within 15 minutes of gazetting.',
    icon: <Users className="w-4 h-4 text-slate-700" />,
  },
  {
    id: 'span-extraction',
    title: 'Character-span obligation extraction',
    desc: 'Decomposing 50+ page regulatory PDFs into atomic, discrete statutory clauses with explicit character-span anchors.',
    icon: <FileSpreadsheet className="w-4 h-4 text-slate-700" />,
  },
  {
    id: 'team-ownership',
    title: 'Cross-functional ownership assignment',
    desc: 'Mapping statutory mandates to specific internal business units, product lines, and operational owners.',
    icon: <CheckCircle2 className="w-4 h-4 text-slate-700" />,
  },
  {
    id: 'countdown-clocks',
    title: 'Statutory countdown timers',
    desc: 'Real-time countdown tracking against mandatory enforcement deadlines to avoid BOFIA daily penalty formulas.',
    icon: <Clock className="w-4 h-4 text-slate-700" />,
  },
];

interface ExCoRoleBrief {
  role: string;
  title: string;
  directive: string;
  deadline: string;
  status: string;
  statusColor: string;
  icon: React.ReactNode;
}

const briefs: ExCoRoleBrief[] = [
  {
    role: 'Chief Compliance Officer',
    title: 'Policy Concordance Update',
    directive: 'Amend Section 4.1 of internal AML manual with beneficial ownership registry definitions above 5% equity.',
    deadline: '14 Days to Sanction',
    status: 'Action Required',
    statusColor: 'bg-rose-500',
    icon: <ShieldCheck className="w-4 h-4 text-slate-800" />,
  },
  {
    role: 'Chief Operating Officer',
    title: 'Customer Onboarding SOPs',
    directive: 'Adjust branch teller and digital verification flows to capture Tier-3 residential proof prior to account upgrade.',
    deadline: '21 Days to Sanction',
    status: 'In Review',
    statusColor: 'bg-amber-500',
    icon: <Users className="w-4 h-4 text-slate-800" />,
  },
  {
    role: 'Chief Technology Officer',
    title: 'Telemetry & Webhook Logging',
    directive: 'Deploy automated webhook telemetry logging for all electronic transactions flagged by NFIU watchlist engine.',
    deadline: '7 Days to Sanction',
    status: 'Sprint Queued',
    statusColor: 'bg-[#2A4BFF]',
    icon: <Cpu className="w-4 h-4 text-slate-800" />,
  },
  {
    role: 'Chief Financial Officer',
    title: 'Capital Adequacy & Buffer',
    directive: 'Verify statutory capital allocation buffers for potential cross-border liquidity reserve requirements under Section 12.',
    deadline: '30 Days to Sanction',
    status: 'Capital Reserved',
    statusColor: 'bg-emerald-500',
    icon: <DollarSign className="w-4 h-4 text-slate-800" />,
  },
];

export function ImpactObligationSection() {
  const [selectedItem, setSelectedItem] = useState('exco-synthesis');
  const [activeRole, setActiveRole] = useState(0);

  return (
    <section className="py-20 md:py-28 bg-white border-t border-dotted border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Balanced 2-Column Split: 40% Left Column, 60% Right Column (Matching design style) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* LEFT COLUMN: ~40% width */}
          <div className="lg:col-span-5 space-y-6">
            {/* Subtle Eyebrow */}
            <div className="inline-flex items-center gap-1.5 text-xs text-[#2A4BFF] font-semibold tracking-wide">
              <span>✦</span>
              <span>Operational Departmental Synthesis</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Impact &amp; obligation mapping
            </h2>

            {/* Paragraph */}
            <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
              Assess regulatory impact and convert updates into structured obligations linked to policies, 
              teams, and products. Cogent automatically synthesizes tailored directives for CCO, COO, CTO, 
              and CFO before morning standups.
            </p>

            {/* Vertical Menu Stack with fine dotted dividers */}
            <div className="pt-2 space-y-0">
              {menuItems.map((item) => {
                const isActive = item.id === selectedItem;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item.id)}
                    className="w-full text-left py-4 border-b border-dotted border-slate-200 transition-colors group flex items-start gap-3.5"
                  >
                    <div className="mt-0.5 p-1 rounded group-hover:bg-slate-100 transition-colors">
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <div
                        className={`text-sm font-bold tracking-tight transition-colors ${
                          isActive ? 'text-slate-900 font-extrabold' : 'text-slate-700 group-hover:text-slate-900'
                        }`}
                      >
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Primary Link */}
            <div className="pt-4">
              <Link
                href="/how-it-works#exco-alignment"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-900 shadow-2xs transition-colors"
              >
                <span>Explore impact mapping</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: ~60% width - ExCo Synthesis Canvas */}
          <div className="lg:col-span-7 bg-[#F9F9FB] border border-slate-200/90 rounded-2xl p-6 sm:p-8 relative overflow-hidden min-h-[500px]">
            {/* Subtle technical diagonal mesh pattern background */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, #E5E7EB 0, #E5E7EB 1px, transparent 0, transparent 16px)`,
              }}
            />

            {/* Content Area */}
            <div className="relative z-10 space-y-6">
              {/* Ingested Circular Banner */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500 uppercase">
                      CBN/BSD/DIR/2026/04
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[10px] font-mono text-emerald-600 font-semibold">
                      GAZETTED
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    Consolidated Anti-Money Laundering &amp; CFT Directive
                  </h4>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 text-white font-mono text-[10px] font-bold tracking-wider shrink-0 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>4 EXCO BRIEFS READY</span>
                </div>
              </div>

              {/* 2x2 Grid of Role-Specific Directives (Matching visual fidelity) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {briefs.map((brief, idx) => {
                  const isSelected = activeRole === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveRole(idx)}
                      className={`bg-white border rounded-xl p-4 shadow-sm space-y-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 ring-1 ring-slate-900'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                            {brief.icon}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                              {brief.role}
                            </span>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">
                              {brief.title}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`w-2 h-2 rounded-full ${brief.statusColor} shadow-2xs`}
                        />
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                        {brief.directive}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500">{brief.deadline}</span>
                        <span className="font-semibold text-slate-900">{brief.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Telemetry Verification Bar */}
              <div className="p-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-600 font-mono">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>100% Traceable to Gazetted Circular Text</span>
                </span>
                <span className="text-slate-400">BOFIA 2020 § 65 COMPLIANT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
