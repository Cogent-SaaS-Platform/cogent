'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  ShieldCheck,
  Code2,
  Coins,
  Copy,
  Check,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Server,
  Scale,
} from 'lucide-react';

export interface RoleBriefViewerProps {
  executiveBriefCco?: string;
  actionBriefCoo?: string;
  technicalBriefProductEng?: string;
  financialBriefCfo?: string;
  technicalBriefCto?: string;
  governanceBriefCeoCro?: string;
  circularNumber: string;
}

type RoleTab = 'cco' | 'cfo' | 'cto' | 'ceo_cro';

export function RoleBriefViewer({
  executiveBriefCco,
  actionBriefCoo,
  technicalBriefProductEng,
  financialBriefCfo,
  technicalBriefCto,
  governanceBriefCeoCro,
  circularNumber,
}: RoleBriefViewerProps) {
  const [activeTab, setActiveTab] = useState<RoleTab>('cco');
  const [copiedRole, setCopiedRole] = useState<RoleTab | null>(null);

  const getBriefContent = (tab: RoleTab): string => {
    switch (tab) {
      case 'cco':
        return (
          executiveBriefCco ||
          'Statutory obligations, regulatory filing timelines, and mandatory sanctions for default under Nigerian financial regulations.'
        );
      case 'cfo':
        return (
          financialBriefCfo ||
          'Reserve capital ratios, minimum liquidity buffers, interchange fee caps, and institutional balance sheet exposure.'
        );
      case 'cto':
        return (
          technicalBriefCto ||
          technicalBriefProductEng ||
          'System architecture, API specifications, authentication limit modifications (2FA thresholds), KYC schema changes, and audit trail retention.'
        );
      case 'ceo_cro':
        return (
          governanceBriefCeoCro ||
          actionBriefCoo ||
          'Enterprise governance, Board Risk Committee reporting, systemic risk containment, operational continuity, and settlement cut-off windows.'
        );
    }
  };

  const handleCopy = (tab: RoleTab) => {
    const text = getBriefContent(tab);
    navigator.clipboard.writeText(text);
    setCopiedRole(tab);
    setTimeout(() => setCopiedRole(null), 2000);
  };

  const tabs: Array<{
    id: RoleTab;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
    badgeBg: string;
  }> = [
    {
      id: 'cco',
      label: 'CCO / Legal',
      sublabel: 'Statutory Mandates & Fines',
      icon: <ShieldCheck className="h-4 w-4" />,
      color: 'text-rose-400',
      badgeBg: 'bg-rose-950/40 border-rose-800/60',
    },
    {
      id: 'cfo',
      label: 'CFO / Finance',
      sublabel: 'Capital Reserves & Levies',
      icon: <Coins className="h-4 w-4" />,
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/40 border-emerald-800/60',
    },
    {
      id: 'cto',
      label: 'CTO / Engineering',
      sublabel: 'APIs, 2FA & Architecture',
      icon: <Server className="h-4 w-4" />,
      color: 'text-cyan-400',
      badgeBg: 'bg-cyan-950/40 border-cyan-800/60',
    },
    {
      id: 'ceo_cro',
      label: 'CEO / CRO',
      sublabel: 'Governance & Systemic Risk',
      icon: <Briefcase className="h-4 w-4" />,
      color: 'text-amber-400',
      badgeBg: 'bg-amber-950/40 border-amber-800/60',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0B111E]/90 p-5 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              4-Way Multi-Role ExCo Synthesis
            </h3>
            <p className="text-[11px] text-slate-400">
              Role-tailored statutory intelligence synthesized for Circular {circularNumber}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleCopy(activeTab)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
        >
          {copiedRole === activeTab ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-300">Copied to Clipboard</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span>Copy Executive Brief</span>
            </>
          )}
        </button>
      </div>

      {/* Role Navigation Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? `${tab.badgeBg} border-cyan-500/60 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/30`
                  : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={isActive ? tab.color : 'text-slate-500'}>
                  {tab.icon}
                </span>
                <span
                  className={`text-xs font-bold ${
                    isActive ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 line-clamp-1">
                {tab.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              {tabs.find((t) => t.id === activeTab)?.label} Operational Directive
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            REF: {circularNumber}
          </span>
        </div>

        <div className="prose prose-invert prose-xs max-w-none text-slate-300 text-xs leading-relaxed space-y-2 whitespace-pre-line">
          {getBriefContent(activeTab)}
        </div>
      </div>
    </div>
  );
}
