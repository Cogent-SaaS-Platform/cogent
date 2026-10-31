'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileText,
  Scale,
} from 'lucide-react';

export interface RoleBriefViewerProps {
  generalCounselBrief?: string;
  executiveBriefCco?: string;
  actionBriefCoo?: string;
  technicalBriefProductEng?: string;
  financialBriefCfo?: string;
  technicalBriefCto?: string;
  governanceBriefCeoCro?: string;
  circularNumber: string;
}

type RoleTab = 'legal' | 'cco' | 'coo' | 'cto' | 'cfo' | 'ceo_cro';

export function RoleBriefViewer({
  generalCounselBrief,
  executiveBriefCco,
  actionBriefCoo,
  technicalBriefProductEng,
  financialBriefCfo,
  technicalBriefCto,
  governanceBriefCeoCro,
  circularNumber,
}: RoleBriefViewerProps) {
  const [activeTab, setActiveTab] = useState<RoleTab>('legal');
  const [copiedRole, setCopiedRole] = useState<RoleTab | null>(null);

  const getBriefContent = (tab: RoleTab): string => {
    switch (tab) {
      case 'legal':
        return (
          generalCounselBrief ||
          'Statutory baseline analysis, enabling legislation citations, supervisory enforcement powers, and legal liability shielding.'
        );
      case 'cco':
        return (
          executiveBriefCco ||
          'Statutory obligations, regulatory filing timelines, and mandatory sanctions for default under Nigerian financial regulations.'
        );
      case 'coo':
        return (
          actionBriefCoo ||
          'Operational rail execution, terminal configurations, settlement cut-off windows, and clearing dispute workflows.'
        );
      case 'cto':
        return (
          technicalBriefCto ||
          technicalBriefProductEng ||
          'System architecture, API specifications, authentication limit modifications (2FA thresholds), and immutable audit trail retention.'
        );
      case 'cfo':
        return (
          financialBriefCfo ||
          'Reserve capital ratios, minimum liquidity buffers, interchange fee caps, and institutional balance sheet exposure.'
        );
      case 'ceo_cro':
        return (
          governanceBriefCeoCro ||
          'Enterprise governance, Board Risk Committee reporting, systemic risk containment, and executive remediation sign-off.'
        );
    }
  };

  const handleCopy = (tab: RoleTab) => {
    const text = getBriefContent(tab);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRole(tab);
      setTimeout(() => setCopiedRole(null), 2000);
    }
  };

  const tabs: Array<{
    id: RoleTab;
    label: string;
    sublabel: string;
  }> = [
    {
      id: 'legal',
      label: 'General Counsel',
      sublabel: 'Statutory Authority & Precedents',
    },
    {
      id: 'cco',
      label: 'Chief Compliance',
      sublabel: 'Mandates & Reporting Windows',
    },
    {
      id: 'coo',
      label: 'Operations & Rail',
      sublabel: 'Settlement & Partner Clearing',
    },
    {
      id: 'cto',
      label: 'Technology & Eng',
      sublabel: 'APIs, 2FA & Audit Trails',
    },
    {
      id: 'cfo',
      label: 'Treasury & CFO',
      sublabel: 'Capital Reserves & Margins',
    },
    {
      id: 'ceo_cro',
      label: 'Board & CRO',
      sublabel: 'Enterprise Risk & Governance',
    },
  ];

  const activeTabMeta = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-700">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Departmental Supervisory Briefs
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic rule evaluation and statutory concordance across executive leadership
            </p>
          </div>
        </div>

        <button
          onClick={() => handleCopy(activeTab)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 rounded shadow-xs transition-colors self-start sm:self-auto"
          title="Copy active supervisory brief"
        >
          {copiedRole === activeTab ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              <span>Copy Brief</span>
            </>
          )}
        </button>
      </div>

      {/* Segmented Role Tabs (6 roles) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col justify-between space-y-1 ${
                isActive
                  ? 'border-slate-900 bg-white ring-1 ring-slate-900 shadow-2xs'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block truncate">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0" />
                )}
              </div>
              <span className="text-[11px] text-slate-500 block truncate">
                {tab.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Brief Content Card */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-800">
              {activeTabMeta.label} Supervisory Memo
            </span>
          </div>
          <span className="font-mono text-xs text-slate-600">
            Citation: {circularNumber}
          </span>
        </div>
        <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line pt-1">
          {getBriefContent(activeTab)}
        </div>
      </div>
    </div>
  );
}
